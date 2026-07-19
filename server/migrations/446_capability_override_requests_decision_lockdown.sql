-- ADR-012 Action Item 6 (PR6c, write-lockdown): the one-way door. Makes
-- decide_capability_request (migration 445) the only sanctioned writer of
-- capability_override_requests's decision columns, mirroring
-- guard_capability_registry_activation_status
-- (435_module_activation_lifecycle.sql) exactly -- a BEFORE UPDATE trigger
-- checking a session-local guard variable, not REVOKE. This codebase
-- connects to Postgres via one DATABASE_URL/role for both migrations and
-- runtime (zero REVOKE hits anywhere in this repo, confirmed by grep before
-- writing this), so there is no separate low-privilege app role to revoke
-- UPDATE from without rewiring deployment credentials -- see
-- 445_capability_override_requests_withdraw.sql's own header and ADR-012
-- §D for the fuller correction history.
--
-- Guards status/approved_by/approved_by_department/decided_at/
-- denial_reason/withdrawn_at/override_expires_at together, as one group --
-- not status alone -- since all seven only ever change together as part of
-- one decision, and a partial guard would leave the others as an unlocked
-- side door into the same effective state change.
--
-- Review finding (PR #747), disclosed rather than silently "fixed": the guard
-- variable itself (adpa.allow_capability_override_decision_write) is a plain
-- session-local GUC. Any caller with this app's own DATABASE_URL role can set it
-- themselves (`SELECT set_config('adpa.allow_capability_override_decision_write',
-- 'on', true)`) and then issue a raw UPDATE, bypassing decide_capability_request
-- entirely -- the trigger does not distinguish "the procedure set this" from "a
-- caller set this directly." This is a real, structural limitation of the
-- session-guard-variable pattern, not something this migration closes: it protects
-- against an *accidental* direct write from a code path that doesn't know to route
-- through the procedure (the actual failure mode this codebase has hit before), not
-- against a caller with equivalent database privileges deliberately working around
-- it. `guard_capability_registry_activation_status` (435_module_activation_lifecycle
-- .sql) already has the identical property and has been accepted for that table on
-- the same basis; the trade-off is unchanged, not new here. A real privilege
-- boundary would require a separate low-privilege application role with UPDATE
-- revoked and only EXECUTE granted on the procedure -- already ruled out for this
-- codebase (see this migration's own header above and ADR-012 §D): one
-- DATABASE_URL/role serves both migrations and runtime, and introducing a second
-- role means rewiring deployment credentials, a decision bigger than this PR.

CREATE OR REPLACE FUNCTION public.guard_capability_override_requests_decision_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
    NEW.approved_by_department IS DISTINCT FROM OLD.approved_by_department OR
    NEW.decided_at IS DISTINCT FROM OLD.decided_at OR
    NEW.denial_reason IS DISTINCT FROM OLD.denial_reason OR
    NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at OR
    NEW.override_expires_at IS DISTINCT FROM OLD.override_expires_at
  )
  AND current_setting('adpa.allow_capability_override_decision_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'capability_override_requests decision columns may only be changed via decide_capability_request()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_capability_override_requests_decision ON public.capability_override_requests;
CREATE TRIGGER trg_guard_capability_override_requests_decision
BEFORE UPDATE ON public.capability_override_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_capability_override_requests_decision_columns();

-- Redefine decide_capability_request (445) to open the guard window
-- immediately before its own UPDATE and close it immediately after --
-- same "don't leave the bypass open for the rest of the calling
-- transaction" reasoning promote_capability_status already establishes
-- for activation_status's own guard. set_config(..., true) (is_local)
-- only reverts at transaction end by default; closing the window right
-- after the one sanctioned write is what stops a same-transaction raw
-- UPDATE piggyback from also slipping through.
-- Review findings (PR #745), reapplied here since this CREATE OR REPLACE fully
-- redefines the function body -- see 445_capability_override_requests_withdraw.sql's
-- own header for the full reasoning behind both fixes:
--   1. `p_decision IS NULL` is checked explicitly -- `p_decision NOT IN (...)` alone
--      evaluates to NULL (not TRUE) for a NULL input, so a NULL decision would
--      otherwise silently fall through to the final ELSE branch and be treated as
--      'withdrawn'.
--   2. Approve/deny authorization resolves the capability's own
--      functional_owner_department and requires it to match p_decided_by_department,
--      instead of trusting the caller's claimed department outright -- a member of an
--      unrelated department could otherwise pass their own department and be accepted
--      as a valid approver for a request that has nothing to do with it. This matters
--      more here specifically: this migration is what makes decide_capability_request
--      the sole writer, so the procedure's own authorization boundary has to hold
--      without an app-layer caller already having done the right thing first.
CREATE OR REPLACE FUNCTION public.decide_capability_request(
  p_request_id uuid,
  p_decision varchar(20),
  p_decided_by uuid,
  p_decided_by_department varchar(50),
  p_reason text,
  p_override_expires_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.capability_override_requests%ROWTYPE;
  v_portfolio_id uuid;
  v_functional_owner_department varchar(50);
  v_is_member boolean;
  v_digest_old text;
  v_digest_new text;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'denied', 'withdrawn') THEN
    RAISE EXCEPTION 'decide_capability_request: invalid decision %', p_decision;
  END IF;

  SELECT * INTO v_row FROM public.capability_override_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'capability_override_request not found: %', p_request_id;
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'capability_override_request % has already been decided (status: %)', p_request_id, v_row.status;
  END IF;

  SELECT portfolio_id INTO v_portfolio_id FROM public.capability_registry WHERE id = v_row.capability_id;

  IF p_decision = 'withdrawn' THEN
    IF p_decided_by IS DISTINCT FROM v_row.requested_by THEN
      RAISE EXCEPTION 'only the requester may withdraw request %', p_request_id;
    END IF;
  ELSE
    IF p_decided_by = v_row.requested_by THEN
      RAISE EXCEPTION 'the approver/denier must be a different person from the requester';
    END IF;

    SELECT functional_owner_department INTO v_functional_owner_department
    FROM public.capability_registry WHERE id = v_row.capability_id;

    IF v_functional_owner_department IS DISTINCT FROM p_decided_by_department THEN
      RAISE EXCEPTION 'decided_by_department % does not match this capability''s functional owner department %',
        p_decided_by_department, v_functional_owner_department;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE user_id = p_decided_by AND portfolio_id = v_portfolio_id
        AND department = v_functional_owner_department AND is_active = true
    ) INTO v_is_member;
    IF NOT v_is_member THEN
      RAISE EXCEPTION 'decided_by has no active member in portfolio % department %', v_portfolio_id, v_functional_owner_department;
    END IF;
  END IF;

  v_digest_old := public.capability_row_digest(to_jsonb(v_row));

  PERFORM set_config('adpa.allow_capability_override_decision_write', 'on', true);

  IF p_decision = 'approved' THEN
    UPDATE public.capability_override_requests
    SET status = 'approved', approved_by = p_decided_by, approved_by_department = p_decided_by_department,
        decided_at = CURRENT_TIMESTAMP, override_expires_at = p_override_expires_at
    WHERE id = p_request_id;
  ELSIF p_decision = 'denied' THEN
    UPDATE public.capability_override_requests
    SET status = 'denied', approved_by = p_decided_by, approved_by_department = p_decided_by_department,
        decided_at = CURRENT_TIMESTAMP, denial_reason = p_reason
    WHERE id = p_request_id;
  ELSE
    UPDATE public.capability_override_requests
    SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;
  END IF;

  PERFORM set_config('adpa.allow_capability_override_decision_write', 'off', true);

  SELECT * INTO v_row FROM public.capability_override_requests WHERE id = p_request_id;
  v_digest_new := public.capability_row_digest(to_jsonb(v_row));

  INSERT INTO public.audit_log (table_name, row_id, action, actor_user_id, old_values, new_values)
  VALUES (
    'capability_override_requests', p_request_id, p_decision, p_decided_by,
    jsonb_build_object('digest', v_digest_old), jsonb_build_object('digest', v_digest_new)
  );
END;
$$;
