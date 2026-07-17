-- Phase 1 (ADR-005) Action Item 2: capability ownership registry.
-- Runtime-queryable, constraint-enforceable table for the three declared owners
-- (platform operator, functional owner department, control definition owner department)
-- per governed module per portfolio. Owner-department columns stay nullable until
-- Phase 1 task 3's seed and a business decision populate them; Phase 7 adds the
-- NOT NULL / FK tightening once every module has an assigned owner.
CREATE TABLE IF NOT EXISTS public.capability_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES public.portfolio_governance(id),
  module_id varchar(100) NOT NULL, -- matches governed-features.manifest.json "id" where applicable
  platform_operator varchar(50) DEFAULT 'IT' NOT NULL,
  functional_owner_type varchar(20) DEFAULT 'department' NOT NULL, -- reserved for future non-department owner types; unused in logic today
  functional_owner_department varchar(50),
  control_definition_owner_department varchar(50),
  functional_owner_assigned_at timestamptz,
  attestation_due_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (module_id, portfolio_id)
);

CREATE INDEX IF NOT EXISTS idx_capability_registry_portfolio ON public.capability_registry(portfolio_id);
