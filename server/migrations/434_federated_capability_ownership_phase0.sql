-- ADR-005 Federated Capability Ownership -- Phase 0 (Action Item 1): identity
-- extension. Adds the portfolio-existence-by-construction trigger (Phase 0
-- task 0), the departments/user_departments identity tables (task 1), and the
-- Firebase claims-sync outbox table (task 2's dual-write-safe persistence).
-- See docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md.

-- Task 0: company creation must guarantee portfolio existence by construction,
-- not as an app-layer step a second insertion point can miss (companies are
-- created from both AuthRepository.ts and CompanyRepository.ts today).
CREATE OR REPLACE FUNCTION public.create_portfolio_for_new_company()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.portfolio_governance (company_id, portfolio_name, status)
  VALUES (NEW.id, NEW.name || ' Portfolio', 'active')
  ON CONFLICT (company_id) WHERE (company_id IS NOT NULL) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_create_portfolio ON public.companies;
CREATE TRIGGER trg_companies_create_portfolio
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.create_portfolio_for_new_company();

-- Backfill: the trigger only covers companies created after it exists.
INSERT INTO public.portfolio_governance (company_id, portfolio_name, status)
SELECT c.id, c.name || ' Portfolio', 'active'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.portfolio_governance pg WHERE pg.company_id = c.id
);

-- Task 1: departments reference table. Domain integrity for "what's a valid
-- department" needs to exist where the string is first captured, not three
-- phases downstream at Phase 7's FK. Codes must match departmentClaims.ts's
-- SEED_DEPARTMENT_CODES.
CREATE TABLE IF NOT EXISTS public.departments (
  code varchar(50) PRIMARY KEY
);
INSERT INTO public.departments (code) VALUES
  ('IT'), ('Compliance'), ('Legal'), ('Finance'), ('HR'), ('Risk'), ('Internal Audit')
ON CONFLICT (code) DO NOTHING;

-- Task 1: user_departments -- many-to-many with a role column, not a flat
-- string, so a user can be a member of one department and a deputy for
-- another simultaneously (Open Question 1's deputy concept).
CREATE TABLE IF NOT EXISTS public.user_departments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  portfolio_id uuid NOT NULL REFERENCES public.portfolio_governance(id),
  department varchar(50) NOT NULL REFERENCES public.departments(code),
  department_role varchar(20) DEFAULT 'member' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_departments_role_check CHECK (department_role IN ('member', 'deputy', 'head')),
  UNIQUE (user_id, portfolio_id, department)
);
CREATE INDEX IF NOT EXISTS idx_user_departments_department ON public.user_departments(department) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_user_departments_portfolio ON public.user_departments(portfolio_id) WHERE is_active;

DROP TRIGGER IF EXISTS update_user_departments_updated_at ON public.user_departments;
CREATE TRIGGER update_user_departments_updated_at
BEFORE UPDATE ON public.user_departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task 2: Firebase claims-sync outbox. The DB write (user_departments) and the
-- Firebase Admin call are a classic dual-write; this table lets the two be
-- committed transactionally and reconciled by a retryable background worker
-- instead of calling Firebase inline from the request path.
CREATE TABLE IF NOT EXISTS public.department_claims_sync_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  claims jsonb NOT NULL,
  is_removal boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,
  CONSTRAINT department_claims_sync_jobs_status_check CHECK (status IN ('pending', 'complete', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_department_claims_sync_jobs_status ON public.department_claims_sync_jobs(status);
