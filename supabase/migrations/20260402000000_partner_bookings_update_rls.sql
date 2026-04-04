-- Partners can update (confirm/reject) bookings for their approved venues.
-- The SELECT policy already exists but UPDATE was never added, which caused
-- useConfirmBooking / useDeclineBooking to silently fail (RLS blocked the
-- write but returned no error, so the client believed it succeeded).

CREATE POLICY "Partners can update bookings for their venues"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.partner_venues pv
    WHERE pv.venue_id = bookings.venue_id
      AND pv.user_id = auth.uid()
      AND pv.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.partner_venues pv
    WHERE pv.venue_id = bookings.venue_id
      AND pv.user_id = auth.uid()
      AND pv.status = 'approved'
  )
);
