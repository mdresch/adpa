-- ADR-005 Federated Capability Ownership -- Phase 3 task 6 follow-on fix.
-- Discovered while verifying break-glass: a capability_override_exceptions
-- request can be raised (and declined) against a capability still in 'draft'
-- -- nothing requires it to have reached pending_department_approval first.
-- The decline trigger (migration 441) always transitions to 'disabled', but
-- migration 435/439's transition graph only allowed 'disabled' from
-- pending_department_approval/active/pending_re_approval, not 'draft' --
-- declining a break-glass request for a still-draft module raised
-- "illegal activation_status transition: draft -> disabled".
--
-- 'draft -> disabled' is a legitimate terminal outcome (a module can be
-- declared dead before it was ever formally pending anyone's approval), so
-- this extends the transition graph narrowly rather than requiring the
-- exception-raising endpoint to force an unrelated state change first.
-- Everything else in promote_capability_status is unchanged from migration
-- 439 -- full redefinition because Postgres has no partial ALTER FUNCTION.

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
