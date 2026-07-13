import { Request, Response } from 'express';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
import { CapabilityOverrideExceptionRepository } from './CapabilityOverrideExceptionRepository';
import { UserDepartmentRepository } from '../departments/UserDepartmentRepository';
import { buildReviewerSet } from './buildReviewerSet';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import { notificationService } from '../../services/notificationService';

function getOverrideWindowHours(): number {
  const raw = process.env.CAPABILITY_OVERRIDE_WINDOW_HOURS;
  if (raw === undefined) return 72;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
}

/** Deliberately not hardcoded -- which law-enforcement/fraud/integrity body applies is a legal decision, not an engineering one. */
function getExternalEscalationContacts(): { label: string }[] {
  const raw = process.env.BREAK_GLASS_ESCALATION_CONTACTS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c?.label === 'string') : [];
  } catch {
    return [];
  }
}

function isAdmin(user: any): boolean {
  const role = user?.role?.toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * ADR-005 Phase 3 task 6: structural-deadlock break-glass, the substitute for
 * Phase 2 task 4's normal override when the target department has fewer than
 * two active members in the capability's own portfolio. Request-then-pickup:
 * raising a request never itself activates anything (confirmed against the
 * reference org's actual break-glass-intervention-request.js behavior, which
 * only ever creates a ticket) -- only a Super Admin's own explicit pickup via
 * `activate` fires promote_capability_status.
 */
export class CapabilityOverrideExceptionController {
  private capabilityRepository = new CapabilityRegistryRepository(pool);
  private exceptions = new CapabilityOverrideExceptionRepository(pool);
  private userDepartments = new UserDepartmentRepository(pool);
  private logger = childLogger({ component: 'CapabilityOverrideExceptionController' });

  request = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId } = req.params;
      const { requestedNewStatus, justification, dracoVerdictId } = req.body;

      if (!requestedNewStatus || typeof requestedNewStatus !== 'string') {
        return res.status(400).json({ error: 'requestedNewStatus is required' });
      }
      if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
        return res.status(400).json({ error: 'justification is required' });
      }

      const capability = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      if (!capability) {
        return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });
      }
      if (!capability.functionalOwnerDepartment) {
        return res.status(403).json({ error: 'This module has no assigned functional owner department; break-glass denied.' });
      }

      const requester = (req as any).user;
      if (!isAdmin(requester)) {
        const isMember = await this.userDepartments.isActiveMember(
          requester.id,
          capability.portfolioId,
          capability.functionalOwnerDepartment
        );
        if (!isMember) {
          return res.status(403).json({
            error: 'You are not an active member of this module\'s functional owner department for this portfolio.',
            requiredDepartment: capability.functionalOwnerDepartment,
            requiredPortfolioId: capability.portfolioId
          });
        }
      }

      // Gather the five reviewer categories. Missing account_owner/manager
      // degrade gracefully (confirmed with the ADR owner) -- see buildReviewerSet.ts.
      const [companyRow, portfolioRow, internalAuditRows, superAdminRows] = await Promise.all([
        pool.query(
          `SELECT c.created_by FROM companies c JOIN portfolio_governance pg ON pg.company_id = c.id WHERE pg.id = $1`,
          [capability.portfolioId]
        ),
        pool.query(`SELECT escalation_manager_id, external_auditor_contacts FROM portfolio_governance WHERE id = $1`, [
          capability.portfolioId
        ]),
        pool.query(
          `SELECT user_id FROM user_departments WHERE department = 'Internal Audit' AND portfolio_id = $1 AND is_active = true`,
          [capability.portfolioId]
        ),
        pool.query(`SELECT id FROM users WHERE lower(role) IN ('super_admin', 'admin')`)
      ]);

      const reviewerSet = buildReviewerSet({
        accountOwnerId: companyRow.rows[0]?.created_by ?? null,
        managerId: portfolioRow.rows[0]?.escalation_manager_id ?? null,
        internalAuditUserIds: internalAuditRows.rows.map((r) => r.user_id),
        externalAuditorContacts: Array.isArray(portfolioRow.rows[0]?.external_auditor_contacts)
          ? portfolioRow.rows[0].external_auditor_contacts
          : [],
        superAdminUserIds: superAdminRows.rows.map((r) => r.id)
      });

      let exception;
      try {
        exception = await this.exceptions.createException({
          capabilityId: capability.id,
          requestedNewStatus,
          dracoVerdictId: dracoVerdictId ?? null,
          justification,
          raisedBy: requester.id
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/break-glass is only for a structural deadlock/.test(message)) {
          return res.status(400).json({ error: message });
        }
        throw error;
      }

      const reviews = await this.exceptions.addReviewers(exception.id, reviewerSet);

      await this.notifyReviewers(reviews, 'Break-glass exception raised', `A break-glass activation request was raised for capability ${capability.id}: ${justification}`);

      res.status(201).json({ exception, reviews });
    } catch (error) {
      this.logger.error('Create override exception error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  decide = async (req: Request, res: Response) => {
    try {
      const { exceptionId, reviewId } = req.params;
      const { decision, notes } = req.body;

      if (decision !== 'approved' && decision !== 'declined') {
        return res.status(400).json({ error: "decision must be 'approved' or 'declined'" });
      }

      const exception = await this.exceptions.findExceptionById(exceptionId);
      if (!exception) {
        return res.status(404).json({ error: 'override exception not found', exceptionId });
      }
      const review = await this.exceptions.findReviewById(reviewId);
      if (!review || review.exceptionId !== exceptionId) {
        return res.status(404).json({ error: 'override exception review not found', reviewId });
      }
      if (review.decision !== null) {
        return res.status(400).json({ error: `this review has already been decided (decision: ${review.decision})` });
      }

      const caller = (req as any).user;
      const isSelf = review.reviewerUserId === caller.id;
      let isInternalAuditProxyForExternal = false;
      if (review.reviewerCategory === 'external_auditor') {
        const capabilityRow = await pool.query(`SELECT portfolio_id FROM capability_registry WHERE id = $1`, [
          exception.capabilityId
        ]);
        const portfolioId = capabilityRow.rows[0]?.portfolio_id;
        isInternalAuditProxyForExternal = portfolioId
          ? await this.userDepartments.isActiveMember(caller.id, portfolioId, 'Internal Audit')
          : false;
      }

      // external_auditor has no ADPA account -- an Internal Audit member may record on their behalf (per the plan).
      if (!isSelf && review.reviewerCategory !== 'external_auditor') {
        return res.status(403).json({ error: 'Only the assigned reviewer may record this decision.' });
      }
      if (review.reviewerCategory === 'external_auditor' && !isInternalAuditProxyForExternal) {
        return res.status(403).json({
          error: 'An external_auditor decision must be recorded by an active Internal Audit member on their behalf.'
        });
      }

      const updated = await this.exceptions.decideReview(reviewId, decision, notes ?? null);

      if (decision === 'declined') {
        const allReviews = await this.exceptions.listReviews(exceptionId);
        const externalContacts = getExternalEscalationContacts();
        await this.notifyReviewers(
          allReviews,
          'Break-glass exception declined',
          `Reviewer category "${review.reviewerCategory}" declined the break-glass request for capability ${exception.capabilityId}. The module has been disabled.`
        );
        if (externalContacts.length > 0) {
          this.logger.warn('Break-glass declined -- external escalation contacts configured but delivery channel not implemented', {
            exceptionId,
            externalContacts
          });
        }
      }

      const refreshedException = await this.exceptions.findExceptionById(exceptionId);
      res.json({ exception: refreshedException, review: updated });
    } catch (error) {
      this.logger.error('Decide override exception review error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  activate = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId, exceptionId } = req.params;

      const caller = (req as any).user;
      if (!isAdmin(caller)) {
        return res.status(403).json({ error: 'Only a Super Admin may pick up and activate a break-glass exception.' });
      }

      const capability = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      if (!capability) {
        return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });
      }

      const exception = await this.exceptions.findExceptionById(exceptionId);
      if (!exception || exception.capabilityId !== capability.id) {
        return res.status(404).json({ error: 'override exception not found', exceptionId });
      }
      if (exception.exceptionReviewStatus === 'active' || exception.exceptionReviewStatus === 'disabled') {
        return res.status(400).json({
          error: `this exception cannot be activated (status: ${exception.exceptionReviewStatus})`
        });
      }

      const overrideExpiresAt = new Date(Date.now() + getOverrideWindowHours() * 60 * 60 * 1000);

      // p_bypass_deadlock_gate=true: break-glass exists specifically for the
      // department-has-fewer-than-two-active-members case (Phase 7 task 3's
      // own deadlock), including zero members -- Phase 7's normal active-member
      // gate must not also apply here, or break-glass could never activate the
      // exact scenario it exists to handle. Reachable only from this endpoint,
      // itself already gated to super_admin/admin above.
      await pool.query(`SELECT promote_capability_status($1, $2, $3, $4, $5, $6, $7, $8)`, [
        capability.id,
        exception.requestedNewStatus,
        caller.id,
        `break-glass activation: ${exception.justification}`,
        exception.dracoVerdictId,
        true,
        overrideExpiresAt,
        true
      ]);

      await this.exceptions.markActivated(exceptionId, caller.id);

      const updatedCapability = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      res.json({ capability: updatedCapability, exception: await this.exceptions.findExceptionById(exceptionId) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isKnownRejection = /illegal activation_status transition|requires a draco_verdict_id|does not reference an existing draco_reviews row|requires an override to activate|requires a non-empty justification|requires override_expires_at to be set|has no active member in portfolio/.test(
        message
      );
      if (isKnownRejection) {
        this.logger.warn('Break-glass activation rejected', { error: message });
        return res.status(400).json({ error: message });
      }
      this.logger.error('Activate override exception error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private async notifyReviewers(
    reviews: { reviewerUserId: string | null; reviewerLabel: string | null }[],
    subject: string,
    message: string
  ): Promise<void> {
    const userIds = reviews.map((r) => r.reviewerUserId).filter((id): id is string => Boolean(id));
    if (userIds.length === 0) return;
    try {
      const users = await pool.query(`SELECT email FROM users WHERE id = ANY($1)`, [userIds]);
      if (users.rows.length === 0) return;
      await notificationService.sendNotification({
        notification_type: 'capability_break_glass_exception',
        reference_type: 'capability_override_exception',
        reference_id: 'break-glass',
        recipients: users.rows.map((row) => ({ destination: row.email, channel: 'email' })),
        variables: { subject, message },
        severity: 'critical'
      });
    } catch (error) {
      this.logger.error('Failed to notify break-glass reviewers', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
