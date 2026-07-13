/**
 * Real-Postgres proof for ADR-005 Phase 7 (Action Item 8): partial-delivery
 * lockout (see docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md
 * and docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase7-design.md).
 * Covers migration 438's owner backfill/moduleOwnerAssignments.ts, migration 439's
 * NOT NULL + FK on functional_owner_department, and promote_capability_status's
 * new portfolio-scoped active-member gate. Each `it` runs inside a transaction
 * that's rolled back afterward (tests/setup/integration-setup.js).
 */
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';
import { resolveModuleOwnerDepartments } from '../../src/modules/capabilityRegistry/moduleOwnerAssignments';

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

async function createTestUser(): Promise<string> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'Test User') RETURNING id`,
    [`test-${randomUUID()}@example.com`]
  );
  return result.rows[0].id;
}

async function createCapability(
  portfolioId: string,
  functionalOwnerDepartment: string | null,
  moduleId = `test-module-${randomUUID()}`
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department) VALUES ($1, $2, $3) RETURNING id`,
    [portfolioId, moduleId, functionalOwnerDepartment]
  );
  return result.rows[0].id;
}

async function promote(capabilityId: string, newStatus: string, reason = 'test'): Promise<void> {
  await pool.query(`SELECT promote_capability_status($1, $2, NULL, $3)`, [capabilityId, newStatus, reason]);
}

describe('ADR-005 Phase 7 integration: partial-delivery lockout', () => {
  describe('task 1/2: NOT NULL + FK on functional_owner_department', () => {
    it('rejects an INSERT with a null functional_owner_department', async () => {
      const portfolioId = await createTestPortfolio();

      await expect(createCapability(portfolioId, null)).rejects.toThrow(/violates not-null constraint/);
    });

    it('rejects an INSERT with a functional_owner_department not present in the departments table', async () => {
      const portfolioId = await createTestPortfolio();

      await expect(createCapability(portfolioId, 'NotARealDepartment')).rejects.toThrow(
        /violates foreign key constraint/
      );
    });

    it('accepts an INSERT with a real department code', async () => {
      const portfolioId = await createTestPortfolio();

      const capabilityId = await createCapability(portfolioId, 'IT');

      const row = await pool.query(`SELECT functional_owner_department FROM capability_registry WHERE id = $1`, [
        capabilityId
      ]);
      expect(row.rows[0].functional_owner_department).toBe('IT');
    });
  });

  describe('owner backfill (migration 438) + moduleOwnerAssignments.ts', () => {
    it('assigns the confirmed business owners for the three non-IT packets, IT for everything else', () => {
      expect(resolveModuleOwnerDepartments('compliance')).toEqual({
        functionalOwnerDepartment: 'Compliance',
        controlDefinitionOwnerDepartment: 'Compliance'
      });
      expect(resolveModuleOwnerDepartments('ip-governance')).toEqual({
        functionalOwnerDepartment: 'Legal',
        controlDefinitionOwnerDepartment: 'Legal'
      });
      expect(resolveModuleOwnerDepartments('template-lifecycle')).toEqual({
        functionalOwnerDepartment: 'Compliance',
        controlDefinitionOwnerDepartment: 'Compliance'
      });
      expect(resolveModuleOwnerDepartments('rag')).toEqual({
        functionalOwnerDepartment: 'IT',
        controlDefinitionOwnerDepartment: 'IT'
      });
      expect(resolveModuleOwnerDepartments('some-future-unmapped-packet')).toEqual({
        functionalOwnerDepartment: 'IT',
        controlDefinitionOwnerDepartment: 'IT'
      });
    });

    it('migration 438 left no pre-existing row still null (schema-level guarantee, not just app-level default)', async () => {
      const stillNull = await pool.query(
        `SELECT count(*)::int AS count FROM capability_registry WHERE functional_owner_department IS NULL`
      );
      expect(stillNull.rows[0].count).toBe(0);
    });
  });

  describe('task 3: portfolio-scoped active-member gate on promote_capability_status', () => {
    it('denies draft -> pending_department_approval when the department has zero active members in this portfolio', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapability(portfolioId, 'Compliance');

      await expect(promote(capabilityId, 'pending_department_approval')).rejects.toThrow(
        /functional_owner_department Compliance has no active member in portfolio .* activation blocked pending break-glass escalation/
      );
    });

    it('denies when the department has an active member, but only in a different portfolio', async () => {
      const portfolioId = await createTestPortfolio();
      const otherPortfolioId = await createTestPortfolio();
      const capabilityId = await createCapability(portfolioId, 'Compliance');
      const userId = await createTestUser();
      await pool.query(
        `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'Compliance', 'member')`,
        [userId, otherPortfolioId]
      );

      await expect(promote(capabilityId, 'pending_department_approval')).rejects.toThrow(
        /functional_owner_department Compliance has no active member in portfolio/
      );
    });

    it('denies when the only member in this portfolio is inactive', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapability(portfolioId, 'Compliance');
      const userId = await createTestUser();
      await pool.query(
        `INSERT INTO user_departments (user_id, portfolio_id, department, department_role, is_active)
         VALUES ($1, $2, 'Compliance', 'member', false)`,
        [userId, portfolioId]
      );

      await expect(promote(capabilityId, 'pending_department_approval')).rejects.toThrow(
        /functional_owner_department Compliance has no active member in portfolio/
      );
    });

    it('allows the transition once an active member exists in the correct portfolio', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapability(portfolioId, 'Compliance');
      const userId = await createTestUser();
      await pool.query(
        `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'Compliance', 'member')`,
        [userId, portfolioId]
      );

      await promote(capabilityId, 'pending_department_approval', 'submitted');

      const row = await pool.query(`SELECT activation_status FROM capability_registry WHERE id = $1`, [capabilityId]);
      expect(row.rows[0].activation_status).toBe('pending_department_approval');
    });

    it('does not gate transitions to disabled -- a deadlocked department can still be shut off', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapability(portfolioId, 'Compliance');
      const userId = await createTestUser();
      await pool.query(
        `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'Compliance', 'member')`,
        [userId, portfolioId]
      );
      await promote(capabilityId, 'pending_department_approval');
      // Remove the only member -- department is now deadlocked in this portfolio.
      await pool.query(`UPDATE user_departments SET is_active = false WHERE user_id = $1`, [userId]);

      await promote(capabilityId, 'disabled', 'shut down, department deadlocked');

      const row = await pool.query(`SELECT activation_status FROM capability_registry WHERE id = $1`, [capabilityId]);
      expect(row.rows[0].activation_status).toBe('disabled');
    });
  });
});
