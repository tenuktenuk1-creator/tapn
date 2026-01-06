import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body - NO AUTH REQUIRED (guest checkout)
    const { 
      venue_id, 
      booking_date, 
      start_time, 
      end_time, 
      guest_count, 
      total_price, 
      notes,
      // Guest contact info
      guest_name,
      guest_phone,
      guest_email 
    } = await req.json();
    
    logStep("Booking request received", { venue_id, booking_date, start_time, end_time, total_price, guest_email });

    // Validate required fields
    if (!venue_id || !booking_date || !start_time || !end_time || !total_price) {
      throw new Error("Missing required booking fields");
    }

    // Validate guest contact info
    if (!guest_name || !guest_phone || !guest_email) {
      throw new Error("Guest contact information is required (name, phone, email)");
    }

    // Check venue availability using service role for full access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("venue_id", venue_id)
      .eq("booking_date", booking_date)
      .eq("status", "confirmed")
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`);

    if (checkError) {
      logStep("Error checking availability", { error: checkError.message });
      throw new Error("Failed to check venue availability");
    }

    if (existingBookings && existingBookings.length > 0) {
      logStep("Time slot not available", { existingBookings: existingBookings.length });
      throw new Error("This time slot is no longer available. Please select a different time.");
    }

    logStep("Time slot available");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists in Stripe by email
    const customers = await stripe.customers.list({ email: guest_email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: guest_email,
        name: guest_name,
        phone: guest_phone,
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create PaymentIntent (amount in smallest currency unit - cents)
    const amountInCents = Math.round(total_price);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        venue_id,
        booking_date,
        start_time,
        end_time,
        guest_count: guest_count?.toString() || "1",
        guest_name,
        guest_phone,
        guest_email,
        notes: notes || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      amount: amountInCents,
      clientSecret: paymentIntent.client_secret?.substring(0, 20) + "..."
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
