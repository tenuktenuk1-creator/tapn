-- Create a public-safe view that excludes sensitive contact information
CREATE OR REPLACE VIEW public.public_venues AS
SELECT 
  id,
  name,
  description,
  venue_type,
  city,
  address,
  images,
  latitude,
  longitude,
  amenities,
  vibe_tags,
  price_per_hour,
  price_tier,
  rating,
  review_count,
  opening_hours,
  is_active,
  created_at,
  updated_at
FROM public.venues
WHERE is_active = true;

-- Grant access to the public view for anon and authenticated users
GRANT SELECT ON public.public_venues TO anon, authenticated;

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active venues" ON public.venues;