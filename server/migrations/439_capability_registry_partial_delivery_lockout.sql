-- ADR-005 Federated Capability Ownership -- Phase 7 (Action Item 8): enforce
-- partial-delivery lockout. This is the constraint that makes every earlier
-- phase's partial delivery harmless instead of misleading -- until now, a
-- module could sit in capability_registry with no functional_owner_department
-- and nothing would stop it. Requires migration 438 (owner backfill) to have
-- already run; if any row is still null, this ALTER fails outright, which is
-- the intended forcing function, not a bug to work around.
--
-- Task 1: NOT NULL on functional_owner_department.
ALTER TABLE public.capability_registry
  ALTER COLUMN functional_owner_department SET NOT NULL;

-- Task 2: FK against the departments reference table (migration 434) so
-- "NOT NULL" can't be satisfied by a typo'd placeholder string -- domain
-- integrity for "what's a valid department", the same reasoning Phase 0
-- applied to user_departments.department. control_definition_owner_department
-- gets the same FK for consistency (same domain of values) but stays nullable
-- -- only functional_owner_department is the plan's stated NOT NULL target.
ALTER TABLE public.capability_registry
  DROP CONSTRAINT IF EXISTS capability_registry_functional_owner_department_fkey;
ALTER TABLE public.capability_registry
  ADD CONSTRAINT capability_registry_functional_owner_department_fkey
  FOREIGN KEY (functional_owner_department) REFERENCES public.departments(code);

ALTER TABLE public.capability_registry
  DROP CONSTRAINT IF EXISTS capability_registry_control_definition_owner_department_fkey;
ALTER TABLE public.capability_registry
  ADD CONSTRAINT capability_registry_control_definition_owner_department_fkey
  FOREIGN KEY (control_definition_owner_department) REFERENCES public.departments(code);

-- Task 3: promote_capability_status additionally requires the resolved
-- functional_owner_department to have at least one active user_departments row
-- scoped to the capability's own portfolio_id -- not merely somewhere in the
-- system. A department can have plenty of active members overall but zero in
-- this specific portfolio, which is a silent deadlock nobody could otherwise
-- resolve. This only guarantees the *normal* approval path is satisfiable (one
-- member); the override path (Phase 2 task 4, not yet built) needs two distinct
-- active members in that same portfolio and has no equivalent guard here -- a
-- department with exactly one active member in a portfolio can receive normal
-- approvals there but can never invoke an override for it. That structural
-- (not transient) deadlock is what Phase 3 task 6's break-glass mechanism
-- (not yet built) is the designed answer to; this migration denies rather than
-- silently stalling, consistent with default-deny everywhere else in this ADR.
--
-- Full redefinition (as with every promote_capability_status change so far --
-- Postgres has no partial function redefinition). Transition graph, the
-- activation_status lockdown, the DRACO verdict gate, and the
-- capability_activation_history append-only guard are unchanged from
-- migration 437; this adds the department-membership check for transitions to
-- pending_department_approval or active.
CREATE OR REPLACE FUNCTION public.promote_capability_status(
  p_capability_id uuid,
  p_new_status varchar(30),
  p_changed_by uuid,
  p_reason text,
  p_draco_verdict_id uuid DEFAULT NULL,
  p_is_override boolean DEFAULT false,
  p_override_expires_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_old_status varchar(30);
  v_allowed boolean;
  v_verdict varchar(25);
  v_portfolio_id uuid;
  v_functional_owner_department varchar(50);
  v_has_active_member boolean;
BEGIN
  SELECT activation_status, portfolio_id, functional_owner_department
  INTO v_old_status, v_portfolio_id, v_functional_owner_department
  FROM public.capability_registry
  WHERE id = p_capability_id
  FOR UPDATE;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'capability_registry row not found: %', p_capability_id;
  END IF;

  v_allowed := CASE v_old_status
    WHEN 'draft' THEN p_new_status = 'pending_department_approval'
    WHEN 'pending_department_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'active' THEN p_new_status IN ('pending_re_approval', 'disabled')
    WHEN 'pending_re_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'disabled' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'illegal activation_status transition: % -> %', v_old_status, p_new_status;
  END IF;

  -- Phase 7 task 3: the accountable department must have someone who can
  -- actually exercise this approval, scoped to this exact portfolio.
  IF p_new_status IN ('pending_department_approval', 'active') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE department = v_functional_owner_department
        AND portfolio_id = v_portfolio_id
        AND is_active = true
    ) INTO v_has_active_member;

    IF NOT v_has_active_member THEN
      RAISE EXCEPTION 'functional_owner_department % has no active member in portfolio % -- activation blocked pending break-glass escalation',
        v_functional_owner_department, v_portfolio_id;
    END IF;
  END IF;

  IF p_new_status = 'active' THEN
    IF p_draco_verdict_id IS NULL THEN
      RAISE EXCEPTION 'activation to active requires a draco_verdict_id';
    END IF;

    SELECT verdict INTO v_verdict FROM public.draco_reviews WHERE id = p_draco_verdict_id;
    IF v_verdict IS NULL THEN
      RAISE EXCEPTION 'draco_verdict_id % does not reference an existing draco_reviews row', p_draco_verdict_id;
    END IF;

    IF v_verdict IN ('CONDITIONAL_PASS', 'REJECT') THEN
      IF NOT p_is_override THEN
        RAISE EXCEPTION 'draco verdict % requires an override to activate', v_verdict;
      END IF;
      IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'an override requires a non-empty justification (p_reason)';
      END IF;
      IF p_override_expires_at IS NULL THEN
        RAISE EXCEPTION 'an override requires override_expires_at to be set';
      END IF;
    END IF;
  END IF;

  PERFORM set_config('adpa.allow_activation_status_write', 'on', true);

  UPDATE public.capability_registry
  SET activation_status = p_new_status, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_capability_id;

  PERFORM set_config('adpa.allow_activation_status_write', 'off', true);

  PERFORM set_config('adpa.allow_activation_history_write', 'on', true);

  INSERT INTO public.capability_activation_history
    (capability_id, old_status, new_status, changed_by, reason, draco_verdict_id, is_override, override_expires_at)
  VALUES
    (p_capability_id, v_old_status, p_new_status, p_changed_by, p_reason, p_draco_verdict_id, p_is_override, p_override_expires_at);

  PERFORM set_config('adpa.allow_activation_history_write', 'off', true);
END;
$$;
