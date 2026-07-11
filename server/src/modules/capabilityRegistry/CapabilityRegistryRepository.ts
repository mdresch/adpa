import { Pool } from 'pg';
import { childLogger } from '../../utils/logger';
import { CapabilityRegistryRow, CapabilityRegistryRowInsert } from './capabilityRegistryReconciliation';

export interface CapabilityRegistryDbRow {
  moduleId: string;
  portfolioId: string;
  platformOperator: string;
  functionalOwnerType: string;
  functionalOwnerDepartment: string | null;
  controlDefinitionOwnerDepartment: string | null;
}

/**
 * Accessor for capability_registry (ADR-005 Phase 1). findByModuleAndPortfolio is
 * used by the .NET orchestrator's TaskApprovalGate (Phase 2) to resolve a module's
 * declared owner — the orchestrator's own DB (governance-ledger) is a physically
 * separate Postgres database and cannot query this table directly. insertMissing is
 * the write path used by the Phase 1 task 3 seed/reconciliation runner
 * (seedCapabilityRegistry.ts).
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

  /**
   * Unfiltered (module_id, portfolio_id) listing, feeding reconcileCapabilityRegistry's
   * existingRows input — used by both the seed runner and the coverage-check script.
   */
  async listAll(): Promise<CapabilityRegistryRow[]> {
    const result = await this.pool.query(`SELECT module_id, portfolio_id FROM capability_registry`);
    return result.rows.map((row) => ({ moduleId: row.module_id, portfolioId: row.portfolio_id }));
  }

  /**
   * ON CONFLICT DO NOTHING, deliberately not an upsert — seeding must never
   * clobber an owner department a human has already assigned to an existing row.
   * Returns the number of rows actually inserted.
   */
  async insertMissing(rows: CapabilityRegistryRowInsert[]): Promise<number> {
    if (rows.length === 0) return 0;

    let inserted = 0;
    for (const row of rows) {
      const result = await this.pool.query(
        `INSERT INTO capability_registry
           (module_id, portfolio_id, platform_operator, functional_owner_type,
            functional_owner_department, control_definition_owner_department)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (module_id, portfolio_id) DO NOTHING`,
        [
          row.moduleId,
          row.portfolioId,
          row.platformOperator,
          row.functionalOwnerType,
          row.functionalOwnerDepartment,
          row.controlDefinitionOwnerDepartment
        ]
      );
      inserted += result.rowCount ?? 0;
    }

    this.logger.info('capability_registry insertMissing complete', { attempted: rows.length, inserted });
    return inserted;
  }
}
