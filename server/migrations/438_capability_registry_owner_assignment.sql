-- ADR-005 Federated Capability Ownership -- Phase 7 (Action Item 8), owner
-- assignment backfill. Phase 1 task 3 deliberately left functional_owner_department/
-- control_definition_owner_department null on every existing capability_registry
-- row ("a business decision, never guessed"). This migration is that decision,
-- confirmed with the ADR owner: only packets that encode business-domain policy
-- (compliance standards, IP protection, template content-quality gates) get a
-- non-IT functional owner; every other governed-features.manifest.json packet
-- today is pure platform engineering with no separate accountable business
-- department, so it gets IT -- an honest reflection of current org reality, not
-- a placeholder. Must stay in sync by hand with
-- server/src/modules/capabilityRegistry/moduleOwnerAssignments.ts, which is what
-- every *new* row goes through from here on (seedCapabilityRegistry.ts); this
-- migration only backfills rows that already existed before that map existed.
--
-- One-time data migration: only touches rows still null, never overwrites an
-- owner someone may have assigned by hand since Phase 1 shipped.

UPDATE public.capability_registry
SET
  functional_owner_department = CASE module_id
    WHEN 'compliance' THEN 'Compliance'
    WHEN 'ip-governance' THEN 'Legal'
    WHEN 'template-lifecycle' THEN 'Compliance'
    ELSE 'IT'
  END,
  control_definition_owner_department = CASE module_id
    WHEN 'compliance' THEN 'Compliance'
    WHEN 'ip-governance' THEN 'Legal'
    WHEN 'template-lifecycle' THEN 'Compliance'
    ELSE 'IT'
  END,
  functional_owner_assigned_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE functional_owner_department IS NULL;
