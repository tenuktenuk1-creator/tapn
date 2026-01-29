-- Fix security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.public_venues;

CREATE VIEW public.public_venues
WITH (security_invoker=on) AS
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