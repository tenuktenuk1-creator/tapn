-- Create busy_status enum
CREATE TYPE public.busy_status AS ENUM ('quiet', 'moderate', 'busy');

-- Add busy_status and busy_status_updated_at columns to venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS busy_status public.busy_status DEFAULT 'quiet',
ADD COLUMN IF NOT EXISTS busy_status_updated_at timestamp with time zone DEFAULT now();

-- Update the public_venues view to include new fields
DROP VIEW IF EXISTS public.public_venues;

CREATE VIEW public.public_venues AS
SELECT 
  id,
  venue_type,
  latitude,
  longitude,
  price_per_hour,
  rating,
  review_count,
  opening_hours,
  is_active,
  created_at,
  updated_at,
  name,
  description,
  city,
  address,
  images,
  amenities,
  vibe_tags,
  price_tier,
  busy_status,
  busy_status_updated_at
FROM public.venues
WHERE is_active = true;