-- Migration 007: Support for Sales Role
-- 1. Update profiles constraint to allow 'Sales' and 'Engineer' roles
-- 2. Grant Sales role permission to create clients and jobs
-- This fixes the "stuck on Booking..." issue when a Sales user submits the booking form.

-- Update the check constraint on profiles table to include all necessary roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'Dispatcher', 'Technician', 'Sales', 'Engineer'));

-- Allow Sales to insert new clients
DROP POLICY IF EXISTS "Sales can create clients" ON public.clients;
CREATE POLICY "Sales can create clients" ON public.clients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer'))
  );

-- Allow Sales to read clients (needed for duplicate phone check)
DROP POLICY IF EXISTS "Sales can read clients" ON public.clients;
CREATE POLICY "Sales can read clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer'))
  );

-- Allow Sales to insert new jobs
DROP POLICY IF EXISTS "Sales can create jobs" ON public.jobs;
CREATE POLICY "Sales can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer'))
  );

-- Allow Sales to read all jobs (for dashboard)
DROP POLICY IF EXISTS "Sales can read jobs" ON public.jobs;
CREATE POLICY "Sales can read jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer'))
  );

-- Allow Sales to write audit logs
DROP POLICY IF EXISTS "Sales can write audit logs" ON public.audit_logs;
CREATE POLICY "Sales can write audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer'))
  );
