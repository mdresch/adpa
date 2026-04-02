/**
 * DRACO Progress Emitter
 * A singleton EventEmitter that enables real-time progress streaming
 * from the board review pipeline to SSE clients.
 *
 * Each event carries a human-readable message designed for end users —
 * not technical status codes. The goal is to convey that complex,
 * parallel multi-role work is underway without requiring the reader
 * to understand what each role is doing internally.
 */

import { EventEmitter } from 'events'

// ─── Event Types ──────────────────────────────────────────────────────────────

export type DracoProgressPhase =
  | 'convening'              // Board is being assembled, providers assigned
  | 'board_member_started'   // An individual board member has begun deliberating
  | 'board_member_slow'      // A board member is taking longer than the warning threshold
  | 'board_member_complete'  // A board member has finished and has a score
  | 'board_member_timed_out' // A board member exceeded max wait; fallback score applied
  | 'strategic_started'      // Strategic assessor has started
  | 'strategic_complete'     // Strategic assessment finished
  | 'verdict_rendering'      // All inputs gathered, producing final verdict
  | 'complete'               // Review is done
  | 'failed'                 // Something went wrong (non-blocking)

export interface DracoProgressEvent {
  type: DracoProgressPhase
  documentId: string
  /** Human-readable message suitable for direct display to end users */
  message: string
  /** 0–100 progress indicator */
  progress_percent: number
  /** Board role identifier if this event is role-specific */
  board_role?: string
  /** Score revealed once a board member completes */
  score?: number
  /** Provider that handled this step */
  provider?: string
  /** Whether the score passed its threshold */
  passed?: boolean
  timestamp: string
}

// ─── Progress Messages (user-facing copy) ────────────────────────────────────
// These deliberately avoid technical jargon.
// The implicit message is: multiple independent specialists are working on this in parallel.

export const PROGRESS_MESSAGES: Record<string, string> = {
  convening:                     'Convening the Review Board — assigning independent reviewers…',
  evidence_validator_started:    'Evidence Validator is examining every factual claim in your document…',
  governance_evaluator_started:  'Governance Evaluator is checking compliance and regulatory requirements…',
  counterfactual_challenger_started: 'Counterfactual Challenger is stress-testing your document\'s core assumptions…',
  strategic_started:             'Strategic Assessor is evaluating alignment with project objectives…',
  evidence_validator_complete:   'Evidence Validator — deliberation complete',
  governance_evaluator_complete: 'Governance Evaluator — deliberation complete',
  counterfactual_challenger_complete: 'Counterfactual Challenger — deliberation complete',
  strategic_complete:            'Strategic Assessor — assessment complete',
  verdict_rendering:             'The Board is reaching a verdict — reviewing all findings in deliberation…',
  complete_pass:                 'Review Board concluded — document approved',
  complete_conditional:          'Review Board concluded — document approved with recommendations',
  complete_reject:               'Review Board concluded — board concerns raised for review',
  failed:                        'One or more board members encountered an issue — partial results available',
  // Slow / timeout messages — informative, not alarmist
  board_member_slow:             'One reviewer is taking longer than expected — others continue in parallel',
  board_member_timed_out:        'A reviewer reached the time limit — a conservative interim score has been applied',
}

// ─── Progress Percentages by Phase ───────────────────────────────────────────

export const PHASE_PROGRESS: Record<DracoProgressPhase, number> = {
  convening:               5,
  board_member_started:    15,  // 15–45 spread across three members
  board_member_slow:       40,  // slow signal doesn't change progress position
  board_member_complete:   50,  // up to 75 as members complete
  board_member_timed_out:  50,  // timeout still counts as completing the step
  strategic_started:       60,
  strategic_complete:      80,
  verdict_rendering:       88,
  complete:               100,
  failed:                 100,
}

// ─── Singleton Emitter ────────────────────────────────────────────────────────

class DracoProgressEmitter extends EventEmitter {
  /**
   * Emit a progress event for a specific document review.
   * Listeners are keyed by documentId so multiple concurrent reviews
   * don't cross-contaminate each other's streams.
   */
  emitProgress(documentId: string, event: DracoProgressEvent): void {
    this.emit(`draco:${documentId}`, event)
  }

  /**
   * Subscribe to progress events for a specific document review.
   */
  onProgress(documentId: string, listener: (event: DracoProgressEvent) => void): this {
    return this.on(`draco:${documentId}`, listener)
  }

  /**
   * Unsubscribe from progress events for a specific document review.
   */
  offProgress(documentId: string, listener: (event: DracoProgressEvent) => void): this {
    return this.off(`draco:${documentId}`, listener)
  }

  /**
   * Convenience: emit a board member started event
   */
  emitBoardMemberStarted(documentId: string, role: string, provider: string, roleProgress: number): void {
    const messageKey = `${role}_started`
    this.emitProgress(documentId, {
      type: 'board_member_started',
      documentId,
      message: PROGRESS_MESSAGES[messageKey] ?? `${role.replace(/_/g, ' ')} is reviewing your document…`,
      progress_percent: roleProgress,
      board_role: role,
      provider,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: emit a board member slow warning.
   * Used when a board member exceeds the slow-warning threshold but is still running.
   * The message is informative, not alarmist — other board members continue independently.
   */
  emitBoardMemberSlow(documentId: string, role: string, provider: string, elapsedMs: number): void {
    this.emitProgress(documentId, {
      type: 'board_member_slow',
      documentId,
      message: PROGRESS_MESSAGES.board_member_slow,
      progress_percent: PHASE_PROGRESS.board_member_slow,
      board_role: role,
      provider,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: emit a board member timed-out event.
   * Used when a board member exceeds the hard timeout and a fallback score was applied.
   * The conservative fallback score is noted to the user — not hidden.
   */
  emitBoardMemberTimedOut(documentId: string, role: string, provider: string): void {
    this.emitProgress(documentId, {
      type: 'board_member_timed_out',
      documentId,
      message: PROGRESS_MESSAGES.board_member_timed_out,
      progress_percent: PHASE_PROGRESS.board_member_timed_out,
      board_role: role,
      provider,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience: emit a board member complete event
   */
  emitBoardMemberComplete(
    documentId: string,
    role: string,
    provider: string,
    score: number,
    passed: boolean,
    progressPercent: number,
    timedOut = false
  ): void {
    const messageKey = `${role}_complete`
    this.emitProgress(documentId, {
      type: timedOut ? 'board_member_timed_out' : 'board_member_complete',
      documentId,
      message: timedOut
        ? PROGRESS_MESSAGES.board_member_timed_out
        : (PROGRESS_MESSAGES[messageKey] ?? `${role.replace(/_/g, ' ')} — deliberation complete`),
      progress_percent: progressPercent,
      board_role: role,
      provider,
      score,
      passed,
      timestamp: new Date().toISOString(),
    })
  }
}

export const dracoProgressEmitter = new DracoProgressEmitter()

// Allow up to 200 concurrent SSE listeners (one per connected document viewer)
dracoProgressEmitter.setMaxListeners(200)
