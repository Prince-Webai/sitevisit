-- ===================================================
-- MIGRATION 006: Auto-Profile Trigger & RLS Fix
-- This ensures every user gets a profile and data can be read.
-- ===================================================

-- 1. Create a function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Staff'),
    'Admin' -- Default to Admin for first setup, can be changed later
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix profiles RLS to prevent "circular" or "denial" issues
DROP POLICY IF EXISTS "Profiles are readable by all authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by all authenticated users" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 4. Backfill profiles for existing users who might be missing one
-- Run this manually if you already have users in auth.users:
-- INSERT INTO public.profiles (id, email, full_name, role)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Staff Member'), 'Admin'
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
