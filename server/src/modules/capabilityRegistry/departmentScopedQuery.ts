export interface DepartmentMembershipScopeColumns {
  /** Column expression (with table alias) identifying the row's portfolio_id, e.g. "cr.portfolio_id". */
  portfolioColumn: string;
  /** Column expression identifying the department to check membership against, e.g. "r.requested_by_department". */
  departmentColumn: string;
}

/**
 * SQL fragment: "admin/super_admin sees everything; a plain user sees only rows scoped
 * to a department they're an active member of". Extracted from
 * CapabilityOverrideRequestRepository.listPendingForUser (ADR-012 Action Item 2) so the
 * capability-registry list endpoint (ADR-012 Action Item 3 / PR4) can reuse the same
 * decision against a different column pair, instead of a third inline copy.
 *
 * The caller's query must bind $1 = isAdmin (boolean), $2 = userId, in that order -- this
 * fragment does not renumber or introduce its own parameters. `portfolioColumn`/
 * `departmentColumn` are always literal, developer-supplied SQL identifiers (never
 * request input), the same trust level as every other hardcoded column reference in this
 * module's queries.
 *
 * Deliberately NOT a consumer for exceptions/pending: CapabilityOverrideExceptionRepository.
 * listPendingForUser authorizes by named-reviewer-assignment (a row in
 * override_exception_reviews), an unrelated mechanism with no department check at all --
 * see ADR-012 §A's corrected note.
 */
export function buildAdminOrActiveDepartmentMemberClause(columns: DepartmentMembershipScopeColumns): string {
  return `($1::boolean = true OR EXISTS (
        SELECT 1 FROM user_departments ud
        WHERE ud.user_id = $2 AND ud.portfolio_id = ${columns.portfolioColumn}
          AND ud.department = ${columns.departmentColumn} AND ud.is_active = true
      ))`;
}
