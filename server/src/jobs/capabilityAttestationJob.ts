/**
 * Capability Attestation Lapse Job (ADR-005 Phase 3 task 5)
 *
 * Periodically scans capability_registry for active modules whose
 * attestation_due_at has passed and reverts them to pending_re_approval via
 * promote_capability_status -- the same enforced write path as any other
 * activation-status transition, not a special case.
 *
 * ADR-005 Phase 2 task 4 note: the override-expiry revert + 24h/12h warning
 * half of task 5 was deferred until something actually set
 * capability_activation_history.is_override -- Phase 2 task 4's two-distinct-
 * department-member override path is that something, so this same job now
 * also runs that sweep (runOverrideExpirySweep below), per the plan's own
 * "the same job also finds..." framing -- not a separate scheduled job.
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
import { findOverrideExpiryActions, CapabilityOverrideRow } from '../modules/capabilityRegistry/overrideExpiryCheck'
import { findStaleJobs, JobHeartbeatRow } from '../modules/capabilityRegistry/jobLivenessCheck'
import { notificationService } from '../services/notificationService'
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

async function notifyDepartment(department: string | null, subject: string, message: string): Promise<void> {
  if (!department) return
  try {
    const members = await pool.query<{ email: string }>(
      `SELECT DISTINCT u.email
       FROM user_departments ud
       JOIN users u ON u.id = ud.user_id
       WHERE ud.department = $1 AND ud.is_active = true`,
      [department]
    )
    if (members.rows.length === 0) return

    await notificationService.sendNotification({
      notification_type: 'capability_override_expiry',
      reference_type: 'capability_registry',
      reference_id: department,
      recipients: members.rows.map((row) => ({ destination: row.email, channel: 'email' })),
      variables: { subject, message },
      severity: 'warning'
    })
  } catch (error) {
    logger.error('[CAPABILITY-ATTESTATION] Failed to notify department of override expiry', {
      department,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * ADR-005 Phase 2 task 4 / Phase 3 task 5's deferred half: reverts an 'active'
 * capability whose override has lapsed with no subsequent normal approval,
 * and dispatches idempotent 24h/12h pre-expiry warnings (tracked via
 * capability_activation_history.warned_24h_at/warned_12h_at so a job running
 * more often than the warning cadence doesn't re-send the same warning).
 */
export async function runOverrideExpirySweep(): Promise<{ reverted: number; warned24h: number; warned12h: number }> {
  const result = await pool.query<{
    id: string
    activation_status: string
    functional_owner_department: string | null
    history_id: string
    is_override: boolean
    override_expires_at: string | null
    warned_24h_at: string | null
    warned_12h_at: string | null
  }>(`
    SELECT cr.id, cr.activation_status, cr.functional_owner_department,
           h.id AS history_id, h.is_override, h.override_expires_at, h.warned_24h_at, h.warned_12h_at
    FROM capability_registry cr
    JOIN LATERAL (
      SELECT id, is_override, override_expires_at, warned_24h_at, warned_12h_at
      FROM capability_activation_history
      WHERE capability_id = cr.id
      ORDER BY changed_at DESC
      LIMIT 1
    ) h ON true
    WHERE cr.activation_status = 'active'
  `)

  const rows: CapabilityOverrideRow[] = result.rows.map((row) => ({
    id: row.id,
    activationStatus: row.activation_status,
    historyId: row.history_id,
    isOverride: row.is_override,
    overrideExpiresAt: row.override_expires_at,
    warned24hAt: row.warned_24h_at,
    warned12hAt: row.warned_12h_at,
    functionalOwnerDepartment: row.functional_owner_department
  }))

  const actions = findOverrideExpiryActions(rows, new Date())
  let reverted = 0
  let warned24h = 0
  let warned12h = 0

  for (const action of actions) {
    try {
      if (action.action === 'revert') {
        await pool.query(`SELECT promote_capability_status($1, 'pending_re_approval', NULL, $2)`, [
          action.capabilityId,
          'override expired with no subsequent normal approval'
        ])
        reverted++
        logger.warn('[CAPABILITY-ATTESTATION] Reverted expired override to pending_re_approval', {
          capabilityId: action.capabilityId
        })
        await notifyDepartment(
          action.functionalOwnerDepartment,
          'Capability override expired',
          `Capability ${action.capabilityId} was reverted to pending_re_approval: its emergency override expired with no subsequent normal approval.`
        )
      } else if (action.action === 'warn24h') {
        await pool.query(`UPDATE capability_activation_history SET warned_24h_at = CURRENT_TIMESTAMP WHERE id = $1`, [
          action.historyId
        ])
        warned24h++
        await notifyDepartment(
          action.functionalOwnerDepartment,
          'Capability override expiring in 24 hours',
          `Capability ${action.capabilityId}'s emergency override expires within 24 hours. A normal approval must replace it or the module will revert to pending_re_approval.`
        )
      } else if (action.action === 'warn12h') {
        await pool.query(`UPDATE capability_activation_history SET warned_12h_at = CURRENT_TIMESTAMP WHERE id = $1`, [
          action.historyId
        ])
        warned12h++
        await notifyDepartment(
          action.functionalOwnerDepartment,
          'Capability override expiring in 12 hours',
          `Capability ${action.capabilityId}'s emergency override expires within 12 hours. A normal approval must replace it or the module will revert to pending_re_approval.`
        )
      }
    } catch (error) {
      logger.error('[CAPABILITY-ATTESTATION] Failed to process override-expiry action', {
        capabilityId: action.capabilityId,
        action: action.action,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return { reverted, warned24h, warned12h }
}

export async function runCapabilityAttestationSweep() {
  logger.info('[CAPABILITY-ATTESTATION] Starting attestation-lapse + override-expiry sweep')
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

    let reverted = 0
    if (lapsed.length > 0) {
      logger.warn('[CAPABILITY-ATTESTATION] Lapsed attestations found', { lapsedCount: lapsed.length })
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
    } else {
      logger.info('[CAPABILITY-ATTESTATION] No lapsed attestations found')
    }

    // Independent of the attestation-lapse sweep above -- always runs, not
    // gated on whether any attestation happened to be lapsed this tick.
    const overrideExpiry = await runOverrideExpirySweep()

    await recordHeartbeat(true)
    return { success: true, lapsed: lapsed.length, reverted, overrideExpiry }
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
