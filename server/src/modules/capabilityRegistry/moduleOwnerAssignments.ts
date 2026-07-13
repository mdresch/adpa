/**
 * ADR-005 Phase 7 (Action Item 8): the actual business decision Phase 1 task 3
 * deliberately deferred — which department owns each governed-features.manifest.json
 * packet. Confirmed with the ADR owner, not guessed: only packets that encode
 * business-domain policy (compliance standards, IP protection, template
 * content-quality gates) get a non-IT functional owner; every other packet here
 * is pure platform engineering with no separate accountable business department,
 * so IT is both platformOperator and functionalOwner for those — that's an honest
 * reflection of today's org reality, not a placeholder.
 *
 * Both `functional_owner_department` and `control_definition_owner_department` must
 * FK against the `departments` table (migration 434) — codes here must match exactly.
 *
 * Migration 438's one-time backfill CASE must stay in sync with this map by hand;
 * there is no single source of truth shared between SQL and TS for a one-time
 * data migration, so a future edit to this map does not retroactively change
 * already-migrated rows (correct — those are historical, use promote/reassignment
 * flows instead once one exists).
 */
export interface ModuleOwnerAssignment {
  functionalOwnerDepartment: string;
  controlDefinitionOwnerDepartment: string;
}

export const DEFAULT_OWNER_DEPARTMENT = 'IT';

export const MODULE_OWNER_DEPARTMENTS: Record<string, ModuleOwnerAssignment> = {
  compliance: { functionalOwnerDepartment: 'Compliance', controlDefinitionOwnerDepartment: 'Compliance' },
  'ip-governance': { functionalOwnerDepartment: 'Legal', controlDefinitionOwnerDepartment: 'Legal' },
  'template-lifecycle': { functionalOwnerDepartment: 'Compliance', controlDefinitionOwnerDepartment: 'Compliance' }
};

/** Every other manifest packet — rag, doc-gen, infrastructure, etc. — defaults to IT/IT. */
export function resolveModuleOwnerDepartments(moduleId: string): ModuleOwnerAssignment {
  const assignment = MODULE_OWNER_DEPARTMENTS[moduleId];
  return {
    functionalOwnerDepartment: assignment?.functionalOwnerDepartment ?? DEFAULT_OWNER_DEPARTMENT,
    controlDefinitionOwnerDepartment: assignment?.controlDefinitionOwnerDepartment ?? DEFAULT_OWNER_DEPARTMENT
  };
}
