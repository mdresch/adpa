/**
 * Pure, DB-independent contract for the attestation-lapse sweep (ADR-005 Phase 3
 * task 5's attestation-lapse half; the override-expiry half is deferred -- see
 * docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md).
 */

export interface CapabilityAttestationRow {
  id: string;
  attestationDueAt: Date | string | null;
  activationStatus: string;
}

/**
 * A row is lapsed when it has a due date in the past and isn't already in a
 * status where re-flagging it would be redundant or wrong: pending_re_approval
 * already reflects the lapse, disabled means the module isn't live to lapse,
 * and draft/pending_department_approval haven't reached 'active' yet -- there's
 * nothing to revert from.
 */
export function findLapsedAttestations(
  rows: CapabilityAttestationRow[],
  now: Date
): CapabilityAttestationRow[] {
  return rows.filter((row) => {
    if (!row.attestationDueAt) return false;
    if (row.activationStatus !== 'active') return false;

    const dueAt = row.attestationDueAt instanceof Date ? row.attestationDueAt : new Date(row.attestationDueAt);
    return dueAt.getTime() < now.getTime();
  });
}
