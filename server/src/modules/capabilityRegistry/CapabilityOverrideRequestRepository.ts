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
  status: 'pending' | 'approved' | 'denied';
  approvedBy: string | null;
  approvedByDepartment: string | null;
  decidedAt: string | null;
  denialReason: string | null;
  overrideExpiresAt: string | null;
}

export interface PendingOverrideRequestRow extends CapabilityOverrideRequestRow {
  moduleId: string;
  portfolioId: string;
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
    overrideExpiresAt: row.override_expires_at
  };
}

function mapPendingRow(row: any): PendingOverrideRequestRow {
  return { ...mapRow(row), moduleId: row.module_id, portfolioId: row.portfolio_id };
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

  /** ADR-012 Action Item 4: same transactional audit coverage as create() -- see auditLogCoverage.ts. */
  async markApproved(id: string, approvedBy: string, approvedByDepartment: string, overrideExpiresAt: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query(`SELECT * FROM capability_override_requests WHERE id = $1`, [id]);
      const result = await client.query(
        `UPDATE capability_override_requests
         SET status = 'approved', approved_by = $2, approved_by_department = $3, decided_at = CURRENT_TIMESTAMP, override_expires_at = $4
         WHERE id = $1
         RETURNING *`,
        [id, approvedBy, approvedByDepartment, overrideExpiresAt]
      );
      await insertAuditLogDigest(client, {
        tableName: 'capability_override_requests',
        rowId: id,
        action: 'approve',
        actorUserId: approvedBy,
        oldRow: before.rows[0],
        newRow: result.rows[0]
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** ADR-012 Action Item 4: same transactional audit coverage as create() -- see auditLogCoverage.ts. */
  async markDenied(id: string, deniedBy: string, deniedByDepartment: string, denialReason: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query(`SELECT * FROM capability_override_requests WHERE id = $1`, [id]);
      const result = await client.query(
        `UPDATE capability_override_requests
         SET status = 'denied', approved_by = $2, approved_by_department = $3, decided_at = CURRENT_TIMESTAMP, denial_reason = $4
         WHERE id = $1
         RETURNING *`,
        [id, deniedBy, deniedByDepartment, denialReason]
      );
      await insertAuditLogDigest(client, {
        tableName: 'capability_override_requests',
        rowId: id,
        action: 'deny',
        actorUserId: deniedBy,
        oldRow: before.rows[0],
        newRow: result.rows[0]
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      `SELECT r.*, cr.module_id, cr.portfolio_id
       FROM capability_override_requests r
       JOIN capability_registry cr ON cr.id = r.capability_id
       WHERE r.status = 'pending'
         AND ${scopeClause}
       ORDER BY r.requested_at ASC`,
      [isAdmin, userId]
    );
    return result.rows.map(mapPendingRow);
  }
}
