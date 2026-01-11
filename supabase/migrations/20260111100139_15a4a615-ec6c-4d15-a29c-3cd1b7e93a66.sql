-- Remove the policy that allows anonymous access to venues table (includes sensitive contact info)
DROP POLICY IF EXISTS "Anonymous can view active venues basic info" ON public.venues;

-- Explicitly revoke all access from anonymous role on venues table
REVOKE ALL ON public.venues FROM anon;

-- Grant access only to authenticated users on venues table (they still need to pass RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;

-- Allow anonymous users to access ONLY the public_venues view (which excludes email/phone)
GRANT SELECT ON public.public_venues TO anon;
GRANT SELECT ON public.public_venues TO authenticated;