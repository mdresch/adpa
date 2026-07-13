-- ADR-005 Federated Capability Ownership -- Phase 3 task 6 follow-on fix,
-- discovered while verifying break-glass end-to-end: Phase 7 task 3's
-- active-member gate (migration 439) requires at least one active
-- functional_owner_department member in the target portfolio for any
-- transition to pending_department_approval/active -- unconditionally. But
-- break-glass (migration 441) exists SPECIFICALLY for when that department
-- has fewer than two active members, including the zero-member case. As
-- written, Phase 7's gate made Phase 3 task 6's entire zero-member scenario
-- impossible to activate through, which defeats break-glass's purpose.
--
-- Adds p_bypass_deadlock_gate, defaulted false so every existing caller
-- (Phase 2 task 4's override approval, the plain Phase 6 promote endpoint,
-- the attestation-lapse/override-expiry sweeps) is completely unaffected.
-- Only CapabilityOverrideExceptionController.activate ever passes true --
-- and only after its own super_admin/admin role check, mirroring how this
-- procedure already relies on the app layer (not the DB) to gate who may
-- set isOverride=true (Phase 4/6's own documented boundary: the procedure
-- verifies an override was RECORDED, not who is allowed to grant one).
-- This parameter does not bypass the DRACO verdict gate, the transition
-- graph, or anything else -- only the specific active-member check this
-- migration targets.

-- CREATE OR REPLACE only replaces a function with the IDENTICAL parameter
-- list -- adding a new parameter creates a second, overloaded signature
-- instead, which then makes every existing 7-argument call site ambiguous
-- ("is not unique"). The old signature must be dropped explicitly first.
DROP FUNCTION IF EXISTS public.promote_capability_status(uuid, varchar, uuid, text, uuid, boolean, timestamptz);

CREATE OR REPLACE FUNCTION public.promote_capability_status(
  p_capability_id uuid,
  p_new_status varchar(30),
  p_changed_by uuid,
  p_reason text,
  p_draco_verdict_id uuid DEFAULT NULL,
  p_is_override boolean DEFAULT false,
  p_override_expires_at timestamptz DEFAULT NULL,
  p_bypass_deadlock_gate boolean DEFAULT false
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
    WHEN 'draft' THEN p_new_status IN ('pending_department_approval', 'disabled')
    WHEN 'pending_department_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'active' THEN p_new_status IN ('pending_re_approval', 'disabled')
    WHEN 'pending_re_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'disabled' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'illegal activation_status transition: % -> %', v_old_status, p_new_status;
  END IF;

  IF p_new_status IN ('pending_department_approval', 'active') AND NOT p_bypass_deadlock_gate THEN
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
