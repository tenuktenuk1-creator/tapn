-- Add vibe_tags and price_tier to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS vibe_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS price_tier text DEFAULT 'moderate';

-- Add stripe_payment_intent_id to bookings and remove pending status logic
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Update booking_status enum to only allow CONFIRMED and CANCELLED
-- First, update any existing pending/approved/rejected to cancelled
UPDATE public.bookings SET status = 'cancelled' WHERE status IN ('pending', 'approved', 'rejected');

-- Create a new enum type with only confirmed and cancelled
DO $$
BEGIN
  -- Check if the old enum exists and create new one
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    -- Create a temporary column
    ALTER TABLE public.bookings ADD COLUMN status_new text;
    
    -- Copy data
    UPDATE public.bookings SET status_new = status::text;
    
    -- Drop the old column
    ALTER TABLE public.bookings DROP COLUMN status;
    
    -- Rename new column
    ALTER TABLE public.bookings RENAME COLUMN status_new TO status;
    
    -- Add default
    ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'confirmed';
  END IF;
END $$;

-- Create index for faster payment intent lookups
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent ON public.bookings(stripe_payment_intent_id);

-- Create index for venue availability checks (prevent double booking)
CREATE INDEX IF NOT EXISTS idx_bookings_venue_datetime ON public.bookings(venue_id, booking_date, start_time, end_time);