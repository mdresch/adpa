-- ADR-005 Federated Capability Ownership -- Phase 5 (Action Item 6): tamper
-- evidence, Node-side half. Closes a confirmed real gap: capability_registry's
-- activation_status column is lockdown-protected (migration 435), but
-- capability_activation_history -- the audit trail itself -- has no lockdown
-- at all. Nothing today stops a raw INSERT/UPDATE/DELETE against it bypassing
-- promote_capability_status() entirely.
--
-- Scope note: this migration does NOT attempt to lock down the .NET
-- orchestrator's governance_ledger table -- that's a physically separate
-- Postgres database with no reachable in-repo writer today (see
-- docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase5-design.md).
-- This migration covers what's real and verifiable on the Node side:
-- capability_activation_history's own lockdown, plus the reconciliation-job
-- liveness-monitoring infrastructure (task 4).

-- Task 2 (Node half): capability_activation_history is append-only. INSERT is
-- gated by a dedicated session-local guard variable (separate from
-- activation_status's own guard, since promote_capability_status resets that
-- one to 'off' before its own INSERT into this table runs -- see the
-- redefinition below). UPDATE and DELETE are never permitted, full stop, not
-- even by the stored procedure -- there is no legitimate reason to ever
-- modify or remove a written history row.
CREATE OR REPLACE FUNCTION public.guard_capability_activation_history_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('adpa.allow_activation_history_write', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'capability_activation_history may only be written via promote_capability_status()';
    END IF;
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'capability_activation_history is append-only: % is never permitted', TG_OP;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_capability_activation_history ON public.capability_activation_history;
CREATE TRIGGER trg_guard_capability_activation_history
BEFORE INSERT OR UPDATE OR DELETE ON public.capability_activation_history
FOR EACH ROW EXECUTE FUNCTION public.guard_capability_activation_history_append_only();

-- Full redefinition (as with every promote_capability_status change so far --
-- Postgres has no partial function redefinition). Transition graph, the
-- activation_status lockdown, and the DRACO verdict gate are unchanged from
-- migration 436; this only wraps the INSERT into capability_activation_history
-- with the new guard variable.
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

-- Task 4: shared scheduled-job liveness-monitoring infrastructure. Generic,
-- reusable across any periodic job (not ADR-005-specific), introduced here
-- because Phase 5 task 4 ("the reconciliation job needs its own liveness
-- monitoring") is what first needs it. Each job upserts a row on every run
-- (success or failure); a separate job's tick reads this table to detect
-- staleness -- see capabilityActivationReconciliationJob.ts /
-- capabilityAttestationJob.ts for the read/write sides.
CREATE TABLE IF NOT EXISTS public.scheduled_job_heartbeats (
  job_name varchar(100) PRIMARY KEY,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
