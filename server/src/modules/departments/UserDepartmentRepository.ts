import { Pool } from 'pg';
import { childLogger } from '../../utils/logger';

export interface UserDepartmentDbRow {
  id: string;
  userId: string;
  portfolioId: string;
  department: string;
  departmentRole: string;
  isActive: boolean;
}

export interface CreateUserDepartmentInput {
  userId: string;
  portfolioId: string;
  department: string;
  departmentRole?: string;
}

export interface SetActiveResult {
  wasActive: boolean;
  isActive: boolean;
  row: UserDepartmentDbRow;
}

function mapRow(row: any): UserDepartmentDbRow {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioId: row.portfolio_id,
    department: row.department,
    departmentRole: row.department_role,
    isActive: row.is_active
  };
}

/**
 * CRUD accessor for user_departments (ADR-005 Phase 0). The one write path
 * (create/setActive) that actually exercises the "on insert/update/deactivate"
 * trigger point the implementation plan's Phase 0 task 2 requires — see
 * UserDepartmentsController, which calls syncDepartmentMembershipChange after
 * every write here.
 */
export class UserDepartmentRepository {
  private logger = childLogger({ component: 'UserDepartmentRepository' });

  constructor(private pool: Pool) {}

  async listByPortfolio(portfolioId: string): Promise<UserDepartmentDbRow[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, portfolio_id, department, department_role, is_active
       FROM user_departments
       WHERE portfolio_id = $1 AND is_active = true
       ORDER BY department, department_role`,
      [portfolioId]
    );
    return result.rows.map(mapRow);
  }

  /**
   * ADR-005 Phase 6: the authorization check that makes department membership
   * meaningful for capability activation specifically -- distinct from
   * TaskApprovalGate's own membership check (orchestrator-side, gates the
   * older BusinessCase/RtmAmendment JIT approval concept, not
   * capability_registry). Scoped by portfolio_id, never department name alone.
   */
  async isActiveMember(userId: string, portfolioId: string, department: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM user_departments
       WHERE user_id = $1 AND portfolio_id = $2 AND department = $3 AND is_active = true
       LIMIT 1`,
      [userId, portfolioId, department]
    );
    return result.rows.length > 0;
  }

  async listByUser(userId: string): Promise<UserDepartmentDbRow[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, portfolio_id, department, department_role, is_active
       FROM user_departments
       WHERE user_id = $1 AND is_active = true
       ORDER BY department, department_role`,
      [userId]
    );
    return result.rows.map(mapRow);
  }

  async create(input: CreateUserDepartmentInput): Promise<UserDepartmentDbRow> {
    const result = await this.pool.query(
      `INSERT INTO user_departments (user_id, portfolio_id, department, department_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, portfolio_id, department, department_role, is_active`,
      [input.userId, input.portfolioId, input.department, input.departmentRole ?? 'member']
    );
    return mapRow(result.rows[0]);
  }

  /**
   * Runs inside a transaction with SELECT ... FOR UPDATE so the caller gets the
   * true before/after transition, not just the requested new value —
   * syncDepartmentMembershipChange needs wasActive to decide whether this is a
   * removal (which must revoke refresh tokens) or a no-op re-activation.
   */
  async setActive(id: string, isActive: boolean): Promise<SetActiveResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT is_active FROM user_departments WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (current.rows.length === 0) {
        throw new Error(`user_departments row not found: ${id}`);
      }
      const wasActive: boolean = current.rows[0].is_active;
      const updated = await client.query(
        `UPDATE user_departments
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, user_id, portfolio_id, department, department_role, is_active`,
        [isActive, id]
      );
      await client.query('COMMIT');
      return { wasActive, isActive, row: mapRow(updated.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('setActive transaction failed', { id, error });
      throw error;
    } finally {
      client.release();
    }
  }
}
