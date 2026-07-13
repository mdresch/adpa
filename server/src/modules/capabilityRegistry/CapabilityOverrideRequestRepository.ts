import { Pool } from 'pg';

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

/**
 * ADR-005 Phase 2 task 4: the two-distinct-department-member override request
 * this codebase's own Phase 6 docstring flagged as unbuilt. A request is
 * created by one active department member and must be approved or denied by
 * a DIFFERENT active department member (enforced both here at the app layer
 * and by the table's own CHECK constraint) — see CapabilityOverrideController.
 */
export class CapabilityOverrideRequestRepository {
  constructor(private pool: Pool) {}

  async create(params: {
    capabilityId: string;
    requestedNewStatus: string;
    dracoVerdictId: string | null;
    justification: string;
    requestedBy: string;
    requestedByDepartment: string;
  }): Promise<CapabilityOverrideRequestRow> {
    const result = await this.pool.query(
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
    return mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<CapabilityOverrideRequestRow | null> {
    const result = await this.pool.query(`SELECT * FROM capability_override_requests WHERE id = $1`, [id]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async markApproved(id: string, approvedBy: string, approvedByDepartment: string, overrideExpiresAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE capability_override_requests
       SET status = 'approved', approved_by = $2, approved_by_department = $3, decided_at = CURRENT_TIMESTAMP, override_expires_at = $4
       WHERE id = $1`,
      [id, approvedBy, approvedByDepartment, overrideExpiresAt]
    );
  }

  async markDenied(id: string, deniedBy: string, deniedByDepartment: string, denialReason: string): Promise<void> {
    await this.pool.query(
      `UPDATE capability_override_requests
       SET status = 'denied', approved_by = $2, approved_by_department = $3, decided_at = CURRENT_TIMESTAMP, denial_reason = $4
       WHERE id = $1`,
      [id, deniedBy, deniedByDepartment, denialReason]
    );
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
}
