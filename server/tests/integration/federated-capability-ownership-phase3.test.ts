/**
 * Real-Postgres proof for ADR-005 Phase 3 tasks 1-5 (see
 * docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md and
 * docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md):
 * migration 435's activation_status state machine, the lockdown trigger,
 * promote_capability_status's transition validation, and the generic drift
 * mechanism (module_drift_sources + attach_module_drift_trigger +
 * capability_drift_trigger_fn) against a scratch table created in-test. Each
 * `it` runs inside a transaction that's rolled back afterward
 * (tests/setup/integration-setup.js).
 *
 * Phase 7 note: capability_registry.functional_owner_department is NOT NULL as
 * of migration 439, and promote_capability_status now requires an active
 * user_departments member in the capability's own portfolio for transitions to
 * pending_department_approval/active -- createTestCapability and
 * addActiveDepartmentMember below exist to satisfy both, since this file
 * predates Phase 7 and isn't testing that gate itself (see
 * federated-capability-ownership-phase7.test.ts for that).
 */
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';

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

async function createTestCapability(
  portfolioId: string,
  moduleId = `test-module-${randomUUID()}`,
  functionalOwnerDepartment = 'IT'
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department) VALUES ($1, $2, $3) RETURNING id`,
    [portfolioId, moduleId, functionalOwnerDepartment]
  );
  return result.rows[0].id;
}

async function addActiveDepartmentMember(portfolioId: string, department = 'IT'): Promise<void> {
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'Test User') RETURNING id`,
    [`test-${randomUUID()}@example.com`]
  );
  await pool.query(
    `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, $3, 'member')`,
    [userResult.rows[0].id, portfolioId, department]
  );
}

async function promote(capabilityId: string, newStatus: string, reason = 'test'): Promise<void> {
  await pool.query(`SELECT promote_capability_status($1, $2, NULL, $3)`, [capabilityId, newStatus, reason]);
}

async function getStatus(capabilityId: string): Promise<string> {
  const result = await pool.query(`SELECT activation_status FROM capability_registry WHERE id = $1`, [capabilityId]);
  return result.rows[0].activation_status;
}

async function createDracoReview(verdict: 'PASS' | 'CONDITIONAL_PASS' | 'REJECT' = 'PASS'): Promise<string> {
  const result = await pool.query(`INSERT INTO draco_reviews (verdict) VALUES ($1) RETURNING id`, [verdict]);
  return result.rows[0].id;
}

describe('ADR-005 Phase 3 integration', () => {
  describe('lockdown trigger', () => {
    it('rejects a direct UPDATE of activation_status, bypassing promote_capability_status', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createTestCapability(portfolioId);

      await expect(
        pool.query(`UPDATE capability_registry SET activation_status = 'active' WHERE id = $1`, [capabilityId])
      ).rejects.toThrow(/activation_status may only be changed via promote_capability_status/);
    });
  });

  describe('promote_capability_status', () => {
    it('performs a legal transition and writes exactly one history row', async () => {
      const portfolioId = await createTestPortfolio();
      await addActiveDepartmentMember(portfolioId);
      const capabilityId = await createTestCapability(portfolioId);

      await promote(capabilityId, 'pending_department_approval', 'submitted for approval');

      expect(await getStatus(capabilityId)).toBe('pending_department_approval');
      const history = await pool.query(
        `SELECT old_status, new_status, reason FROM capability_activation_history WHERE capability_id = $1`,
        [capabilityId]
      );
      expect(history.rows).toHaveLength(1);
      expect(history.rows[0]).toMatchObject({
        old_status: 'draft',
        new_status: 'pending_department_approval',
        reason: 'submitted for approval'
      });
    });

    it('rejects an illegal transition and writes no history row', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createTestCapability(portfolioId);

      await expect(promote(capabilityId, 'active', 'skip approval')).rejects.toThrow(
        /illegal activation_status transition/
      );

      expect(await getStatus(capabilityId)).toBe('draft');
      const history = await pool.query(
        `SELECT id FROM capability_activation_history WHERE capability_id = $1`,
        [capabilityId]
      );
      expect(history.rows).toHaveLength(0);
    });

    it('rejects transitions out of the terminal disabled state', async () => {
      const portfolioId = await createTestPortfolio();
      await addActiveDepartmentMember(portfolioId);
      const capabilityId = await createTestCapability(portfolioId);
      await promote(capabilityId, 'pending_department_approval');
      await promote(capabilityId, 'disabled');

      await expect(promote(capabilityId, 'pending_department_approval')).rejects.toThrow(
        /illegal activation_status transition/
      );
    });
  });

  describe('drift mechanism (attach_module_drift_trigger + capability_drift_trigger_fn)', () => {
    async function createScratchConfigTable(tableName: string) {
      await pool.query(`
        CREATE TABLE ${tableName} (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          module_id varchar(100) NOT NULL,
          portfolio_id uuid NOT NULL,
          config_payload text,
          last_touched_at timestamptz DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    it('promotes an active capability to pending_re_approval when a monitored column changes', async () => {
      const portfolioId = await createTestPortfolio();
      await addActiveDepartmentMember(portfolioId);
      const moduleId = `drift-module-${randomUUID()}`;
      const capabilityId = await createTestCapability(portfolioId, moduleId);
      await promote(capabilityId, 'pending_department_approval');
      await pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'test', $2)`, [
        capabilityId,
        await createDracoReview()
      ]);

      const tableName = `scratch_drift_${randomUUID().replace(/-/g, '_')}`;
      await createScratchConfigTable(tableName);
      await pool.query(
        `SELECT attach_module_drift_trigger($1, $2, ARRAY['config_payload'])`,
        [moduleId, tableName]
      );

      const configRow = await pool.query(
        `INSERT INTO ${tableName} (module_id, portfolio_id, config_payload) VALUES ($1, $2, 'v1') RETURNING id`,
        [moduleId, portfolioId]
      );

      await pool.query(`UPDATE ${tableName} SET config_payload = 'v2' WHERE id = $1`, [configRow.rows[0].id]);

      expect(await getStatus(capabilityId)).toBe('pending_re_approval');
      const history = await pool.query(
        `SELECT reason FROM capability_activation_history WHERE capability_id = $1 ORDER BY changed_at DESC LIMIT 1`,
        [capabilityId]
      );
      expect(history.rows[0].reason).toContain('drift detected');
    });

    it('does not fire when a non-monitored column changes', async () => {
      const portfolioId = await createTestPortfolio();
      await addActiveDepartmentMember(portfolioId);
      const moduleId = `drift-module-${randomUUID()}`;
      const capabilityId = await createTestCapability(portfolioId, moduleId);
      await promote(capabilityId, 'pending_department_approval');
      await pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'test', $2)`, [
        capabilityId,
        await createDracoReview()
      ]);

      const tableName = `scratch_drift_${randomUUID().replace(/-/g, '_')}`;
      await createScratchConfigTable(tableName);
      await pool.query(
        `SELECT attach_module_drift_trigger($1, $2, ARRAY['config_payload'])`,
        [moduleId, tableName]
      );

      const configRow = await pool.query(
        `INSERT INTO ${tableName} (module_id, portfolio_id, config_payload) VALUES ($1, $2, 'v1') RETURNING id`,
        [moduleId, portfolioId]
      );

      await pool.query(`UPDATE ${tableName} SET last_touched_at = CURRENT_TIMESTAMP WHERE id = $1`, [configRow.rows[0].id]);

      expect(await getStatus(capabilityId)).toBe('active');
    });

    it('does not fire when the matching capability is not active', async () => {
      const portfolioId = await createTestPortfolio();
      const moduleId = `drift-module-${randomUUID()}`;
      const capabilityId = await createTestCapability(portfolioId, moduleId);
      // left in 'draft' -- never promoted to active

      const tableName = `scratch_drift_${randomUUID().replace(/-/g, '_')}`;
      await createScratchConfigTable(tableName);
      await pool.query(
        `SELECT attach_module_drift_trigger($1, $2, ARRAY['config_payload'])`,
        [moduleId, tableName]
      );

      const configRow = await pool.query(
        `INSERT INTO ${tableName} (module_id, portfolio_id, config_payload) VALUES ($1, $2, 'v1') RETURNING id`,
        [moduleId, portfolioId]
      );

      await pool.query(`UPDATE ${tableName} SET config_payload = 'v2' WHERE id = $1`, [configRow.rows[0].id]);

      expect(await getStatus(capabilityId)).toBe('draft');
      const history = await pool.query(
        `SELECT id FROM capability_activation_history WHERE capability_id = $1`,
        [capabilityId]
      );
      expect(history.rows).toHaveLength(0);
    });
  });
});
