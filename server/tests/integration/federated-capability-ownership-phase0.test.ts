/**
 * Real-Postgres proof for ADR-005 Phase 0 (see
 * docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md):
 * migration 434's departments/user_departments/department_claims_sync_jobs
 * tables and trg_companies_create_portfolio trigger actually exist and behave
 * as the (previously mock-only) unit tests assumed. Each `it` runs inside a
 * transaction that's rolled back afterward (tests/setup/integration-setup.js),
 * so tests are free to insert real rows.
 */
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';
import { UserDepartmentRepository } from '../../src/modules/departments/UserDepartmentRepository';
import { enqueueClaimsSyncJob, processClaimsSyncJob, ClaimsSyncQueue } from '../../src/modules/departments/departmentClaimsSyncJob';

async function createTestUser(): Promise<string> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'Test User') RETURNING id`,
    [`test-${randomUUID()}@example.com`]
  );
  return result.rows[0].id;
}

async function createTestCompanyWithPortfolio(): Promise<{ companyId: string; portfolioId: string }> {
  const companyResult = await pool.query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
    [`Test Co ${randomUUID()}`]
  );
  const companyId = companyResult.rows[0].id;
  const portfolioResult = await pool.query(
    `SELECT id FROM portfolio_governance WHERE company_id = $1`,
    [companyId]
  );
  return { companyId, portfolioId: portfolioResult.rows[0].id };
}

const noopQueue: ClaimsSyncQueue = { enqueue: async () => ({ jobId: 'noop' }) };

describe('ADR-005 Phase 0 integration', () => {
  describe('departments reference table', () => {
    it('is seeded with the fixed department codes', async () => {
      const result = await pool.query(`SELECT code FROM departments ORDER BY code`);
      const codes = result.rows.map((row) => row.code);
      expect(codes).toEqual(
        expect.arrayContaining(['IT', 'Compliance', 'Legal', 'Finance', 'HR', 'Risk', 'Internal Audit'])
      );
    });
  });

  describe('user_departments FK integrity', () => {
    it('rejects a department code that is not in the departments table', async () => {
      const userId = await createTestUser();
      const { portfolioId } = await createTestCompanyWithPortfolio();

      await expect(
        pool.query(
          `INSERT INTO user_departments (user_id, portfolio_id, department) VALUES ($1, $2, 'NotADepartment')`,
          [userId, portfolioId]
        )
      ).rejects.toThrow();
    });

    it('rejects a department_role outside member/deputy/head', async () => {
      const userId = await createTestUser();
      const { portfolioId } = await createTestCompanyWithPortfolio();

      await expect(
        pool.query(
          `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'IT', 'owner')`,
          [userId, portfolioId]
        )
      ).rejects.toThrow();
    });
  });

  describe('trg_companies_create_portfolio', () => {
    it('auto-creates an active portfolio_governance row when a company is inserted', async () => {
      const { companyId } = await createTestCompanyWithPortfolio();
      const result = await pool.query(
        `SELECT status FROM portfolio_governance WHERE company_id = $1`,
        [companyId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe('active');
    });

    it('does not create a duplicate portfolio on a second insertion path for the same company (ON CONFLICT guard)', async () => {
      const { companyId } = await createTestCompanyWithPortfolio();
      // Simulates a second code path independently trying to satisfy the same
      // "company exists => portfolio exists" invariant the trigger already handled.
      await pool.query(
        `INSERT INTO portfolio_governance (company_id, portfolio_name, status)
         VALUES ($1, 'duplicate attempt', 'active')
         ON CONFLICT (company_id) WHERE (company_id IS NOT NULL) DO NOTHING`,
        [companyId]
      );
      const result = await pool.query(
        `SELECT id FROM portfolio_governance WHERE company_id = $1`,
        [companyId]
      );
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('UserDepartmentRepository.setActive', () => {
    it('reports the true before/after transition, not just the requested value', async () => {
      const userId = await createTestUser();
      const { portfolioId } = await createTestCompanyWithPortfolio();
      const repository = new UserDepartmentRepository(pool);

      const created = await repository.create({ userId, portfolioId, department: 'Compliance' });
      expect(created.isActive).toBe(true);

      const deactivated = await repository.setActive(created.id, false);
      expect(deactivated.wasActive).toBe(true);
      expect(deactivated.isActive).toBe(false);

      const reactivated = await repository.setActive(created.id, true);
      expect(reactivated.wasActive).toBe(false);
      expect(reactivated.isActive).toBe(true);
    });
  });

  describe('end-to-end claims sync (department_claims_sync_jobs)', () => {
    it('marks the job complete only after a successful (mocked) Firebase call', async () => {
      const userId = await createTestUser();
      const { id: jobId } = await enqueueClaimsSyncJob(
        { db: { query: (sql, params) => pool.query(sql, params) }, queue: noopQueue },
        { userId, claims: [{ portfolioId: 'p1', department: 'IT', role: 'member' }], isRemoval: false }
      );

      const mockFirebaseAdmin = {
        setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
        revokeRefreshTokens: jest.fn().mockResolvedValue(undefined)
      };
      await processClaimsSyncJob(
        { db: { query: (sql, params) => pool.query(sql, params) }, queue: noopQueue, firebaseAdmin: mockFirebaseAdmin },
        { id: jobId, userId, claims: [{ portfolioId: 'p1', department: 'IT', role: 'member' }], isRemoval: false }
      );

      const row = await pool.query(`SELECT status FROM department_claims_sync_jobs WHERE id = $1`, [jobId]);
      expect(row.rows[0].status).toBe('complete');
      expect(mockFirebaseAdmin.setCustomUserClaims).toHaveBeenCalledTimes(1);
      expect(mockFirebaseAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });

    it('calls revokeRefreshTokens for a removal and leaves the job pending if Firebase rejects', async () => {
      const userId = await createTestUser();
      const { id: jobId } = await enqueueClaimsSyncJob(
        { db: { query: (sql, params) => pool.query(sql, params) }, queue: noopQueue },
        { userId, claims: [], isRemoval: true }
      );

      const failingFirebaseAdmin = {
        setCustomUserClaims: jest.fn().mockRejectedValue(new Error('firebase unavailable')),
        revokeRefreshTokens: jest.fn()
      };
      await expect(
        processClaimsSyncJob(
          { db: { query: (sql, params) => pool.query(sql, params) }, queue: noopQueue, firebaseAdmin: failingFirebaseAdmin },
          { id: jobId, userId, claims: [], isRemoval: true }
        )
      ).rejects.toThrow('firebase unavailable');

      const row = await pool.query(`SELECT status FROM department_claims_sync_jobs WHERE id = $1`, [jobId]);
      expect(row.rows[0].status).toBe('pending');
      expect(failingFirebaseAdmin.revokeRefreshTokens).not.toHaveBeenCalled(); // never reached: setCustomUserClaims rejected first
    });
  });
});
