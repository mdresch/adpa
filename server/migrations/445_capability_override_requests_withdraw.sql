-- ADR-012 Action Item 6 (PR6a, additive): adds withdraw support and the
-- decide_capability_request stored procedure -- the single, eventual writer
-- of capability_override_requests.status for all three decisions (approved/
-- denied/withdrawn). This migration is purely additive: UPDATE stays granted
-- to the application role until PR6c, and markApproved()/markDenied() keep
-- calling their own direct UPDATEs until PR6b migrates them to this
-- procedure. Landing the procedure now, unused, lets PR6b/PR6c be small,
-- reviewable, single-purpose changes instead of one large one.

-- migration 440's capability_override_requests_status_check allows only
-- pending/approved/denied; withdrawn needs a fourth value. withdrawn_at is
-- its own column, not decided_at/approved_by -- migration 440's
-- capability_override_requests_distinct_approver CHECK
-- (approved_by IS DISTINCT FROM requested_by) forbids recording the
-- withdrawer in approved_by, and the withdrawer IS the requester by
-- definition, so overloading the decision columns isn't an option.
ALTER TABLE public.capability_override_requests
  DROP CONSTRAINT IF EXISTS capability_override_requests_status_check,
  ADD CONSTRAINT capability_override_requests_status_check
    CHECK (status IN ('pending', 'approved', 'denied', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

-- SECURITY DEFINER so this still works once PR6c revokes UPDATE from the
-- application role (a plain, non-SECURITY-DEFINER function would inherit
-- the caller's own privileges and fail the same way a bare UPDATE would).
-- search_path is pinned to prevent search_path hijacking, standard practice
-- for any SECURITY DEFINER function.
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
  v_is_member boolean;
  v_digest_old text;
  v_digest_new text;
BEGIN
  IF p_decision NOT IN ('approved', 'denied', 'withdrawn') THEN
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

  -- Withdraw: requester-only, department membership is irrelevant here --
  -- deliberately a narrower, different rule than approve/deny below (ADR-012 §B).
  IF p_decision = 'withdrawn' THEN
    IF p_decided_by IS DISTINCT FROM v_row.requested_by THEN
      RAISE EXCEPTION 'only the requester may withdraw request %', p_request_id;
    END IF;
  ELSE
    -- Approve/deny: same two-distinct-department-member rule the app layer
    -- already enforces (ADR-005 Phase 2 task 4), now also enforced here as
    -- defense in depth -- this procedure is meant to become the only writer,
    -- not a rubber stamp for whatever the app layer already decided.
    IF p_decided_by = v_row.requested_by THEN
      RAISE EXCEPTION 'the approver/denier must be a different person from the requester';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE user_id = p_decided_by AND portfolio_id = v_portfolio_id
        AND department = p_decided_by_department AND is_active = true
    ) INTO v_is_member;
    IF NOT v_is_member THEN
      RAISE EXCEPTION 'decided_by has no active member in portfolio % department %', v_portfolio_id, p_decided_by_department;
    END IF;
  END IF;

  -- Digest of the pre-decision row, per ADR-012 §D -- never the raw row content.
  v_digest_old := public.capability_row_digest(to_jsonb(v_row));

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

  SELECT * INTO v_row FROM public.capability_override_requests WHERE id = p_request_id;
  v_digest_new := public.capability_row_digest(to_jsonb(v_row));

  INSERT INTO public.audit_log (table_name, row_id, action, actor_user_id, old_values, new_values)
  VALUES (
    'capability_override_requests', p_request_id, p_decision, p_decided_by,
    jsonb_build_object('digest', v_digest_old), jsonb_build_object('digest', v_digest_new)
  );
END;
$$;
