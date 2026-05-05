-- Migration 008: Track job creator (salesperson)
-- Adds a nullable created_by UUID column to jobs so the Sales user who books
-- a site visit (or any user who creates a job) is permanently recorded.
-- Nullable so all historical jobs remain valid without backfill.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs(created_by);
