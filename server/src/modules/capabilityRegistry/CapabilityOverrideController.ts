import { Request, Response } from 'express';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
import { CapabilityOverrideRequestRepository } from './CapabilityOverrideRequestRepository';
import { UserDepartmentRepository } from '../departments/UserDepartmentRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

/** Configurable, per CLAUDE.md's env-var-not-hardcoded convention; matches Phase 4's own 72h test precedent as the default. */
function getOverrideWindowHours(): number {
  const raw = process.env.CAPABILITY_OVERRIDE_WINDOW_HOURS;
  if (raw === undefined) return 72;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
}

/**
 * ADR-005 Phase 2 task 4: TaskApprovalGate's override path, built Node-side
 * (see migration 440's header for why — Node, not the .NET orchestrator, is
 * capability_registry's sole write authority as of Phase 6). A second,
 * DISTINCT active department member must approve an override before
 * promote_capability_status is called with isOverride=true — closing the gap
 * CapabilityRegistryController.promote's own docstring already flagged.
 *
 * Deliberately no admin bypass on either step here, unlike the plain
 * promote endpoint — the entire point is two genuine department signatures.
 * If the department has fewer than two active members in this portfolio,
 * the approve step will always 403 for lack of a distinct member, which is
 * the intended funnel into Phase 3 task 6's break-glass path instead.
 */
export class CapabilityOverrideController {
  private capabilityRepository = new CapabilityRegistryRepository(pool);
  private overrideRequests = new CapabilityOverrideRequestRepository(pool);
  private userDepartments = new UserDepartmentRepository(pool);
  private logger = childLogger({ component: 'CapabilityOverrideController' });

  /**
   * Feeds the Governor Portal's Approvals queue. Unlike request/approve/deny
   * (scoped to one moduleId/portfolioId), this is a cross-capability list --
   * see CapabilityOverrideRequestRepository.listPendingForUser for the
   * admin-sees-all / member-sees-own-department scoping.
   */
  listPending = async (req: Request, res: Response) => {
    try {
      const requester = (req as any).user;
      const role = requester?.role?.toLowerCase();
      const isAdmin = role === 'admin' || role === 'super_admin';
      const pending = await this.overrideRequests.listPendingForUser(requester.id, isAdmin);
      res.json({ overrideRequests: pending });
    } catch (error) {
      this.logger.error('List pending override requests error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

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
        return res.status(403).json({ error: 'This module has no assigned functional owner department; override denied.' });
      }

      const requester = (req as any).user;
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

      const created = await this.overrideRequests.create({
        capabilityId: capability.id,
        requestedNewStatus,
        dracoVerdictId: dracoVerdictId ?? null,
        justification,
        requestedBy: requester.id,
        requestedByDepartment: capability.functionalOwnerDepartment
      });

      res.status(201).json({ overrideRequest: created });
    } catch (error) {
      this.logger.error('Create override request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  approve = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId, requestId } = req.params;

      const capability = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      if (!capability) {
        return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });
      }

      const overrideRequest = await this.overrideRequests.findById(requestId);
      if (!overrideRequest || overrideRequest.capabilityId !== capability.id) {
        return res.status(404).json({ error: 'override request not found', requestId });
      }
      if (overrideRequest.status !== 'pending') {
        return res.status(400).json({ error: `override request has already been decided (status: ${overrideRequest.status})` });
      }

      const approver = (req as any).user;
      if (approver.id === overrideRequest.requestedBy) {
        return res.status(403).json({ error: 'The approver must be a different person from the requester.' });
      }
      if (!capability.functionalOwnerDepartment) {
        return res.status(403).json({ error: 'This module has no assigned functional owner department; override denied.' });
      }
      const isMember = await this.userDepartments.isActiveMember(
        approver.id,
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

      const overrideExpiresAt = new Date(Date.now() + getOverrideWindowHours() * 60 * 60 * 1000);

      // Review finding (PR #742/#744/#746/#748): promote_capability_status and the
      // request's own decision were previously two separate autocommit statements --
      // a failure or a concurrent withdraw() between them could leave the capability
      // promoted with the request still pending/withdrawn. One client/transaction
      // wrapping both means either both commit or neither does; decide_capability_request
      // (inside markApproved) still locks the request row FOR UPDATE for the whole
      // transaction's duration, so a concurrent withdraw() blocks until this commits or
      // rolls back, then correctly fails on the now-decided row instead of racing it.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `SELECT promote_capability_status($1, $2, $3, $4, $5, $6, $7)`,
          [
            capability.id,
            overrideRequest.requestedNewStatus,
            approver.id,
            overrideRequest.justification,
            overrideRequest.dracoVerdictId,
            true,
            overrideExpiresAt
          ]
        );
        await this.overrideRequests.markApproved(
          requestId,
          approver.id,
          capability.functionalOwnerDepartment,
          overrideExpiresAt,
          client
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const updated = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      res.json({ capability: updated, overrideRequest: await this.overrideRequests.findById(requestId) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // "has already been decided"/"does not match this capability's functional owner
      // department" (review finding, PR #742/#744/#746/#748): now that both writes are
      // one transaction, a losing concurrent approve/withdraw surfaces here as a
      // decide_capability_request exception, not a distinct code path -- it's a real
      // conflict (someone else already decided this request), not a server fault, so
      // it belongs with the other known-rejection business-rule messages, not the
      // generic 500 catch-all below.
      const isKnownRejection = /illegal activation_status transition|requires a draco_verdict_id|does not reference an existing draco_reviews row|requires an override to activate|requires a non-empty justification|requires override_expires_at to be set|has no active member in portfolio|has already been decided|does not match this capability's functional owner department/.test(
        message
      );
      if (isKnownRejection) {
        this.logger.warn('Override approval rejected', { error: message });
        return res.status(400).json({ error: message });
      }
      this.logger.error('Approve override request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  deny = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId, requestId } = req.params;
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const capability = await this.capabilityRepository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      if (!capability) {
        return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });
      }

      const overrideRequest = await this.overrideRequests.findById(requestId);
      if (!overrideRequest || overrideRequest.capabilityId !== capability.id) {
        return res.status(404).json({ error: 'override request not found', requestId });
      }
      if (overrideRequest.status !== 'pending') {
        return res.status(400).json({ error: `override request has already been decided (status: ${overrideRequest.status})` });
      }

      const denier = (req as any).user;
      if (denier.id === overrideRequest.requestedBy) {
        return res.status(403).json({ error: 'The reviewer must be a different person from the requester.' });
      }
      if (!capability.functionalOwnerDepartment) {
        return res.status(403).json({ error: 'This module has no assigned functional owner department; override denied.' });
      }
      const isMember = await this.userDepartments.isActiveMember(
        denier.id,
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

      await this.overrideRequests.markDenied(requestId, denier.id, capability.functionalOwnerDepartment, reason);
      res.json({ overrideRequest: await this.overrideRequests.findById(requestId) });
    } catch (error) {
      this.logger.error('Deny override request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
