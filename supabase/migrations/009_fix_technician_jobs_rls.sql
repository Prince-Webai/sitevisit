-- Migration 009: Ensure ALL authenticated users (including Technicians) can read all jobs
-- The problem: migration 007 created a "Sales can read jobs" policy that excludes
-- Technicians. Although migration 005 created "Auth users read jobs" (which covers
-- everyone), we consolidate here to be explicit and resolve any ambiguity.

-- 1. Ensure the broadest read policy covers all roles
DROP POLICY IF EXISTS "Auth users read jobs" ON public.jobs;
CREATE POLICY "Auth users read jobs" ON public.jobs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Drop the narrower role-based read policies that incorrectly exclude Technicians
DROP POLICY IF EXISTS "Sales can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated read jobs" ON public.jobs;

-- 3. Ensure Technicians can also update jobs assigned to them (e.g., to fill in site visit data)
DROP POLICY IF EXISTS "Staff update assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff update assigned jobs v2" ON public.jobs;
DROP POLICY IF EXISTS "Sales update jobs" ON public.jobs;

CREATE POLICY "Staff update assigned jobs" ON public.jobs
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('Admin', 'Dispatcher', 'Sales', 'Engineer')
    OR assigned_to = auth.uid()
  );

-- 4. Verify: Technicians must be able to read profiles for the joined query to work
-- (Migration 004 already creates "Profiles are readable by all authenticated users")
-- This is a safety re-creation in case it was dropped
DROP POLICY IF EXISTS "Profiles are readable by all authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by all authenticated users" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
