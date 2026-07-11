/**
 * Seed/reconciliation runner for capability_registry (ADR-005 Phase 1 task 3).
 * Cross-products every governed-features.manifest.json feature id against every
 * active portfolio, inserts a row (owner columns null — "which department owns
 * a module" is a business decision, never guessed here) for every missing pair,
 * and logs any orphaned row for a human to act on rather than deleting it
 * automatically. DB-injected so it's importable from both the CLI wrapper
 * (scripts/seed-capability-registry.ts) and integration tests.
 */
import { Pool } from 'pg';
import manifest from '../../../governed-features.manifest.json';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
import { PortfolioRepository } from '../portfolio/PortfolioRepository';
import { buildCapabilityRegistryRow, reconcileCapabilityRegistry } from './capabilityRegistryReconciliation';
import { childLogger } from '../../utils/logger';
import { connectDatabase, getDatabasePool, getDatabasePoolSafe } from '../../database/connection';

const logger = childLogger({ component: 'seedCapabilityRegistry' });

export interface SeedCapabilityRegistryResult {
  manifestModuleCount: number;
  portfolioCount: number;
  inserted: number;
  orphaned: { moduleId: string; portfolioId: string }[];
}

function getManifestModuleIds(): string[] {
  return (manifest as { features: { id: string }[] }).features.map((feature) => feature.id);
}

export async function seedCapabilityRegistry(pool: Pool): Promise<SeedCapabilityRegistryResult> {
  const capabilityRepository = new CapabilityRegistryRepository(pool);
  const portfolioRepository = new PortfolioRepository(pool);

  const manifestModuleIds = getManifestModuleIds();
  const portfolioIds = await portfolioRepository.listActiveIds();
  const existingRows = await capabilityRepository.listAll();

  const { missingRows, orphanedRows } = reconcileCapabilityRegistry({
    manifestModuleIds,
    portfolioIds,
    existingRows
  });

  const rowsToInsert = missingRows.map((row) => buildCapabilityRegistryRow(row.moduleId, row.portfolioId));
  const inserted = await capabilityRepository.insertMissing(rowsToInsert);

  if (orphanedRows.length > 0) {
    logger.warn('capability_registry has orphaned rows with no matching manifest/portfolio pair', {
      orphanedRows
    });
  }

  logger.info('seedCapabilityRegistry complete', {
    manifestModuleCount: manifestModuleIds.length,
    portfolioCount: portfolioIds.length,
    inserted,
    orphanedCount: orphanedRows.length
  });

  return {
    manifestModuleCount: manifestModuleIds.length,
    portfolioCount: portfolioIds.length,
    inserted,
    orphaned: orphanedRows
  };
}

/**
 * CLI runner — invoked via `npm run seed:capability-registry`, matching the
 * require.main === module convention used by seedRulesets.ts.
 */
if (require.main === module) {
  connectDatabase()
    .then(() => seedCapabilityRegistry(getDatabasePool()))
    .then(async (result) => {
      console.log('Capability registry seeded successfully!', result);
      await getDatabasePool().end().catch(() => {});
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Failed to seed capability registry:', error);
      await getDatabasePoolSafe()?.end().catch(() => {});
      process.exit(1);
    });
}
