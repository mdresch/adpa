-- Phase 0 (ADR-005) Task -1: record who created each company, so a Company Admin
-- exists for the break-glass path in Phase 3. Nullable and not backfillable —
-- no existing code path recorded the creator before this migration, so
-- pre-existing companies get created_by = NULL until a Super Admin assigns one.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);
