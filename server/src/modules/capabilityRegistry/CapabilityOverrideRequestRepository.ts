import { Pool } from 'pg';
import { buildAdminOrActiveDepartmentMemberClause } from './departmentScopedQuery';
import { insertAuditLogDigest } from './auditLogCoverage';

export interface CapabilityOverrideRequestRow {
  id: string;
  capabilityId: string;
  requestedNewStatus: string;
  dracoVerdictId: string | null;
  justification: string;
  requestedBy: string;
  requestedByDepartment: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied' | 'withdrawn';
  approvedBy: string | null;
  approvedByDepartment: string | null;
  decidedAt: string | null;
  denialReason: string | null;
  overrideExpiresAt: string | null;
  withdrawnAt: string | null;
}

export interface PendingOverrideRequestRow extends CapabilityOverrideRequestRow {
  moduleId: string;
  portfolioId: string;
  /** ADR-012 PR8: the latest audit_log row for this request (create, or the decide_capability_request entry once decided) -- null only if PR3/PR6c's coverage guarantee has somehow been bypassed. */
  chainEntryId: string | null;
  chainRecordedAt: string | null;
}

function mapRow(row: any): CapabilityOverrideRequestRow {
  return {
    id: row.id,
    capabilityId: row.capability_id,
    requestedNewStatus: row.requested_new_status,
    dracoVerdictId: row.draco_verdict_id,
    justification: row.justification,
    requestedBy: row.requested_by,
    requestedByDepartment: row.requested_by_department,
    requestedAt: row.requested_at,
    status: row.status,
    approvedBy: row.approved_by,
    approvedByDepartment: row.approved_by_department,
    decidedAt: row.decided_at,
    denialReason: row.denial_reason,
    overrideExpiresAt: row.override_expires_at,
    withdrawnAt: row.withdrawn_at
  };
}

function mapPendingRow(row: any): PendingOverrideRequestRow {
  return {
    ...mapRow(row),
    moduleId: row.module_id,
    portfolioId: row.portfolio_id,
    chainEntryId: row.chain_entry_id ?? null,
    chainRecordedAt: row.chain_recorded_at ?? null
  };
}

/**
 * ADR-005 Phase 2 task 4: the two-distinct-department-member override request
 * this codebase's own Phase 6 docstring flagged as unbuilt. A request is
 * created by one active department member and must be approved or denied by
 * a DIFFERENT active department member (enforced both here at the app layer
 * and by the table's own CHECK constraint) — see CapabilityOverrideController.
 */
export class CapabilityOverrideRequestRepository {
  constructor(private pool: Pool) {}

  /**
   * ADR-012 Action Item 4: the request insert and its audit_log digest entry
   * land in one transaction on one client -- a request that exists in this
   * table but not in the hash chain is exactly the "coverage, not just
   * integrity" gap this Action Item closes. See auditLogCoverage.ts.
   */
  async create(params: {
    capabilityId: string;
    requestedNewStatus: string;
    dracoVerdictId: string | null;
    justification: string;
    requestedBy: string;
    requestedByDepartment: string;
  }): Promise<CapabilityOverrideRequestRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO capability_override_requests
           (capability_id, requested_new_status, draco_verdict_id, justification, requested_by, requested_by_department)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          params.capabilityId,
          params.requestedNewStatus,
          params.dracoVerdictId,
          params.justification,
          params.requestedBy,
          params.requestedByDepartment
        ]
      );
      const row = result.rows[0];
      await insertAuditLogDigest(client, {
        tableName: 'capability_override_requests',
        rowId: row.id,
        action: 'create',
        actorUserId: params.requestedBy,
        newRow: row
      });
      await client.query('COMMIT');
      return mapRow(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<CapabilityOverrideRequestRow | null> {
    const result = await this.pool.query(`SELECT * FROM capability_override_requests WHERE id = $1`, [id]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  /**
   * ADR-012 PR6b: delegates entirely to decide_capability_request (migration 445) --
   * the procedure performs its own UPDATE and its own audit_log insert atomically in
   * one DB call, so there's no TS-managed transaction or bare UPDATE left here to get
   * wrong. p_reason is NULL for an approval (this method never took a reason param).
   * The concurrency/locking fix PR3 (#742) added to this method's old direct-UPDATE
   * body is superseded, not lost -- decide_capability_request has always used
   * `SELECT ... FOR UPDATE` plus a `status <> 'pending'` check of its own (migration
   * 445), so the same protection exists one layer deeper now.
   *
   * Optional `runner` (review finding, PR #742/#744/#746/#748): `CapabilityOverrideController
   * .approve` calls `promote_capability_status` and this method as two separate
   * autocommit statements. If this call fails after the capability was already
   * promoted, or a concurrent `withdraw` decides the request between the two calls,
   * the capability transition and the request's own status can disagree -- an active
   * capability with a still-pending (or withdrawn) request behind it. The controller
   * now opens one client/transaction wrapping both calls and passes that client in
   * here so both writes commit or roll back together; a bare `repo.markApproved(...)`
   * with no fifth argument still works standalone (falls back to `this.pool`, its own
   * implicit transaction) for any caller that doesn't need cross-statement atomicity.
   *
   * (PR5's independent copy of this same fix -- markApproved's own transactional
   * SELECT/UPDATE shape with an `externalClient` parameter -- is superseded here, not
   * lost: PR6b already replaced that shape entirely with delegation to
   * `decide_capability_request`, which has its own `FOR UPDATE`/`status <> 'pending'`
   * protection one layer deeper. See PR5's own commit for why it needed an independent
   * fix in the first place: that branch doesn't descend from PR6a/PR6b.)
   */
  async markApproved(
    id: string,
    approvedBy: string,
    approvedByDepartment: string,
    overrideExpiresAt: Date,
    runner: Pick<Pool, 'query'> = this.pool
  ): Promise<void> {
    await runner.query(`SELECT decide_capability_request($1, 'approved', $2, $3, NULL, $4)`, [
      id,
      approvedBy,
      approvedByDepartment,
      overrideExpiresAt
    ]);
  }

  /** ADR-012 PR6b: same delegation as markApproved -- see that method's doc comment. */
  async markDenied(id: string, deniedBy: string, deniedByDepartment: string, denialReason: string): Promise<void> {
    await this.pool.query(`SELECT decide_capability_request($1, 'denied', $2, $3, $4, NULL)`, [
      id,
      deniedBy,
      deniedByDepartment,
      denialReason
    ]);
  }

  /**
   * ADR-012 PR6d: a symmetric counterpart to markApproved/markDenied -- also delegates
   * to decide_capability_request, which enforces requester-only authorization at the DB
   * layer (decided_by = requested_by, department membership irrelevant). The controller
   * still checks this itself first, to return a clean 403 instead of a raw DB exception --
   * see CapabilityOverrideController.withdraw.
   */
  async withdraw(id: string, requestedBy: string): Promise<void> {
    await this.pool.query(`SELECT decide_capability_request($1, 'withdrawn', $2, NULL, NULL, NULL)`, [id, requestedBy]);
  }

  /**
   * Feeds the override-expiry revert sweep (overrideExpiryCheck.ts /
   * capabilityAttestationJob.ts) — approved requests whose override has since
   * lapsed with no subsequent normal approval are handled there via
   * capability_activation_history directly, not via this table's own status,
   * which stays 'approved' as a historical record of the grant itself.
   */
  async listApproved(capabilityId: string): Promise<CapabilityOverrideRequestRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM capability_override_requests WHERE capability_id = $1 AND status = 'approved' ORDER BY decided_at DESC`,
      [capabilityId]
    );
    return result.rows.map(mapRow);
  }

  /**
   * Feeds the Approvals queue page. Scoped the same way the approve/deny
   * endpoints already are: an admin sees every pending request; a plain user
   * sees only requests raised against their OWN active department
   * memberships (never someone else's department, and never cross-portfolio
   * — matches this ADR's standing "portfolio_id and department, never
   * department name alone" rule).
   */
  async listPendingForUser(userId: string, isAdmin: boolean): Promise<PendingOverrideRequestRow[]> {
    const scopeClause = buildAdminOrActiveDepartmentMemberClause({
      portfolioColumn: 'cr.portfolio_id',
      departmentColumn: 'r.requested_by_department'
    });
    const result = await this.pool.query(
      `SELECT r.*, cr.module_id, cr.portfolio_id, chain.id AS chain_entry_id, chain.occurred_at AS chain_recorded_at
       FROM capability_override_requests r
       JOIN capability_registry cr ON cr.id = r.capability_id
       LEFT JOIN LATERAL (
         SELECT id, occurred_at FROM audit_log al
         WHERE al.table_name = 'capability_override_requests' AND al.row_id = r.id
         ORDER BY al.occurred_at DESC
         LIMIT 1
       ) chain ON true
       WHERE r.status = 'pending'
         AND ${scopeClause}
       ORDER BY r.requested_at ASC`,
      [isAdmin, userId]
    );
    return result.rows.map(mapPendingRow);
  }

  /**
   * ADR-012 PR6d: feeds the requester-facing My Requests view -- the caller's own
   * requests regardless of status (pending + decided-or-withdrawn), unlike
   * listPendingForUser above (which scopes to what OTHERS need to act on). Ordered
   * newest-first, matching a typical "my activity" view rather than the FIFO queue order
   * listPendingForUser uses for reviewers working through a backlog.
   */
  async listOwnRequests(userId: string): Promise<PendingOverrideRequestRow[]> {
    const result = await this.pool.query(
      `SELECT r.*, cr.module_id, cr.portfolio_id, chain.id AS chain_entry_id, chain.occurred_at AS chain_recorded_at
       FROM capability_override_requests r
       JOIN capability_registry cr ON cr.id = r.capability_id
       LEFT JOIN LATERAL (
         SELECT id, occurred_at FROM audit_log al
         WHERE al.table_name = 'capability_override_requests' AND al.row_id = r.id
         ORDER BY al.occurred_at DESC
         LIMIT 1
       ) chain ON true
       WHERE r.requested_by = $1
       ORDER BY r.requested_at DESC`,
      [userId]
    );
    return result.rows.map(mapPendingRow);
  }
}
