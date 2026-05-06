-- Migration 010: Grant all staff roles permission to manage checklists and job items
-- This fixes the "Failed to save job" error when Sales or Engineers try to create/edit jobs.

-- 1. Job Checklist RLS
DROP POLICY IF EXISTS "Admin/Dispatcher full access job_checklist" ON public.job_checklist;
DROP POLICY IF EXISTS "Staff full access job_checklist" ON public.job_checklist;

CREATE POLICY "Staff full access job_checklist" ON public.job_checklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer', 'Technician'))
  );

-- 2. Job Items RLS (Similar fix for line items)
DROP POLICY IF EXISTS "Admin/Dispatcher full access job_items" ON public.job_items;
DROP POLICY IF EXISTS "Staff full access job_items" ON public.job_items;

CREATE POLICY "Staff full access job_items" ON public.job_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer', 'Technician'))
  );

-- 3. Ensure clients can be managed by all staff (to allow creating new clients during job booking)
DROP POLICY IF EXISTS "Admin/Dispatcher full access clients" ON public.clients;
DROP POLICY IF EXISTS "Staff full access clients" ON public.clients;

CREATE POLICY "Staff full access clients" ON public.clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer', 'Technician'))
  );

-- 4. Site Visits RLS (Allow Sales to view assessments)
DROP POLICY IF EXISTS "Staff view own site visits" ON public.site_visits;
CREATE POLICY "Staff view all site visits" ON public.site_visits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher', 'Sales', 'Engineer', 'Technician'))
  );
