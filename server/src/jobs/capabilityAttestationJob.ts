/**
 * Capability Attestation Lapse Job (ADR-005 Phase 3 task 5)
 *
 * Periodically scans capability_registry for active modules whose
 * attestation_due_at has passed and reverts them to pending_re_approval via
 * promote_capability_status -- the same enforced write path as any other
 * activation-status transition, not a special case.
 *
 * The override-expiry revert + 24h/12h warning half of task 5 is deferred (see
 * docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md):
 * nothing sets capability_activation_history.is_override yet (Phase 2 task 4 /
 * Phase 3 task 6 are both unbuilt), so there is nothing for that sweep to act on.
 *
 * Runs: Every hour (attestation cadence is quarterly by default -- see
 * getAttestationCadenceDays in capabilityRegistryReconciliation.ts -- so an
 * hourly poll is frequent enough without needing sub-hour precision).
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { findLapsedAttestations, CapabilityAttestationRow } from '../modules/capabilityRegistry/attestationLapseCheck'

export async function runCapabilityAttestationSweep() {
  logger.info('[CAPABILITY-ATTESTATION] Starting attestation-lapse sweep')

  try {
    const result = await pool.query<{ id: string; attestation_due_at: string | null; activation_status: string }>(
      `SELECT id, attestation_due_at, activation_status
       FROM capability_registry
       WHERE activation_status = 'active' AND attestation_due_at IS NOT NULL`
    )

    const rows: CapabilityAttestationRow[] = result.rows.map((row) => ({
      id: row.id,
      attestationDueAt: row.attestation_due_at,
      activationStatus: row.activation_status
    }))

    const lapsed = findLapsedAttestations(rows, new Date())

    if (lapsed.length === 0) {
      logger.info('[CAPABILITY-ATTESTATION] No lapsed attestations found')
      return { success: true, lapsed: 0 }
    }

    logger.warn('[CAPABILITY-ATTESTATION] Lapsed attestations found', { lapsedCount: lapsed.length })

    let reverted = 0
    for (const row of lapsed) {
      try {
        await pool.query(`SELECT promote_capability_status($1, 'pending_re_approval', NULL, $2)`, [
          row.id,
          'attestation lapsed'
        ])
        reverted++
        logger.info('[CAPABILITY-ATTESTATION] Reverted to pending_re_approval', { capabilityId: row.id })
      } catch (error) {
        logger.error('[CAPABILITY-ATTESTATION] Failed to revert capability on attestation lapse', {
          capabilityId: row.id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with other rows even if one fails
      }
    }

    return { success: true, lapsed: lapsed.length, reverted }
  } catch (error) {
    logger.error('[CAPABILITY-ATTESTATION] Attestation-lapse sweep failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export function scheduleCapabilityAttestationSweep() {
  const INTERVAL = 60 * 60 * 1000 // 1 hour

  logger.info('[CAPABILITY-ATTESTATION] Scheduling attestation-lapse sweep (hourly)')

  runCapabilityAttestationSweep().catch((err) => {
    logger.error('[CAPABILITY-ATTESTATION] Initial attestation-lapse sweep failed', { err })
  })

  setInterval(() => {
    runCapabilityAttestationSweep().catch((err) => {
      logger.error('[CAPABILITY-ATTESTATION] Scheduled attestation-lapse sweep failed', { err })
    })
  }, INTERVAL)
}

/** Manual trigger for the attestation-lapse sweep (used by an admin API endpoint). */
export async function triggerCapabilityAttestationSweep(): Promise<{
  success: boolean
  lapsed: number
  reverted?: number
}> {
  return await runCapabilityAttestationSweep()
}
