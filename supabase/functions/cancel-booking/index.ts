import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-BOOKING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Booking ID is required");
    logStep("Cancelling booking", { bookingId });

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error("Booking not found");
    }

    // Verify ownership (users can only cancel their own, admins can cancel any)
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });

    if (booking.user_id !== user.id && !isAdmin) {
      throw new Error("You can only cancel your own bookings");
    }

    if (booking.status === "cancelled") {
      throw new Error("This booking is already cancelled");
    }

    logStep("Booking found", { status: booking.status });

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ 
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      throw new Error("Failed to cancel booking");
    }

    logStep("Booking cancelled successfully", { bookingId });

    return new Response(JSON.stringify({ 
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status
      }
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
