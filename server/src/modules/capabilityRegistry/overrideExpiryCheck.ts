/**
 * Pure, DB-independent contract for the override-expiry half of ADR-005 Phase 3
 * task 5, deferred until something actually set capability_activation_history.is_override
 * -- Phase 2 task 4 is that something. Reverts an 'active' capability back to
 * pending_re_approval once its override lapses with no subsequent normal
 * approval, and dispatches idempotent 24h/12h pre-expiry warnings so a live
 * module doesn't go dark with no notice.
 */

export interface CapabilityOverrideRow {
  id: string;
  activationStatus: string;
  historyId: string;
  isOverride: boolean;
  overrideExpiresAt: Date | string | null;
  warned24hAt: Date | string | null;
  warned12hAt: Date | string | null;
  functionalOwnerDepartment: string | null;
}

export type OverrideExpiryAction = 'revert' | 'warn24h' | 'warn12h';

export interface OverrideExpiryDecision {
  capabilityId: string;
  historyId: string;
  functionalOwnerDepartment: string | null;
  action: OverrideExpiryAction;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Only ever looks at an 'active' capability's own is_override/override_expires_at
 * fields -- the caller is responsible for passing in each capability's LATEST
 * capability_activation_history row, since a subsequent normal (non-override)
 * approval would already have replaced it there and this function has no other
 * way to know a supersession happened.
 */
export function findOverrideExpiryActions(rows: CapabilityOverrideRow[], now: Date): OverrideExpiryDecision[] {
  const decisions: OverrideExpiryDecision[] = [];

  for (const row of rows) {
    if (row.activationStatus !== 'active' || !row.isOverride || !row.overrideExpiresAt) continue;

    const expiresAt = toDate(row.overrideExpiresAt);
    const base = { capabilityId: row.id, historyId: row.historyId, functionalOwnerDepartment: row.functionalOwnerDepartment };

    if (expiresAt.getTime() <= now.getTime()) {
      decisions.push({ ...base, action: 'revert' });
      continue;
    }

    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (hoursUntilExpiry <= 24 && !row.warned24hAt) {
      decisions.push({ ...base, action: 'warn24h' });
    } else if (hoursUntilExpiry <= 12 && !row.warned12hAt) {
      decisions.push({ ...base, action: 'warn12h' });
    }
  }

  return decisions;
}
