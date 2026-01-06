-- Add guest contact fields to bookings table for guest checkout
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Make user_id nullable to support guest bookings
ALTER TABLE public.bookings 
ALTER COLUMN user_id DROP NOT NULL;

-- Create index on guest_email for lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON public.bookings(guest_email);

-- Update RLS policies to allow public inserts for guest bookings (via service role only)
-- The edge function uses service role, so no policy changes needed for guest checkout