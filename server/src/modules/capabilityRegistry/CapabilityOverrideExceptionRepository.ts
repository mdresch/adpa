import { Pool } from 'pg';
import { ReviewerCandidate } from './buildReviewerSet';
import { insertAuditLogDigest } from './auditLogCoverage';

export interface CapabilityOverrideExceptionRow {
  id: string;
  capabilityId: string;
  requestedNewStatus: string;
  dracoVerdictId: string | null;
  justification: string;
  raisedBy: string;
  raisedAt: string;
  exceptionReviewStatus: 'pending' | 'active' | 'disabled' | 'escalated';
  activatedBy: string | null;
  activatedAt: string | null;
}

export interface OverrideExceptionReviewRow {
  id: string;
  exceptionId: string;
  reviewerCategory: string;
  reviewerUserId: string | null;
  reviewerLabel: string | null;
  decision: 'approved' | 'declined' | null;
  decidedAt: string | null;
  notes: string | null;
  escalatedAt: string | null;
  createdAt: string;
}

export interface PendingExceptionRow extends CapabilityOverrideExceptionRow {
  moduleId: string;
  portfolioId: string;
  reviews: OverrideExceptionReviewRow[];
}

function mapException(row: any): CapabilityOverrideExceptionRow {
  return {
    id: row.id,
    capabilityId: row.capability_id,
    requestedNewStatus: row.requested_new_status,
    dracoVerdictId: row.draco_verdict_id,
    justification: row.justification,
    raisedBy: row.raised_by,
    raisedAt: row.raised_at,
    exceptionReviewStatus: row.exception_review_status,
    activatedBy: row.activated_by,
    activatedAt: row.activated_at
  };
}

function mapReview(row: any): OverrideExceptionReviewRow {
  return {
    id: row.id,
    exceptionId: row.exception_id,
    reviewerCategory: row.reviewer_category,
    reviewerUserId: row.reviewer_user_id,
    reviewerLabel: row.reviewer_label,
    decision: row.decision,
    decidedAt: row.decided_at,
    notes: row.notes,
    escalatedAt: row.escalated_at,
    createdAt: row.created_at
  };
}

/**
 * ADR-005 Phase 3 task 6: the structural-deadlock break-glass substitute for
 * Phase 2 task 4's normal two-distinct-department-member override. The
 * deadlock precondition (department has <2 active members in this portfolio)
 * is enforced by a DB trigger on INSERT (migration 441), not re-checked here
 * — a Postgres exception on create() is the expected signal that the
 * deadlock condition wasn't met, surfaced by the controller as a 400.
 */
export class CapabilityOverrideExceptionRepository {
  constructor(private pool: Pool) {}

  /** ADR-012 Action Item 4: same transactional audit coverage as CapabilityOverrideRequestRepository.create() -- see auditLogCoverage.ts. */
  async createException(params: {
    capabilityId: string;
    requestedNewStatus: string;
    dracoVerdictId: string | null;
    justification: string;
    raisedBy: string;
  }): Promise<CapabilityOverrideExceptionRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO capability_override_exceptions
           (capability_id, requested_new_status, draco_verdict_id, justification, raised_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [params.capabilityId, params.requestedNewStatus, params.dracoVerdictId, params.justification, params.raisedBy]
      );
      const row = result.rows[0];
      await insertAuditLogDigest(client, {
        tableName: 'capability_override_exceptions',
        rowId: row.id,
        action: 'create',
        actorUserId: params.raisedBy,
        newRow: row
      });
      await client.query('COMMIT');
      return mapException(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addReviewers(exceptionId: string, reviewers: ReviewerCandidate[]): Promise<OverrideExceptionReviewRow[]> {
    const created: OverrideExceptionReviewRow[] = [];
    for (const reviewer of reviewers) {
      const result = await this.pool.query(
        `INSERT INTO override_exception_reviews (exception_id, reviewer_category, reviewer_user_id, reviewer_label)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [exceptionId, reviewer.category, reviewer.userId, reviewer.label]
      );
      created.push(mapReview(result.rows[0]));
    }
    return created;
  }

  async findExceptionById(id: string): Promise<CapabilityOverrideExceptionRow | null> {
    const result = await this.pool.query(`SELECT * FROM capability_override_exceptions WHERE id = $1`, [id]);
    return result.rows.length > 0 ? mapException(result.rows[0]) : null;
  }

  async listReviews(exceptionId: string): Promise<OverrideExceptionReviewRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM override_exception_reviews WHERE exception_id = $1 ORDER BY created_at ASC`,
      [exceptionId]
    );
    return result.rows.map(mapReview);
  }

  async findReviewById(id: string): Promise<OverrideExceptionReviewRow | null> {
    const result = await this.pool.query(`SELECT * FROM override_exception_reviews WHERE id = $1`, [id]);
    return result.rows.length > 0 ? mapReview(result.rows[0]) : null;
  }

  /**
   * The AFTER UPDATE OF decision trigger (migration 441) handles the disable+status
   * consequence on decline. ADR-012 Action Item 4: this update and its audit_log digest
   * entry now land in one transaction, same coverage as the request-side repository --
   * see auditLogCoverage.ts. actorUserId is the review's own reviewer_user_id (the
   * caller who may legitimately act on it is already enforced upstream by the
   * controller; this just records who).
   */
  async decideReview(id: string, decision: 'approved' | 'declined', notes: string | null): Promise<OverrideExceptionReviewRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query(`SELECT * FROM override_exception_reviews WHERE id = $1`, [id]);
      const result = await client.query(
        `UPDATE override_exception_reviews SET decision = $2, decided_at = CURRENT_TIMESTAMP, notes = $3 WHERE id = $1 RETURNING *`,
        [id, decision, notes]
      );
      const row = result.rows[0];
      await insertAuditLogDigest(client, {
        tableName: 'override_exception_reviews',
        rowId: id,
        action: decision,
        actorUserId: row?.reviewer_user_id ?? null,
        oldRow: before.rows[0],
        newRow: row
      });
      await client.query('COMMIT');
      return mapReview(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markActivated(exceptionId: string, activatedBy: string): Promise<void> {
    await this.pool.query(
      `UPDATE capability_override_exceptions
       SET exception_review_status = 'active', activated_by = $2, activated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [exceptionId, activatedBy]
    );
  }

  /** Feeds the timeout-escalation sweep — reviews with no decision past the configurable threshold, not yet escalated. */
  async findTimedOutReviews(thresholdHours: number): Promise<OverrideExceptionReviewRow[]> {
    const result = await this.pool.query(
      `SELECT r.* FROM override_exception_reviews r
       JOIN capability_override_exceptions e ON e.id = r.exception_id
       WHERE r.decision IS NULL
         AND r.escalated_at IS NULL
         AND r.created_at < CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         AND e.exception_review_status NOT IN ('disabled', 'active')`,
      [thresholdHours]
    );
    return result.rows.map(mapReview);
  }

  async markEscalated(reviewIds: string[]): Promise<void> {
    if (reviewIds.length === 0) return;
    await this.pool.query(`UPDATE override_exception_reviews SET escalated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [
      reviewIds
    ]);
  }

  async markExceptionEscalated(exceptionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE capability_override_exceptions SET exception_review_status = 'escalated'
       WHERE id = $1 AND exception_review_status = 'pending'`,
      [exceptionId]
    );
  }

  /**
   * Feeds the Approvals queue page. An admin sees every still-open exception
   * (pending or escalated -- disabled/active are resolved, not queue items
   * anymore); a plain user sees only exceptions where THEY are a named
   * reviewer with an undecided review row -- matches decideReview's own
   * authorization (only the assigned reviewer, or an Internal Audit member
   * proxying for external_auditor, may act on a review).
   */
  async listPendingForUser(userId: string, isAdmin: boolean): Promise<PendingExceptionRow[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT e.*, cr.module_id, cr.portfolio_id
       FROM capability_override_exceptions e
       JOIN capability_registry cr ON cr.id = e.capability_id
       WHERE e.exception_review_status IN ('pending', 'escalated')
         AND ($1::boolean = true OR EXISTS (
           SELECT 1 FROM override_exception_reviews rev
           WHERE rev.exception_id = e.id AND rev.reviewer_user_id = $2 AND rev.decision IS NULL
         ))
       ORDER BY e.raised_at ASC`,
      [isAdmin, userId]
    );

    const exceptions: PendingExceptionRow[] = [];
    for (const row of result.rows) {
      const reviews = await this.listReviews(row.id);
      exceptions.push({ ...mapException(row), moduleId: row.module_id, portfolioId: row.portfolio_id, reviews });
    }
    return exceptions;
  }

  /**
   * ADR-012 PR6d: feeds the requester-facing My Requests view -- the caller's own
   * exceptions regardless of status, read-only there (ADR-012 §B: withdraw covers
   * override requests only; the multi-reviewer exception lifecycle has no self-evident
   * "withdrawn" meaning once a reviewer has already decided).
   */
  async listOwnExceptions(userId: string): Promise<PendingExceptionRow[]> {
    const result = await this.pool.query(
      `SELECT e.*, cr.module_id, cr.portfolio_id
       FROM capability_override_exceptions e
       JOIN capability_registry cr ON cr.id = e.capability_id
       WHERE e.raised_by = $1
       ORDER BY e.raised_at DESC`,
      [userId]
    );

    const exceptions: PendingExceptionRow[] = [];
    for (const row of result.rows) {
      const reviews = await this.listReviews(row.id);
      exceptions.push({ ...mapException(row), moduleId: row.module_id, portfolioId: row.portfolio_id, reviews });
    }
    return exceptions;
  }
}
