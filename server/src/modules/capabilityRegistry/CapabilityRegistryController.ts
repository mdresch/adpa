import { Request, Response } from 'express';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
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
}
