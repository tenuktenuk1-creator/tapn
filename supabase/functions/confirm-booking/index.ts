import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-BOOKING] ${step}${detailsStr}`);
};

// Server-side validation for payment intent ID
function isValidPaymentIntentId(id: string): boolean {
  return /^pi_[a-zA-Z0-9]{24,}$/.test(id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for logging
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";

  try {
    logStep("Function started", { clientIp });

    // Parse request body - NO AUTH REQUIRED (guest checkout)
    const body = await req.json();
    const { paymentIntentId } = body;
    
    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    // Server-side validation of payment intent ID format
    if (!isValidPaymentIntentId(paymentIntentId)) {
      logStep("Invalid payment intent ID format", { paymentIntentId: paymentIntentId.substring(0, 10), clientIp });
      throw new Error("Invalid payment intent ID format");
    }

    logStep("Confirming payment", { paymentIntentId, clientIp });

    // Initialize Stripe and verify payment
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    logStep("PaymentIntent retrieved", { 
      status: paymentIntent.status,
      amount: paymentIntent.amount 
    });

    // Verify payment succeeded
    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
    }

    // Extract booking data from payment intent metadata
    const { 
      venue_id, 
      booking_date, 
      start_time, 
      end_time, 
      guest_count, 
      notes,
      guest_name,
      guest_phone,
      guest_email,
      booking_lookup_token
    } = paymentIntent.metadata;
    
    logStep("Extracted booking data", { venue_id, booking_date, start_time, end_time, guest_email });

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Double-check availability one more time before creating booking
    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("venue_id", venue_id)
      .eq("booking_date", booking_date)
      .eq("status", "confirmed")
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`);

    if (checkError) {
      logStep("Error checking availability", { error: checkError.message });
      throw new Error("Failed to verify availability");
    }

    if (existingBookings && existingBookings.length > 0) {
      logStep("Slot taken during payment - need refund", { count: existingBookings.length });
      // Refund the payment
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      throw new Error("This time slot was booked while you were paying. Your payment has been refunded.");
    }

    // Create the confirmed booking (guest booking - no user_id needed)
    // Store the booking_lookup_token in notes field (appended) for guest lookup
    const bookingNotes = notes 
      ? `${notes}\n---\nLookup Token: ${booking_lookup_token || 'N/A'}`
      : `Lookup Token: ${booking_lookup_token || 'N/A'}`;

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        venue_id,
        booking_date,
        start_time,
        end_time,
        guest_count: parseInt(guest_count) || 1,
        total_price: paymentIntent.amount,
        status: "confirmed",
        payment_status: "paid",
        payment_method: "stripe",
        stripe_payment_intent_id: paymentIntentId,
        notes: bookingNotes,
        guest_name,
        guest_phone,
        guest_email,
      })
      .select()
      .single();

    if (bookingError) {
      logStep("Error creating booking", { error: bookingError.message });
      // Refund on booking creation failure
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      throw new Error("Failed to create booking. Your payment has been refunded.");
    }

    logStep("Booking created successfully", { bookingId: booking.id, clientIp });

    return new Response(JSON.stringify({ 
      success: true,
      booking: {
        id: booking.id,
        venue_id: booking.venue_id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        // Include lookup token in response for guest to save
        lookup_token: booking_lookup_token,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, clientIp });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});