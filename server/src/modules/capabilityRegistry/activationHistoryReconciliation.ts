/**
 * Pure, DB-independent contract for the activation-history reconciliation
 * sweep (ADR-005 Phase 5 task 3, presence-check half only -- the
 * content-hash-vs-config_snapshot_hash half is deferred, see
 * docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase5-design.md).
 *
 * Detects capability_registry rows whose activation_status doesn't match
 * what capability_activation_history's most recent transition recorded --
 * the case a permission model can miss (a hole neither prevention layer
 * anticipated) and hash-chaining alone would never catch, since hash-chaining
 * only proves recorded entries weren't altered, not that every consequential
 * change produced one.
 */

export interface CapabilityStatusRow {
  id: string;
  activationStatus: string;
}

export interface ActivationHistoryDrift {
  capabilityId: string;
  registryStatus: string;
  latestHistoryStatus: string | null;
}

/**
 * `latestHistoryStatusByCapabilityId` maps capability_registry.id to the
 * `new_status` of its most recent capability_activation_history row (or is
 * simply absent for a capability with no history at all).
 */
export function reconcileActivationHistory(
  capabilities: CapabilityStatusRow[],
  latestHistoryStatusByCapabilityId: Map<string, string>
): ActivationHistoryDrift[] {
  const drifted: ActivationHistoryDrift[] = [];

  for (const capability of capabilities) {
    const latestHistoryStatus = latestHistoryStatusByCapabilityId.get(capability.id) ?? null;

    // A 'draft' capability with no history row is expected -- it has never
    // been promoted, so there's nothing to have recorded yet.
    if (capability.activationStatus === 'draft' && latestHistoryStatus === null) {
      continue;
    }

    if (latestHistoryStatus !== capability.activationStatus) {
      drifted.push({
        capabilityId: capability.id,
        registryStatus: capability.activationStatus,
        latestHistoryStatus
      });
    }
  }

  return drifted;
}
