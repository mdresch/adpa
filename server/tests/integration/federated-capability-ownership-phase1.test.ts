/**
 * Real-Postgres proof for ADR-005 Phase 1 (see
 * docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md):
 * seedCapabilityRegistry actually reconciles the real manifest against real
 * portfolios and writes real rows, and checkCapabilityRegistryCoverage
 * actually detects real drift. Each `it` runs inside a rolled-back
 * transaction (tests/setup/integration-setup.js).
 */
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';
import { seedCapabilityRegistry } from '../../src/modules/capabilityRegistry/seedCapabilityRegistry';
import { checkCapabilityRegistryCoverage } from '../../src/modules/capabilityRegistry/checkCapabilityRegistryCoverage';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('../../governed-features.manifest.json') as { features: { id: string }[] };

async function createTestPortfolio(): Promise<string> {
  const companyResult = await pool.query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
    [`Test Co ${randomUUID()}`]
  );
  const portfolioResult = await pool.query(
    `SELECT id FROM portfolio_governance WHERE company_id = $1`,
    [companyResult.rows[0].id]
  );
  return portfolioResult.rows[0].id;
}

describe('ADR-005 Phase 1 integration: capability_registry seeding', () => {
  it('inserts one row per manifest feature for a newly created portfolio, owner departments resolved per moduleOwnerAssignments', async () => {
    const portfolioId = await createTestPortfolio();

    const result = await seedCapabilityRegistry(pool);

    const moduleIds = manifest.features.map((feature) => feature.id);
    const rows = await pool.query(
      `SELECT module_id, functional_owner_department FROM capability_registry WHERE portfolio_id = $1`,
      [portfolioId]
    );
    expect(rows.rows.map((row) => row.module_id).sort()).toEqual([...moduleIds].sort());
    // ADR-005 Phase 7: owner departments are real, not null -- compliance/ip-governance/
    // template-lifecycle get their assigned department, everything else defaults to IT.
    expect(rows.rows.every((row) => row.functional_owner_department !== null)).toBe(true);
    const nonItRows = rows.rows.filter((row) => row.functional_owner_department !== 'IT');
    expect(nonItRows.map((row) => `${row.module_id}:${row.functional_owner_department}`).sort()).toEqual(
      ['compliance:Compliance', 'ip-governance:Legal', 'template-lifecycle:Compliance'].sort()
    );
    expect(result.inserted).toBeGreaterThanOrEqual(moduleIds.length);
  });

  it('is idempotent on a second run and never overwrites an existing owner assignment', async () => {
    const portfolioId = await createTestPortfolio();
    await seedCapabilityRegistry(pool);

    const moduleId = manifest.features[0].id;
    await pool.query(
      `UPDATE capability_registry SET functional_owner_department = 'Compliance'
       WHERE module_id = $1 AND portfolio_id = $2`,
      [moduleId, portfolioId]
    );

    const secondRun = await seedCapabilityRegistry(pool);
    expect(secondRun.inserted).toBe(0);

    const row = await pool.query(
      `SELECT functional_owner_department FROM capability_registry WHERE module_id = $1 AND portfolio_id = $2`,
      [moduleId, portfolioId]
    );
    expect(row.rows[0].functional_owner_department).toBe('Compliance');
  });

  describe('checkCapabilityRegistryCoverage', () => {
    it('fails when a portfolio has no capability_registry rows at all', async () => {
      const portfolioId = await createTestPortfolio();
      // Deliberately skip seeding.
      const result = await checkCapabilityRegistryCoverage(pool);
      expect(result.ok).toBe(false);
      expect(result.missingRows.some((row) => row.portfolioId === portfolioId)).toBe(true);
    });

    it('fails when a genuinely orphaned row exists (module id not in the manifest)', async () => {
      const portfolioId = await createTestPortfolio();
      await seedCapabilityRegistry(pool);
      await pool.query(
        `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department)
         VALUES ($1, 'not-a-real-manifest-module', 'IT')`,
        [portfolioId]
      );

      const result = await checkCapabilityRegistryCoverage(pool);
      expect(result.ok).toBe(false);
      expect(
        result.orphanedRows.some(
          (row) => row.moduleId === 'not-a-real-manifest-module' && row.portfolioId === portfolioId
        )
      ).toBe(true);
    });

    it('passes once the registry is fully reconciled', async () => {
      await createTestPortfolio();
      await seedCapabilityRegistry(pool);
      const result = await checkCapabilityRegistryCoverage(pool);
      expect(result.ok).toBe(true);
      expect(result.missingRows).toEqual([]);
      expect(result.orphanedRows).toEqual([]);
    });
  });
});
