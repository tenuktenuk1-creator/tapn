import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOKING] ${step}${detailsStr}`);
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// Server-side validations
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 100 && /^[a-zA-Z\s\-'.]+$/.test(name);
}

function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";

  try {
    logStep("Function started", { clientIp });

    // Check rate limit
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      logStep("Rate limit exceeded", { clientIp });
      return new Response(JSON.stringify({ 
        error: "Too many booking requests. Please wait a few minutes and try again." 
      }), {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "600"
        },
        status: 429,
      });
    }

    // Parse request body
    const body = await req.json();
    const { 
      venue_id, 
      booking_date, 
      start_time, 
      end_time, 
      guest_count, 
      total_price, 
      notes,
      guest_name,
      guest_phone,
      guest_email,
      user_id  // ✅ ADD THIS 
    } = body;
    
    logStep("Booking request received", { venue_id, booking_date, start_time, end_time, total_price, guest_email, clientIp });

    // Validate required fields
    if (!venue_id || !booking_date || !start_time || !end_time || !total_price) {
      throw new Error("Missing required booking fields");
    }

    if (!guest_name || !guest_phone || !guest_email) {
      throw new Error("Guest contact information is required (name, phone, email)");
    }

    // Server-side validation of guest data
    const sanitizedName = sanitizeString(guest_name);
    const sanitizedPhone = sanitizeString(guest_phone);
    const sanitizedEmail = sanitizeString(guest_email).toLowerCase();
    const sanitizedNotes = notes ? sanitizeString(notes).substring(0, 500) : null;

    if (!isValidName(sanitizedName)) {
      throw new Error("Invalid name format. Please use letters, spaces, and basic punctuation only.");
    }

    if (!isValidPhone(sanitizedPhone)) {
      throw new Error("Invalid phone number format.");
    }

    if (!isValidEmail(sanitizedEmail)) {
      throw new Error("Invalid email address format.");
    }

    // Validate venue_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(venue_id)) {
      throw new Error("Invalid venue ID format");
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      throw new Error("Invalid date format");
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      throw new Error("Invalid time format");
    }

    // Validate guest_count
    const parsedGuestCount = parseInt(guest_count) || 1;
    if (parsedGuestCount < 1 || parsedGuestCount > 100) {
      throw new Error("Invalid guest count");
    }

    // Validate total_price is positive
    if (typeof total_price !== "number" || total_price <= 0 || total_price > 1000000) {
      throw new Error("Invalid price");
    }

    logStep("Input validation passed");

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check venue availability
    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("venue_id", venue_id)
      .eq("booking_date", booking_date)
      .in("status", ["confirmed", "pending"])
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

    // Generate a booking lookup token for guest access
    const bookingLookupToken = crypto.randomUUID();

    // Create the booking (pending status - payment collected at venue)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        venue_id,
        user_id: user_id || null, 
        booking_date,
        start_time,
        end_time,
        guest_count: parsedGuestCount,
        total_price: Math.round(total_price * 100), // Store in cents for consistency
        status: "pending",
        payment_status: "pending",
        payment_method: "pay_at_venue",
        notes: sanitizedNotes ? `${sanitizedNotes}\n---\nLookup Token: ${bookingLookupToken}` : `Lookup Token: ${bookingLookupToken}`,
        guest_name: sanitizedName,
        guest_phone: sanitizedPhone,
        guest_email: sanitizedEmail,
      })
      .select()
      .single();

    if (bookingError) {
      logStep("Error creating booking", { error: bookingError.message });
      throw new Error("Failed to create booking. Please try again.");
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
        lookup_token: bookingLookupToken,
      }
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": rateLimit.remaining.toString()
      },
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
