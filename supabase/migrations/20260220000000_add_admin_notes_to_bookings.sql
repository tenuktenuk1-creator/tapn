-- Add admin_notes column to bookings table for internal admin use
-- This separates customer special requests (notes) from internal admin notes (admin_notes)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS admin_notes text;
