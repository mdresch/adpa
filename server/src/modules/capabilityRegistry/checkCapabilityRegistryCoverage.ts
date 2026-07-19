/**
 * DB-aware coverage check for capability_registry (ADR-005 Phase 1 task 5):
 * fails (non-zero exit / thrown error) if any (manifest packet, portfolio) pair
 * has no capability_registry row, or vice versa.
 *
 * Deliberately kept separate from `verify:governed-features` /
 * `verify-governed-features.mjs`, which CLAUDE.md documents as fast and
 * DB-free ("fast, no DB — required before committing non-trivial backend
 * changes") and which the pre-push hook relies on running without a DB
 * connection. This script is for CI/deploy pipelines, not the fast pre-push
 * path — see the "check:capability-registry-coverage" comment in package.json.
 */
import { Pool } from 'pg';
import manifest from '../../../governed-features.manifest.json';
import { CapabilityRegistryRepository } from './CapabilityRegistryRepository';
import { PortfolioRepository } from '../portfolio/PortfolioRepository';
import { reconcileCapabilityRegistry } from './capabilityRegistryReconciliation';
import { childLogger } from '../../utils/logger';
import { connectDatabase, getDatabasePool, getDatabasePoolSafe } from '../../database/connection';

const logger = childLogger({ component: 'checkCapabilityRegistryCoverage' });

export interface CoverageCheckResult {
  ok: boolean;
  missingRows: { moduleId: string; portfolioId: string }[];
  orphanedRows: { moduleId: string; portfolioId: string }[];
}

export async function checkCapabilityRegistryCoverage(pool: Pool): Promise<CoverageCheckResult> {
  const capabilityRepository = new CapabilityRegistryRepository(pool);
  const portfolioRepository = new PortfolioRepository(pool);

  const manifestModuleIds = (manifest as { features: { id: string }[] }).features.map((feature) => feature.id);
  const portfolioIds = await portfolioRepository.listActiveIds();
  const existingRows = await capabilityRepository.listAll();

  const { missingRows, orphanedRows } = reconcileCapabilityRegistry({
    manifestModuleIds,
    portfolioIds,
    existingRows
  });

  const ok = missingRows.length === 0 && orphanedRows.length === 0;
  if (!ok) {
    logger.error('capability_registry coverage check failed', { missingRows, orphanedRows });
  }

  return { ok, missingRows, orphanedRows };
}

/** CLI runner — invoked via `npm run check:capability-registry-coverage`. */
if (require.main === module) {
  connectDatabase()
    .then(() => checkCapabilityRegistryCoverage(getDatabasePool()))
    .then(async (result) => {
      await getDatabasePool().end().catch(() => {});
      if (!result.ok) {
        console.error('capability_registry coverage check FAILED:', result);
        process.exit(1);
      }
      console.log('capability_registry coverage check passed.');
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('capability_registry coverage check errored:', error);
      await getDatabasePoolSafe()?.end().catch(() => {});
      process.exit(1);
    });
}
