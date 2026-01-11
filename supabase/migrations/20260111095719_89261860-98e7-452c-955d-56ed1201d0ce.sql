-- Strengthen bookings table RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

-- Explicitly revoke all access from anonymous role
REVOKE ALL ON public.bookings FROM anon;

-- Grant access only to authenticated users (they still need to pass RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- Policy: Users can view ONLY their own bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can create bookings (must set user_id to their own id)
CREATE POLICY "Users can create their own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update ONLY their own bookings
CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete ONLY their own bookings
CREATE POLICY "Users can delete their own bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Partners can view bookings for their approved venues
CREATE POLICY "Partners can view bookings for their venues"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.partner_venues pv
    WHERE pv.venue_id = bookings.venue_id
      AND pv.user_id = auth.uid()
      AND pv.status = 'approved'
  )
);

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can manage (INSERT/UPDATE/DELETE) all bookings
CREATE POLICY "Admins can manage all bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));