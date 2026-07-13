-- ADR-005 Federated Capability Ownership -- Phase 3 task 6: structural-deadlock
-- break-glass. Substitutes for Phase 2 task 4's normal 2-distinct-department-
-- member override when the target department has fewer than two active
-- members in the capability's own portfolio (making that normal override
-- structurally impossible, not just slow). Built entirely Node-side for the
-- same reason as migration 440 -- promote_capability_status, user_departments,
-- users, and companies all live here.
--
-- Request-then-pickup, not automatic grant on request (confirmed against the
-- reference org's actual break-glass-intervention-request.js behavior, which
-- this repo does not itself contain -- only ever raises a ticket, never
-- self-activates). Five reviewer categories: account_owner, manager,
-- internal_audit, external_auditor, super_admin -- all expected to approve;
-- a single decline both disables the module immediately and escalates
-- (enforced by trigger, so a future code path can't forget the disable half).
-- Only a Super Admin's own pickup/response may fire the actual activation --
-- enforced at the endpoint, not by this schema alone (a role check needs
-- live users.role, which a trigger could also read, but keeping the "who may
-- activate" decision at the endpoint keeps it next to the auth code it must
-- stay consistent with).

ALTER TABLE public.portfolio_governance
  ADD COLUMN IF NOT EXISTS escalation_manager_id uuid REFERENCES public.users(id);
ALTER TABLE public.portfolio_governance
  ADD COLUMN IF NOT EXISTS external_auditor_contacts jsonb NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS public.capability_override_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capability_id uuid NOT NULL REFERENCES public.capability_registry(id),
  requested_new_status varchar(30) NOT NULL,
  draco_verdict_id uuid REFERENCES public.draco_reviews(id),
  justification text NOT NULL,
  raised_by uuid NOT NULL REFERENCES public.users(id),
  raised_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  exception_review_status varchar(20) NOT NULL DEFAULT 'pending',
  activated_by uuid REFERENCES public.users(id),
  activated_at timestamptz,
  CONSTRAINT capability_override_exceptions_status_check
    CHECK (exception_review_status IN ('pending', 'active', 'disabled', 'escalated'))
);
CREATE INDEX IF NOT EXISTS idx_capability_override_exceptions_capability
  ON public.capability_override_exceptions(capability_id);

CREATE TABLE IF NOT EXISTS public.override_exception_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exception_id uuid NOT NULL REFERENCES public.capability_override_exceptions(id),
  reviewer_category varchar(30) NOT NULL,
  reviewer_user_id uuid REFERENCES public.users(id),
  reviewer_label text,
  decision varchar(20),
  decided_at timestamptz,
  notes text,
  escalated_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT override_exception_reviews_category_check
    CHECK (reviewer_category IN ('account_owner', 'manager', 'internal_audit', 'external_auditor', 'super_admin')),
  CONSTRAINT override_exception_reviews_decision_check
    CHECK (decision IS NULL OR decision IN ('approved', 'declined'))
);
CREATE INDEX IF NOT EXISTS idx_override_exception_reviews_exception
  ON public.override_exception_reviews(exception_id);
CREATE INDEX IF NOT EXISTS idx_override_exception_reviews_pending
  ON public.override_exception_reviews(created_at) WHERE decision IS NULL;

-- Contract guard: initiating break-glass when the department has >=2 active
-- members in this portfolio must fail -- this is specifically the deadlock
-- substitute (Phase 2 task 4 handles the normal case), never a general-purpose
-- bypass of the two-signature requirement.
CREATE OR REPLACE FUNCTION public.guard_capability_override_exception_requires_deadlock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_department varchar(50);
  v_portfolio_id uuid;
  v_active_member_count int;
BEGIN
  SELECT functional_owner_department, portfolio_id INTO v_department, v_portfolio_id
  FROM public.capability_registry
  WHERE id = NEW.capability_id;

  SELECT count(*) INTO v_active_member_count
  FROM public.user_departments
  WHERE department = v_department AND portfolio_id = v_portfolio_id AND is_active = true;

  IF v_active_member_count >= 2 THEN
    RAISE EXCEPTION 'break-glass is only for a structural deadlock (department % has % active members in portfolio %, which is >= 2 -- use the normal override path instead)',
      v_department, v_active_member_count, v_portfolio_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_capability_override_exception_requires_deadlock ON public.capability_override_exceptions;
CREATE TRIGGER trg_guard_capability_override_exception_requires_deadlock
BEFORE INSERT ON public.capability_override_exceptions
FOR EACH ROW EXECUTE FUNCTION public.guard_capability_override_exception_requires_deadlock();

-- A decline has two hard, automatic consequences: (1) the module is disabled
-- immediately via promote_capability_status, the same enforced write path as
-- any other transition; (2) the parent exception's status reflects it. Both
-- enforced here so a future code path can't forget one branch. Escalation
-- NOTIFICATION dispatch (who gets told) stays app-level, matching every other
-- notification in this codebase (Postgres has no outbound HTTP/SMTP) -- the
-- STATE MUTATION half is what this trigger guarantees, which is the part a
-- forgetful code path could otherwise skip.
CREATE OR REPLACE FUNCTION public.guard_override_exception_review_decision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_capability_id uuid;
  v_justification text;
BEGIN
  IF NEW.decision IS DISTINCT FROM OLD.decision AND NEW.decision = 'declined' THEN
    SELECT capability_id, justification INTO v_capability_id, v_justification
    FROM public.capability_override_exceptions
    WHERE id = NEW.exception_id;

    PERFORM public.promote_capability_status(
      v_capability_id, 'disabled', NULL,
      'break-glass exception declined by ' || NEW.reviewer_category, NULL, false, NULL
    );

    UPDATE public.capability_override_exceptions
    SET exception_review_status = 'disabled'
    WHERE id = NEW.exception_id AND exception_review_status NOT IN ('disabled');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_override_exception_review_decision ON public.override_exception_reviews;
CREATE TRIGGER trg_guard_override_exception_review_decision
AFTER UPDATE OF decision ON public.override_exception_reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_override_exception_review_decision();
