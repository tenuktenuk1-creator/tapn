-- Drop and recreate the view with security_invoker = true to prevent SECURITY DEFINER issues
DROP VIEW IF EXISTS public.public_venues;

CREATE VIEW public.public_venues
WITH (security_invoker = true)
AS
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

-- Grant access to the public view
GRANT SELECT ON public.public_venues TO anon, authenticated;

-- Add a new restrictive policy for public access that uses the view indirectly
-- The public_venues view will be used for unauthenticated/public access
-- Full venue details (including email/phone) only accessible to admins and partners