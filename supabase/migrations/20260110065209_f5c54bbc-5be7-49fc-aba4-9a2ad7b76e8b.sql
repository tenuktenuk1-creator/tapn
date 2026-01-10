-- Create a table for partner venues associations
CREATE TABLE IF NOT EXISTS public.partner_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_venues
CREATE POLICY "Partners can view their own venue associations"
ON public.partner_venues
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Partners can insert their own venue associations"
ON public.partner_venues
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can update their own venue associations"
ON public.partner_venues
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all partner venues"
ON public.partner_venues
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all partner venues"
ON public.partner_venues
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update venues table to allow partners to manage their own venues
CREATE POLICY "Partners can view their own venues"
ON public.venues
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_venues pv
    WHERE pv.venue_id = venues.id
    AND pv.user_id = auth.uid()
    AND pv.status = 'approved'
  )
);

CREATE POLICY "Partners can update their own venues"
ON public.venues
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partner_venues pv
    WHERE pv.venue_id = venues.id
    AND pv.user_id = auth.uid()
    AND pv.status = 'approved'
  )
);

CREATE POLICY "Partners can insert venues"
ON public.venues
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'partner'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_partner_venues_updated_at
BEFORE UPDATE ON public.partner_venues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();