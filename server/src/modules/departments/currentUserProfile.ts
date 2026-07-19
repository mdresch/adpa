export interface CurrentUserDepartmentMembership {
  portfolioId: string;
  department: string;
  departmentRole: string;
}

export interface DepartmentMembershipDeps {
  listActiveDepartmentsByUser(userId: string): Promise<Array<{ portfolioId: string; department: string; departmentRole: string }>>;
}

/**
 * Shapes a user's active department memberships for HTTP-facing responses
 * (GET /api/v1/auth/me). Trusts deps.listActiveDepartmentsByUser to have
 * already filtered to active rows (UserDepartmentRepository.listByUser's
 * WHERE is_active = true) rather than re-filtering here.
 */
export async function resolveCurrentUserDepartments(
  userId: string,
  deps: DepartmentMembershipDeps
): Promise<CurrentUserDepartmentMembership[]> {
  const rows = await deps.listActiveDepartmentsByUser(userId);
  return rows.map((row) => ({
    portfolioId: row.portfolioId,
    department: row.department,
    departmentRole: row.departmentRole
  }));
}
