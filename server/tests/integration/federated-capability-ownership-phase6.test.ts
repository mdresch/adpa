/**
 * Real-Postgres proof for ADR-005 Phase 6 (write-endpoint half only -- see
 * docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase6-design.md):
 * the first human-triggerable POST endpoint for promote_capability_status
 * (CapabilityRegistryController.promote), including its department-membership
 * / admin authorization. Auth is mocked (mirrors
 * __tests__/modules/openuiChat/OpenUIChatController.test.ts's pattern) --
 * this tests the real authorization + real stored procedure, not Firebase
 * token verification. Each `it` runs inside a transaction that's rolled back
 * afterward (tests/setup/integration-setup.js).
 */
import express from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';
import { UserDepartmentRepository } from '../../src/modules/departments/UserDepartmentRepository';

let mockUser: { id: string; role: string } | undefined;

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    if (!mockUser) return _res.status(401).json({ error: 'Authentication required' });
    req.user = mockUser;
    next();
  }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import capabilityRegistryRoutes from '../../src/modules/capabilityRegistry/routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/capability-registry', capabilityRegistryRoutes[0].router);
  return app;
}

async function createTestUser(): Promise<string> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'Test User') RETURNING id`,
    [`test-${randomUUID()}@example.com`]
  );
  return result.rows[0].id;
}

async function createTestPortfolio(): Promise<string> {
  const companyResult = await pool.query(`INSERT INTO companies (name) VALUES ($1) RETURNING id`, [`Test Co ${randomUUID()}`]);
  const portfolioResult = await pool.query(`SELECT id FROM portfolio_governance WHERE company_id = $1`, [companyResult.rows[0].id]);
  return portfolioResult.rows[0].id;
}

async function createCapability(portfolioId: string, functionalOwnerDepartment: string | null): Promise<string> {
  const moduleId = `phase6-test-${randomUUID()}`;
  const result = await pool.query(
    `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department) VALUES ($1, $2, $3) RETURNING id`,
    [portfolioId, moduleId, functionalOwnerDepartment]
  );
  return moduleId;
}

describe('ADR-005 Phase 6 integration: capability_registry promote endpoint', () => {
  afterEach(() => {
    mockUser = undefined;
  });

  it('rejects an unauthenticated request', async () => {
    mockUser = undefined;
    const app = createApp();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId, 'Compliance');

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/promote`)
      .send({ newStatus: 'pending_department_approval', reason: 'submit' });

    expect(response.status).toBe(401);
  });

  it('rejects a caller who is not an active member of the functional owner department', async () => {
    const userId = await createTestUser();
    mockUser = { id: userId, role: 'user' };
    const app = createApp();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId, 'Compliance');

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/promote`)
      .send({ newStatus: 'pending_department_approval', reason: 'submit' });

    expect(response.status).toBe(403);
  });

  it('allows an active department member to promote', async () => {
    const userId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId, 'Compliance');
    const departments = new UserDepartmentRepository(pool);
    await departments.create({ userId, portfolioId, department: 'Compliance' });

    mockUser = { id: userId, role: 'user' };
    const app = createApp();

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/promote`)
      .send({ newStatus: 'pending_department_approval', reason: 'submit for approval' });

    expect(response.status).toBe(200);
    expect(response.body.capability.activationStatus).toBe('pending_department_approval');
    expect(response.body.lastTransition.new_status).toBe('pending_department_approval');
  });

  it('allows an admin to promote without being a department member themselves', async () => {
    // ADR-005 Phase 7: the admin bypass only skips *this caller's own* department
    // membership requirement -- it does not skip promote_capability_status's
    // separate, DB-level check that the target department has *someone* active
    // in this portfolio (Phase 7 task 3's structural-deadlock guard). So a
    // Compliance member still needs to exist here, just not be the caller.
    const userId = await createTestUser();
    const memberUserId = await createTestUser();
    mockUser = { id: userId, role: 'admin' };
    const app = createApp();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId, 'Compliance');
    const departments = new UserDepartmentRepository(pool);
    await departments.create({ userId: memberUserId, portfolioId, department: 'Compliance' });

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/promote`)
      .send({ newStatus: 'pending_department_approval', reason: 'submit for approval' });

    expect(response.status).toBe(200);
  });

  it('can no longer create a module with no assigned functional owner department at all (ADR-005 Phase 7 NOT NULL)', async () => {
    // REQ-PHASE6-PROMOTE-005 was originally enforced by the controller's own
    // null check (still present, see CapabilityRegistryController.promote) --
    // Phase 7's migration 439 additionally makes this state impossible to
    // reach in the first place, since functional_owner_department is now
    // NOT NULL at the schema level. This proves the stronger guarantee exists;
    // the controller's own 403 check is retained as defense in depth for a row
    // that predates Phase 7's backfill/constraint, not exercised by this test.
    const portfolioId = await createTestPortfolio();

    await expect(createCapability(portfolioId, null)).rejects.toThrow(/null value.*functional_owner_department|violates not-null constraint/i);
  });

  it('surfaces an illegal-transition rejection from the stored procedure as 400', async () => {
    const userId = await createTestUser();
    mockUser = { id: userId, role: 'admin' };
    const app = createApp();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId, 'Compliance');

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/promote`)
      .send({ newStatus: 'active', reason: 'skip approval' }); // draft -> active is illegal

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/illegal activation_status transition/);
  });

  it('returns 404 for a (moduleId, portfolioId) pair with no capability_registry row', async () => {
    const userId = await createTestUser();
    mockUser = { id: userId, role: 'admin' };
    const app = createApp();
    const portfolioId = await createTestPortfolio();

    const response = await request(app)
      .post(`/api/v1/capability-registry/nonexistent-module/${portfolioId}/promote`)
      .send({ newStatus: 'pending_department_approval', reason: 'submit' });

    expect(response.status).toBe(404);
  });
});
