-- Add explicit policy to allow anonymous users to SELECT from the venues table
-- This is needed for the public_venues view to work (since it uses security_invoker)
CREATE POLICY "Anonymous can view active venues basic info" 
ON public.venues 
FOR SELECT 
TO anon
USING (is_active = true);