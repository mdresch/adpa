/**
 * Pure, DB-independent contract for department identity (ADR-005 Phase 0).
 * See docs/superpowers/specs/2026-07-09-federated-capability-ownership-phase0-design.md
 * and .agents/skills/adpa-federated-capability-ownership/SKILL.md.
 */

export const SEED_DEPARTMENT_CODES = [
  'IT',
  'Compliance',
  'Legal',
  'Finance',
  'HR',
  'Risk',
  'Internal Audit'
] as const;

export type DepartmentCode = (typeof SEED_DEPARTMENT_CODES)[number];

export interface UserDepartmentRow {
  userId: string;
  portfolioId: string;
  department: string;
  departmentRole: string;
  isActive: boolean;
}

export interface DepartmentClaim {
  portfolioId: string;
  department: string;
  role: string;
}

export interface DepartmentMembershipTransition {
  wasActive: boolean;
  isActive: boolean;
}

/** REQ-DEPT-001: reject any department code outside the fixed seed list. Case-sensitive. */
export function isValidDepartmentCode(code: string): code is DepartmentCode {
  return (SEED_DEPARTMENT_CODES as readonly string[]).includes(code);
}

/**
 * REQ-DEPT-002: one claim entry per active row, carrying portfolioId alongside
 * department/role — never a deactivated row, never department alone.
 */
export function buildDepartmentClaims(rows: UserDepartmentRow[]): DepartmentClaim[] {
  return rows
    .filter((row) => row.isActive)
    .map((row) => ({
      portfolioId: row.portfolioId,
      department: row.department,
      role: row.departmentRole
    }));
}

/** REQ-DEPT-003: revoke only on an active -> inactive transition (removal). */
export function shouldRevokeRefreshTokens(transition: DepartmentMembershipTransition): boolean {
  return transition.wasActive && !transition.isActive;
}
