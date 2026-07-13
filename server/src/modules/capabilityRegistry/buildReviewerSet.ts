/**
 * Pure, DB-independent contract for ADR-005 Phase 3 task 6's five reviewer
 * categories. A missing account_owner (companies.created_by IS NULL, per
 * Phase 0's deliberate non-backfill) or manager (escalation_manager_id,
 * brand new in this same phase, unset everywhere until assigned) degrades
 * gracefully — the request proceeds with whichever of the five categories
 * actually have someone to notify, rather than blocking break-glass entirely
 * for a portfolio with incomplete reviewer data (confirmed with the ADR
 * owner: a legacy company/portfolio must not be able to permanently block
 * its own emergency access).
 */

export type ReviewerCategory = 'account_owner' | 'manager' | 'internal_audit' | 'external_auditor' | 'super_admin';

export interface ReviewerCandidate {
  category: ReviewerCategory;
  userId: string | null;
  label: string | null;
}

export interface BuildReviewerSetInput {
  accountOwnerId: string | null;
  managerId: string | null;
  internalAuditUserIds: string[];
  externalAuditorContacts: { label: string }[];
  superAdminUserIds: string[];
}

export function buildReviewerSet(input: BuildReviewerSetInput): ReviewerCandidate[] {
  const reviewers: ReviewerCandidate[] = [];

  if (input.accountOwnerId) {
    reviewers.push({ category: 'account_owner', userId: input.accountOwnerId, label: null });
  }
  if (input.managerId) {
    reviewers.push({ category: 'manager', userId: input.managerId, label: null });
  }
  for (const userId of input.internalAuditUserIds) {
    reviewers.push({ category: 'internal_audit', userId, label: null });
  }
  for (const contact of input.externalAuditorContacts) {
    reviewers.push({ category: 'external_auditor', userId: null, label: contact.label });
  }
  for (const userId of input.superAdminUserIds) {
    reviewers.push({ category: 'super_admin', userId, label: null });
  }

  return reviewers;
}
