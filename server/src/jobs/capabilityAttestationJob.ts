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
 *
 * Also records its own heartbeat and cross-checks
 * capability-activation-reconciliation's liveness on every tick (ADR-005
 * Phase 5 task 4: "the reconciliation job needs its own liveness
 * monitoring") -- an already-running job checking a different job's
 * heartbeat, rather than a third scheduled job whose own liveness would then
 * need monitoring too.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { findLapsedAttestations, CapabilityAttestationRow } from '../modules/capabilityRegistry/attestationLapseCheck'
import { findStaleJobs, JobHeartbeatRow } from '../modules/capabilityRegistry/jobLivenessCheck'
import {
  CAPABILITY_ACTIVATION_RECONCILIATION_JOB_NAME,
  CAPABILITY_ACTIVATION_RECONCILIATION_INTERVAL_MS
} from './capabilityActivationReconciliationJob'

const JOB_NAME = 'capability-attestation'

async function recordHeartbeat(success: boolean, error?: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO scheduled_job_heartbeats (job_name, last_run_at, last_success_at, last_error, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (job_name) DO UPDATE SET
         last_run_at = CURRENT_TIMESTAMP,
         last_success_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE scheduled_job_heartbeats.last_success_at END,
         last_error = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [JOB_NAME, success, error ?? null]
    )
  } catch (heartbeatError) {
    logger.error('[CAPABILITY-ATTESTATION] Failed to record heartbeat', {
      error: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError)
    })
  }
}

async function checkReconciliationJobLiveness(): Promise<void> {
  try {
    const result = await pool.query<{ job_name: string; last_success_at: string | null }>(
      `SELECT job_name, last_success_at FROM scheduled_job_heartbeats WHERE job_name = $1`,
      [CAPABILITY_ACTIVATION_RECONCILIATION_JOB_NAME]
    )
    const heartbeats: JobHeartbeatRow[] = result.rows.map((row) => ({
      jobName: row.job_name,
      lastSuccessAt: row.last_success_at
    }))

    const stale = findStaleJobs(
      heartbeats,
      [{ jobName: CAPABILITY_ACTIVATION_RECONCILIATION_JOB_NAME, expectedIntervalMs: CAPABILITY_ACTIVATION_RECONCILIATION_INTERVAL_MS }],
      new Date()
    )

    if (stale.length > 0) {
      logger.error('[CAPABILITY-ATTESTATION] capability-activation-reconciliation job appears stale', {
        stale
      })
    }
  } catch (error) {
    logger.error('[CAPABILITY-ATTESTATION] Failed to check reconciliation job liveness', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export async function runCapabilityAttestationSweep() {
  logger.info('[CAPABILITY-ATTESTATION] Starting attestation-lapse sweep')
  await checkReconciliationJobLiveness()

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
      await recordHeartbeat(true)
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

    await recordHeartbeat(true)
    return { success: true, lapsed: lapsed.length, reverted }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('[CAPABILITY-ATTESTATION] Attestation-lapse sweep failed', { error: message })
    await recordHeartbeat(false, message)
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
