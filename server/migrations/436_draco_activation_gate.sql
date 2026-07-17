-- ADR-005 Federated Capability Ownership -- Phase 4 (Action Item 5): DRACO
-- wiring, tasks 2/3/5 only. Task 1 (auto-enqueueing a DRACO review when a
-- module transitions to pending_department_approval) and task 4 (per-finding
-- accept/override attestation) are deferred -- DRACO's runFullReview()
-- requires a real documents.id (draco_reviews.document_id / draco_overrides
-- both hard-FK to documents), and no module has real config/control content
-- to review yet (module_drift_sources, Phase 3, is still empty). See
-- docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase4-design.md.
--
-- Confirmed against running code (server/src/services/dracoVerdictEngine.ts,
-- server/src/routes/approvals.ts): DRACO returns three verdicts (PASS,
-- CONDITIONAL_PASS, REJECT). approvals.ts's existing DRACO gate only checks
-- REJECT -- a CONDITIONAL_PASS (advisable_to_publish=true but still carrying
-- unresolved conditions_for_approval) silently passes there today. This
-- migration closes that gap at the DB enforcement layer for capability
-- activation specifically, not by changing approvals.ts.

ALTER TABLE public.capability_activation_history
  DROP CONSTRAINT IF EXISTS capability_activation_history_draco_verdict_id_fkey;
ALTER TABLE public.capability_activation_history
  ADD CONSTRAINT capability_activation_history_draco_verdict_id_fkey
  FOREIGN KEY (draco_verdict_id) REFERENCES public.draco_reviews(id);

-- Full redefinition (Postgres has no ALTER FUNCTION for body changes) --
-- transition graph and lockdown mechanics unchanged from migration 435;
-- adds the DRACO verdict gate for transitions to 'active' only.
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
BEGIN
  SELECT activation_status INTO v_old_status
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

  -- Task 2: a transition to 'active' requires a real, completed DRACO
  -- verdict -- not merely a non-null UUID. The FK added above enforces this
  -- at INSERT time too; checking explicitly here gives a clear exception
  -- instead of a raw FK-violation message.
  IF p_new_status = 'active' THEN
    IF p_draco_verdict_id IS NULL THEN
      RAISE EXCEPTION 'activation to active requires a draco_verdict_id';
    END IF;

    SELECT verdict INTO v_verdict FROM public.draco_reviews WHERE id = p_draco_verdict_id;
    IF v_verdict IS NULL THEN
      RAISE EXCEPTION 'draco_verdict_id % does not reference an existing draco_reviews row', p_draco_verdict_id;
    END IF;

    -- Task 3: CONDITIONAL_PASS carries unresolved conditions_for_approval
    -- (advisable_to_publish=true but not a clean pass) -- any verdict other
    -- than a clean PASS requires an override recorded with a justification
    -- and a mandatory expiry, same as REJECT. This procedure only enforces
    -- that an override was RECORDED (is_override, reason, override_expires_at)
    -- -- it does not verify who recorded it or their department membership;
    -- that authorization check is TaskApprovalGate's job (Phase 2 task 4,
    -- not yet built) layered on top of this same procedure.
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

  INSERT INTO public.capability_activation_history
    (capability_id, old_status, new_status, changed_by, reason, draco_verdict_id, is_override, override_expires_at)
  VALUES
    (p_capability_id, v_old_status, p_new_status, p_changed_by, p_reason, p_draco_verdict_id, p_is_override, p_override_expires_at);
END;
$$;
