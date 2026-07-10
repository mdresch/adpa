import { Pool } from 'pg';
import { childLogger } from '../../utils/logger';

export interface CapabilityRegistryDbRow {
  moduleId: string;
  portfolioId: string;
  platformOperator: string;
  functionalOwnerType: string;
  functionalOwnerDepartment: string | null;
  controlDefinitionOwnerDepartment: string | null;
}

/**
 * Read-only accessor for capability_registry (ADR-005 Phase 1), used by the .NET
 * orchestrator's TaskApprovalGate (Phase 2) to resolve a module's declared owner —
 * the orchestrator's own DB (governance-ledger) is a physically separate Postgres
 * database and cannot query this table directly.
 */
export class CapabilityRegistryRepository {
  private logger = childLogger({ component: 'CapabilityRegistryRepository' });

  constructor(private pool: Pool) {}

  async findByModuleAndPortfolio(
    moduleId: string,
    portfolioId: string
  ): Promise<CapabilityRegistryDbRow | null> {
    const result = await this.pool.query(
      `SELECT module_id, portfolio_id, platform_operator, functional_owner_type,
              functional_owner_department, control_definition_owner_department
       FROM capability_registry
       WHERE module_id = $1 AND portfolio_id = $2`,
      [moduleId, portfolioId]
    );

    if (result.rows.length === 0) {
      this.logger.debug('capability_registry row not found', { moduleId, portfolioId });
      return null;
    }

    const row = result.rows[0];
    return {
      moduleId: row.module_id,
      portfolioId: row.portfolio_id,
      platformOperator: row.platform_operator,
      functionalOwnerType: row.functional_owner_type,
      functionalOwnerDepartment: row.functional_owner_department,
      controlDefinitionOwnerDepartment: row.control_definition_owner_department
    };
  }
}
