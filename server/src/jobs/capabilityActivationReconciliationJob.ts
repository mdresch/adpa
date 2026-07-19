/**
 * Capability Activation History Reconciliation Job (ADR-005 Phase 5 task 3,
 * presence-check half)
 *
 * Independent detective control, not a substitute for migration 437's
 * append-only lockdown on capability_activation_history: prevention (the
 * lockdown trigger) and detection (this job) are deliberately redundant --
 * a permission model can have a hole neither of us has thought of yet, and
 * this job is what would catch it in practice instead of in theory.
 *
 * Compares every capability_registry row's activation_status against the
 * new_status recorded by its most recent capability_activation_history row,
 * flagging any mismatch (including an active/pending/disabled row with no
 * history row at all -- only 'draft' with no history is expected).
 *
 * The content-hash-vs-config_snapshot_hash half of task 3 is deferred (see
 * docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase5-design.md):
 * config_snapshot_hash is never populated by anything today (no module has
 * real config/control content, same wall Phase 3/4 hit).
 *
 * Runs: Every 30 minutes.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { reconcileActivationHistory, CapabilityStatusRow } from '../modules/capabilityRegistry/activationHistoryReconciliation'

const JOB_NAME = 'capability-activation-reconciliation'

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
    logger.error('[CAPABILITY-RECONCILIATION] Failed to record heartbeat', {
      error: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError)
    })
  }
}

export async function runCapabilityActivationReconciliation() {
  logger.info('[CAPABILITY-RECONCILIATION] Starting activation-history reconciliation sweep')

  try {
    const registryResult = await pool.query<{ id: string; activation_status: string }>(
      `SELECT id, activation_status FROM capability_registry`
    )
    const capabilities: CapabilityStatusRow[] = registryResult.rows.map((row) => ({
      id: row.id,
      activationStatus: row.activation_status
    }))

    const historyResult = await pool.query<{ capability_id: string; new_status: string }>(
      `SELECT DISTINCT ON (capability_id) capability_id, new_status
       FROM capability_activation_history
       ORDER BY capability_id, changed_at DESC`
    )
    const latestHistoryStatusByCapabilityId = new Map(
      historyResult.rows.map((row) => [row.capability_id, row.new_status])
    )

    const drifted = reconcileActivationHistory(capabilities, latestHistoryStatusByCapabilityId)

    if (drifted.length === 0) {
      logger.info('[CAPABILITY-RECONCILIATION] No drift detected')
      await recordHeartbeat(true)
      return { success: true, driftedCount: 0 }
    }

    logger.warn('[CAPABILITY-RECONCILIATION] Activation-history drift detected', {
      driftedCount: drifted.length,
      drifted
    })

    await recordHeartbeat(true)
    return { success: true, driftedCount: drifted.length, drifted }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('[CAPABILITY-RECONCILIATION] Reconciliation sweep failed', { error: message })
    await recordHeartbeat(false, message)
    throw error
  }
}

export function scheduleCapabilityActivationReconciliation() {
  const INTERVAL = 30 * 60 * 1000 // 30 minutes

  logger.info('[CAPABILITY-RECONCILIATION] Scheduling activation-history reconciliation sweep (every 30 minutes)')

  runCapabilityActivationReconciliation().catch((err) => {
    logger.error('[CAPABILITY-RECONCILIATION] Initial reconciliation sweep failed', { err })
  })

  setInterval(() => {
    runCapabilityActivationReconciliation().catch((err) => {
      logger.error('[CAPABILITY-RECONCILIATION] Scheduled reconciliation sweep failed', { err })
    })
  }, INTERVAL)
}

/** Manual trigger for the reconciliation sweep (used by an admin API endpoint). */
export async function triggerCapabilityActivationReconciliation() {
  return await runCapabilityActivationReconciliation()
}

export const CAPABILITY_ACTIVATION_RECONCILIATION_JOB_NAME = JOB_NAME
export const CAPABILITY_ACTIVATION_RECONCILIATION_INTERVAL_MS = 30 * 60 * 1000
