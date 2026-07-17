-- ADR-012 Action Item 4: retroactive audit_log hash-chain coverage for
-- capability_override_requests/capability_override_exceptions writes that
-- were previously bare, untransacted INSERT/UPDATEs with no audit_log
-- participation at all (CapabilityOverrideRequestRepository.create/
-- markApproved/markDenied, CapabilityOverrideExceptionRepository.
-- createException/decideReview). No schema change to either table -- this
-- migration only adds the digest function both this PR's Node-side writes
-- and PR6's future decide_capability_request stored procedure will call,
-- so the canonicalization algorithm exists in exactly one place, not
-- reimplemented once in TypeScript and once in plpgsql.
--
-- Digest, not raw content (ADR-012 §D, hard requirement): audit_log's
-- old_values/new_values for these writes carries {"digest": "<sha256
-- hex>"}, never the raw justification text or requester identity -- those
-- stay solely in the access-controlled capability_override_requests/
-- capability_override_exceptions rows. Postgres's jsonb::text output is
-- already canonical (keys sorted, whitespace-normalized) regardless of the
-- input object's original key order, so no separate "sort keys" step is
-- needed beyond casting through jsonb -- IMMUTABLE is honest here because
-- jsonb text serialization is a pure function of the input value.

CREATE OR REPLACE FUNCTION public.capability_row_digest(p_row jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT encode(digest(p_row::text, 'sha256'), 'hex')
$function$;
