/**
 * Break-Glass Timeout Escalation Job (ADR-005 Phase 3 task 6)
 *
 * A reviewer who simply never replies to a break-glass exception would
 * otherwise leave it open indefinitely with nothing to notice -- distinct
 * from an active decline (which the AFTER UPDATE OF decision trigger in
 * migration 441 disables immediately). This sweep finds
 * override_exception_reviews rows still decision IS NULL past a configurable
 * threshold (default 48h -- a business decision, not a hardcoded constant)
 * and escalates: notification only, does NOT force disabled the way an
 * active decline does, since silence isn't evidence of a problem the way a
 * decline is.
 *
 * Escalation notices name the specific outstanding reviewer_category, not a
 * generic "something needs attention" -- an unaddressed alert is not
 * actionable.
 *
 * Runs every 6 hours (finer than the 48h default threshold so an overdue
 * review isn't sitting unescalated for up to a full extra cycle).
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { CapabilityOverrideExceptionRepository } from '../modules/capabilityRegistry/CapabilityOverrideExceptionRepository'
import { notificationService } from '../services/notificationService'

const JOB_NAME = 'break-glass-escalation'

function getEscalationTimeoutHours(): number {
  const raw = process.env.BREAK_GLASS_ESCALATION_TIMEOUT_HOURS
  if (raw === undefined) return 48
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 48
}

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
    logger.error('[BREAK-GLASS-ESCALATION] Failed to record heartbeat', {
      error: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError)
    })
  }
}

export async function runBreakGlassEscalationSweep(): Promise<{ escalated: number }> {
  logger.info('[BREAK-GLASS-ESCALATION] Starting timeout-escalation sweep')
  const repository = new CapabilityOverrideExceptionRepository(pool)

  try {
    const timedOut = await repository.findTimedOutReviews(getEscalationTimeoutHours())

    if (timedOut.length === 0) {
      logger.info('[BREAK-GLASS-ESCALATION] No timed-out reviews found')
      await recordHeartbeat(true)
      return { escalated: 0 }
    }

    logger.warn('[BREAK-GLASS-ESCALATION] Timed-out reviews found', { count: timedOut.length })

    const byException = new Map<string, typeof timedOut>()
    for (const review of timedOut) {
      const existing = byException.get(review.exceptionId) ?? []
      existing.push(review)
      byException.set(review.exceptionId, existing)
    }

    for (const [exceptionId, reviews] of byException) {
      const outstandingCategories = reviews.map((r) => r.reviewerCategory).join(', ')
      try {
        const allReviews = await repository.listReviews(exceptionId)
        const userIds = allReviews.map((r) => r.reviewerUserId).filter((id): id is string => Boolean(id))
        if (userIds.length > 0) {
          const users = await pool.query(`SELECT email FROM users WHERE id = ANY($1)`, [userIds])
          if (users.rows.length > 0) {
            await notificationService.sendNotification({
              notification_type: 'capability_break_glass_escalation',
              reference_type: 'capability_override_exception',
              reference_id: exceptionId,
              recipients: users.rows.map((row) => ({ destination: row.email, channel: 'email' })),
              variables: {
                subject: 'Break-glass exception escalated: no reply past timeout',
                message: `The following reviewer categories have not replied to break-glass exception ${exceptionId}: ${outstandingCategories}.`
              },
              severity: 'critical'
            })
          }
        }
        await repository.markEscalated(reviews.map((r) => r.id))
        await repository.markExceptionEscalated(exceptionId)
      } catch (error) {
        logger.error('[BREAK-GLASS-ESCALATION] Failed to escalate exception', {
          exceptionId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    await recordHeartbeat(true)
    return { escalated: timedOut.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('[BREAK-GLASS-ESCALATION] Timeout-escalation sweep failed', { error: message })
    await recordHeartbeat(false, message)
    throw error
  }
}

export function scheduleBreakGlassEscalationSweep() {
  const INTERVAL = 6 * 60 * 60 * 1000 // 6 hours

  logger.info('[BREAK-GLASS-ESCALATION] Scheduling timeout-escalation sweep (every 6h)')

  runBreakGlassEscalationSweep().catch((err) => {
    logger.error('[BREAK-GLASS-ESCALATION] Initial timeout-escalation sweep failed', { err })
  })

  setInterval(() => {
    runBreakGlassEscalationSweep().catch((err) => {
      logger.error('[BREAK-GLASS-ESCALATION] Scheduled timeout-escalation sweep failed', { err })
    })
  }, INTERVAL)
}

/** Manual trigger (used by an admin API endpoint). */
export async function triggerBreakGlassEscalationSweep(): Promise<{ escalated: number }> {
  return await runBreakGlassEscalationSweep()
}
