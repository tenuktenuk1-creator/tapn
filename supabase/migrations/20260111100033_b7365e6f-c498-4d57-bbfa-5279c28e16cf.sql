-- Explicitly revoke all access from anonymous role on profiles table
REVOKE ALL ON public.profiles FROM anon;

-- Ensure only authenticated users can access profiles (they still need to pass RLS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;