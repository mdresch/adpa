/**
 * REQ-DEPT-011: turns a single `user_departments` row change into a claims
 * sync enqueue. Always recomputes from the user's full active-row set — a
 * payload built from only the changed row would silently drop every other
 * membership the next time claims sync.
 */
import { UserDepartmentRow, buildDepartmentClaims, shouldRevokeRefreshTokens } from './departmentClaims';
import { enqueueClaimsSyncJob, ClaimsSyncDb, ClaimsSyncQueue } from './departmentClaimsSyncJob';

export interface MembershipChangeDeps {
  db: ClaimsSyncDb;
  queue: ClaimsSyncQueue;
}

export interface MembershipChangeInput {
  userId: string;
  wasActive: boolean;
  isActive: boolean;
}

export async function syncDepartmentMembershipChange(
  deps: MembershipChangeDeps,
  input: MembershipChangeInput
): Promise<{ id: string }> {
  const result = await deps.db.query(
    `SELECT user_id, portfolio_id, department, department_role, is_active
     FROM user_departments
     WHERE user_id = $1 AND is_active = true`,
    [input.userId]
  );

  const rows: UserDepartmentRow[] = result.rows
    .filter((row) => row.is_active)
    .map((row) => ({
      userId: row.user_id,
      portfolioId: row.portfolio_id,
      department: row.department,
      departmentRole: row.department_role,
      isActive: row.is_active
    }));

  const claims = buildDepartmentClaims(rows);
  const isRemoval = shouldRevokeRefreshTokens({ wasActive: input.wasActive, isActive: input.isActive });

  return enqueueClaimsSyncJob(deps, { userId: input.userId, claims, isRemoval });
}
