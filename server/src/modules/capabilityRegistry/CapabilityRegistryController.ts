import { Request, Response } from 'express';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
import { UserDepartmentRepository } from '../departments/UserDepartmentRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

/**
 * Internal, read-only lookup consumed by the .NET orchestrator's TaskApprovalGate
 * (ADR-005 Phase 2) — the orchestrator's governance-ledger DB is a separate Postgres
 * database and has no other way to resolve a module's declared functional owner.
 * Not authenticated (no user JWT available on a service-to-service call); matches the
 * existing no-auth-header convention already used by the orchestrator's other typed
 * HttpClients (GovernanceApiClient, IntelligenceClient) — trust is via the internal
 * network boundary, same as those.
 */
export class CapabilityRegistryController {
  private repository = new CapabilityRegistryRepository(pool);
  private userDepartments = new UserDepartmentRepository(pool);
  private logger = childLogger({ component: 'CapabilityRegistryController' });

  getByModuleAndPortfolio = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId } = req.params;
      const row = await this.repository.findByModuleAndPortfolio(moduleId, portfolioId);
      if (!row) return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });

      res.json({ capability: row });
    } catch (error) {
      this.logger.error('Get capability registry row error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * ADR-005 Phase 6: the first human-triggerable path to promote_capability_status
   * anywhere in the codebase — previously the only caller at all was the automated
   * hourly attestation-lapse sweep (capabilityAttestationJob.ts). Authenticated;
   * authorized to an active member of the target capability's functional_owner_department
   * in that exact portfolio (never department name alone), or an admin/super_admin,
   * mirroring the case-insensitive role check already used elsewhere
   * (server/src/middleware/auth.ts's requirePermission bypass).
   *
   * Does not itself implement Phase 2 task 4's "two distinct functionalOwner members"
   * override authorization — is_override/overrideExpiresAt are passed straight through
   * to the stored procedure, which only verifies an override was *recorded*
   * (justification + expiry), not who is allowed to grant one. That authorization layer
   * is still unbuilt (TaskApprovalGate's override path).
   */
  promote = async (req: Request, res: Response) => {
    try {
      const { moduleId, portfolioId } = req.params;
      const { newStatus, reason, dracoVerdictId, isOverride, overrideExpiresAt } = req.body;

      if (!newStatus || typeof newStatus !== 'string') {
        return res.status(400).json({ error: 'newStatus is required' });
      }
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const capability = await this.repository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      if (!capability) {
        return res.status(404).json({ error: 'capability_registry row not found', moduleId, portfolioId });
      }

      const requester = (req as any).user;
      const requesterRole = requester?.role?.toLowerCase();
      const isAdmin = requesterRole === 'admin' || requesterRole === 'super_admin';

      if (!isAdmin) {
        if (!capability.functionalOwnerDepartment) {
          return res.status(403).json({
            error: 'This module has no assigned functional owner department; promotion denied.'
          });
        }
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

      await pool.query(
        `SELECT promote_capability_status($1, $2, $3, $4, $5, $6, $7)`,
        [
          capability.id,
          newStatus,
          requester.id,
          reason,
          dracoVerdictId ?? null,
          Boolean(isOverride),
          overrideExpiresAt ?? null
        ]
      );

      const updated = await this.repository.findFullByModuleAndPortfolio(moduleId, portfolioId);
      const history = await pool.query(
        `SELECT old_status, new_status, changed_by, reason, draco_verdict_id, is_override, override_expires_at, changed_at
         FROM capability_activation_history
         WHERE capability_id = $1
         ORDER BY changed_at DESC
         LIMIT 1`,
        [capability.id]
      );

      res.json({ capability: updated, lastTransition: history.rows[0] ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // promote_capability_status's failure modes (illegal transition, missing/invalid
      // verdict, missing override justification/expiry) are all business-rule
      // violations raised via RAISE EXCEPTION with predictable text -- surfaced as 400s
      // with the DB's own message. Anything else (connection failure, unexpected DB
      // error) stays a generic 500, not a leaked raw error string.
      const isKnownRejection = /illegal activation_status transition|requires a draco_verdict_id|does not reference an existing draco_reviews row|requires an override to activate|requires a non-empty justification|requires override_expires_at to be set/.test(
        message
      );

      if (isKnownRejection) {
        this.logger.warn('Promote capability status rejected', { error: message });
        return res.status(400).json({ error: message });
      }

      this.logger.error('Promote capability status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
