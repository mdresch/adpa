-- ADR-005 Federated Capability Ownership -- Phase 2 task 4: TaskApprovalGate's
-- override path, closing the gap Phase 6 explicitly documented and deferred
-- ("this endpoint mechanically accepts isOverride/overrideExpiresAt but
-- doesn't authorize them"). Built entirely Node-side, not in the .NET
-- orchestrator: promote_capability_status, user_departments, and users all
-- live here, so a genuine two-distinct-department-member override needs no
-- cross-tier hop. This is a deliberate correction of the implementation
-- plan's literal text ("TaskApprovalGate... override path") -- that text
-- predates Phase 6, which established Node as capability_registry's sole
-- write authority; the orchestrator's TaskApprovalGate protects a different,
-- older ritual concept (BusinessCase/RtmAmendment) with no connection to
-- capability_registry at all (confirmed: zero references to
-- CapabilityRegistryClient.PromoteAsync anywhere in TaskApprovalGate.cs or
-- its callers).
--
-- Two-step, two-distinct-caller flow (request, then approve/deny by a
-- DIFFERENT active department member), mirroring this codebase's own
-- rtm_amendments propose/decide precedent -- a single HTTP request cannot
-- prove two distinct real identities, only two separately-authenticated
-- requests can.

CREATE TABLE IF NOT EXISTS public.capability_override_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capability_id uuid NOT NULL REFERENCES public.capability_registry(id),
  requested_new_status varchar(30) NOT NULL,
  draco_verdict_id uuid REFERENCES public.draco_reviews(id),
  justification text NOT NULL,
  requested_by uuid NOT NULL REFERENCES public.users(id),
  requested_by_department varchar(50) NOT NULL REFERENCES public.departments(code),
  requested_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  status varchar(20) NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.users(id),
  approved_by_department varchar(50) REFERENCES public.departments(code),
  decided_at timestamptz,
  denial_reason text,
  override_expires_at timestamptz,
  CONSTRAINT capability_override_requests_status_check
    CHECK (status IN ('pending', 'approved', 'denied')),
  -- Defense in depth: the app layer checks this too (Phase 2 task 4's whole
  -- point), but a DB-level guarantee means a future code path can't
  -- accidentally let someone approve their own request.
  CONSTRAINT capability_override_requests_distinct_approver
    CHECK (approved_by IS DISTINCT FROM requested_by)
);
CREATE INDEX IF NOT EXISTS idx_capability_override_requests_capability
  ON public.capability_override_requests(capability_id);
CREATE INDEX IF NOT EXISTS idx_capability_override_requests_status
  ON public.capability_override_requests(status) WHERE status = 'pending';
