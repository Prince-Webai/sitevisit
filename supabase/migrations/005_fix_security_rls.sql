-- ===================================================
-- MIGRATION 005: Fix Critical Security RLS Gaps
-- Run this IMMEDIATELY in Supabase SQL Editor
-- ===================================================

-- ==========================================
-- 1. JOBS TABLE — Enable RLS (was open!)
-- ==========================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Remove any existing permissive policies first
DROP POLICY IF EXISTS "Allow all" ON public.jobs;
DROP POLICY IF EXISTS "Public jobs access" ON public.jobs;

-- Authenticated users can read jobs (based on role)
CREATE POLICY "Auth users read jobs" ON public.jobs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only Admin/Dispatcher/Sales can INSERT new jobs
CREATE POLICY "Sales can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('Admin', 'Dispatcher', 'Sales')
  );

-- Admin/Dispatcher/Sales can UPDATE, or the assigned engineer
CREATE POLICY "Staff update assigned jobs v2" ON public.jobs
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('Admin', 'Dispatcher', 'Sales')
    OR assigned_to = auth.uid()
  );

-- Only Admin can DELETE jobs
CREATE POLICY "Admin delete jobs" ON public.jobs
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ==========================================
-- 2. CLIENTS TABLE — Enable RLS (was open!)
-- ==========================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all clients" ON public.clients;
DROP POLICY IF EXISTS "Public clients access" ON public.clients;

-- Only authenticated users can read clients
CREATE POLICY "Auth users read clients" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only Sales/Admin/Dispatcher can insert new clients
CREATE POLICY "Sales insert clients" ON public.clients
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('Admin', 'Dispatcher', 'Sales')
  );

-- Admin/Dispatcher/Sales can update client records
CREATE POLICY "Sales update clients" ON public.clients
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('Admin', 'Dispatcher', 'Sales')
  );

-- Only Admin can delete clients
CREATE POLICY "Admin delete clients" ON public.clients
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ==========================================
-- 3. AUDIT LOGS — Enable RLS
-- ==========================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all audit logs" ON public.audit_logs;

-- Only authenticated users can read logs
CREATE POLICY "Auth users read audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only authenticated users can insert logs (system inserts them)
CREATE POLICY "Auth users insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Nobody can update or delete audit logs (immutable trail)
-- (No UPDATE or DELETE policies = blocked by default)

-- ==========================================
-- 4. JOB_CHECKLIST — Enable RLS
-- ==========================================
ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read checklist" ON public.job_checklist
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users manage checklist" ON public.job_checklist
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- VERIFY: Check which tables have RLS enabled
-- ==========================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
