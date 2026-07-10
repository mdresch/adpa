/**
 * Pure, DB-independent contract for the capability ownership registry (ADR-005 Phase 1).
 * See docs/superpowers/specs/2026-07-10-federated-capability-ownership-phase1-design.md
 * and .agents/skills/adpa-capability-registry/SKILL.md.
 */

export interface CapabilityRegistryRow {
  moduleId: string;
  portfolioId: string;
}

export interface CapabilityRegistryRowInsert extends CapabilityRegistryRow {
  platformOperator: string;
  functionalOwnerType: string;
  functionalOwnerDepartment: string | null;
  controlDefinitionOwnerDepartment: string | null;
}

export interface ReconciliationInput {
  manifestModuleIds: string[];
  portfolioIds: string[];
  existingRows: CapabilityRegistryRow[];
}

export interface ReconciliationResult {
  missingRows: CapabilityRegistryRow[];
  orphanedRows: CapabilityRegistryRow[];
}

function rowKey(row: CapabilityRegistryRow): string {
  return `${row.moduleId}::${row.portfolioId}`;
}

/**
 * REQ-CAP-001/002/003: computes the (module_id, portfolio_id) cross product from the current
 * manifest and portfolio set, reporting missing rows (in the cross product, not in the existing
 * set) and orphaned rows (in the existing set, not in the cross product) — both directions of
 * drift, never conflated.
 */
export function reconcileCapabilityRegistry(input: ReconciliationInput): ReconciliationResult {
  const { manifestModuleIds, portfolioIds, existingRows } = input;

  const validKeys = new Set<string>();
  const missingRows: CapabilityRegistryRow[] = [];
  const existingKeys = new Set(existingRows.map(rowKey));

  for (const moduleId of manifestModuleIds) {
    for (const portfolioId of portfolioIds) {
      const row = { moduleId, portfolioId };
      validKeys.add(rowKey(row));
      if (!existingKeys.has(rowKey(row))) {
        missingRows.push(row);
      }
    }
  }

  const orphanedRows = existingRows.filter((row) => !validKeys.has(rowKey(row)));

  return { missingRows, orphanedRows };
}

/**
 * REQ-CAP-004: applies Phase 1's documented defaults. Owner-department fields are never guessed
 * — they stay null until a business decision assigns them (see implementation plan Phase 1 task 3).
 */
export function buildCapabilityRegistryRow(
  moduleId: string,
  portfolioId: string,
  overrides: Partial<
    Pick<
      CapabilityRegistryRowInsert,
      'platformOperator' | 'functionalOwnerType' | 'functionalOwnerDepartment' | 'controlDefinitionOwnerDepartment'
    >
  > = {}
): CapabilityRegistryRowInsert {
  return {
    moduleId,
    portfolioId,
    platformOperator: overrides.platformOperator ?? 'IT',
    functionalOwnerType: overrides.functionalOwnerType ?? 'department',
    functionalOwnerDepartment: overrides.functionalOwnerDepartment ?? null,
    controlDefinitionOwnerDepartment: overrides.controlDefinitionOwnerDepartment ?? null
  };
}

/** Quarterly, per the implementation plan's Phase 1 task 4 example cadence. */
export const DEFAULT_ATTESTATION_CADENCE_DAYS = 90;

/** REQ-CAP-005: cadence is configuration, never a hardcoded literal at a call site. */
export function getAttestationCadenceDays(): number {
  const raw = process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS;
  if (raw === undefined) return DEFAULT_ATTESTATION_CADENCE_DAYS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ATTESTATION_CADENCE_DAYS;

  return parsed;
}
