/**
 * Real-Postgres proof for the Governor Portal Approvals queue's list-pending
 * endpoints (GET .../overrides/pending, GET .../exceptions/pending) --
 * built to support ADR-011's redesign, which needed a way to list pending
 * override requests / break-glass exceptions that didn't exist before this.
 * Auth is mocked (mirrors phase6/phase2task4/phase3task6's established
 * pattern). Each `it` runs inside a transaction that's rolled back
 * afterward (tests/setup/integration-setup.js).
 */
import express from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';

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

async function createTestUser(role = 'user'): Promise<string> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, 'x', 'Test User', $2) RETURNING id`,
    [`test-${randomUUID()}@example.com`, role]
  );
  return result.rows[0].id;
}

async function createTestPortfolio(): Promise<string> {
  const companyResult = await pool.query(`INSERT INTO companies (name) VALUES ($1) RETURNING id`, [`Test Co ${randomUUID()}`]);
  const portfolioResult = await pool.query(`SELECT id FROM portfolio_governance WHERE company_id = $1`, [companyResult.rows[0].id]);
  return portfolioResult.rows[0].id;
}

async function createCapability(portfolioId: string, functionalOwnerDepartment = 'Compliance'): Promise<string> {
  const moduleId = `queue-test-${randomUUID()}`;
  await pool.query(
    `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department) VALUES ($1, $2, $3)`,
    [portfolioId, moduleId, functionalOwnerDepartment]
  );
  return moduleId;
}

async function addActiveMember(userId: string, portfolioId: string, department = 'Compliance'): Promise<void> {
  await pool.query(
    `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, $3, 'member')`,
    [userId, portfolioId, department]
  );
}

describe('Approvals queue: GET .../overrides/pending', () => {
  afterEach(() => {
    mockUser = undefined;
  });

  it('rejects an unauthenticated request', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/capability-registry/overrides/pending');
    expect(response.status).toBe(401);
  });

  it('an admin sees a pending request from any department', async () => {
    const requesterId = await createTestUser();
    const adminId = await createTestUser('admin');
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId);
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });

    mockUser = { id: adminId, role: 'admin' };
    const response = await request(app).get('/api/v1/capability-registry/overrides/pending');
    expect(response.status).toBe(200);
    expect(response.body.overrideRequests.some((r: any) => r.moduleId === moduleId)).toBe(true);
  });

  it('a plain member sees only requests from their own active department', async () => {
    const requesterId = await createTestUser();
    const complianceMemberId = await createTestUser();
    const legalMemberId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId, 'Compliance');
    await addActiveMember(complianceMemberId, portfolioId, 'Compliance');
    await addActiveMember(legalMemberId, portfolioId, 'Legal');
    const moduleId = await createCapability(portfolioId, 'Compliance');

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });

    mockUser = { id: complianceMemberId, role: 'user' };
    const visible = await request(app).get('/api/v1/capability-registry/overrides/pending');
    expect(visible.body.overrideRequests.some((r: any) => r.moduleId === moduleId)).toBe(true);

    mockUser = { id: legalMemberId, role: 'user' };
    const hidden = await request(app).get('/api/v1/capability-registry/overrides/pending');
    expect(hidden.body.overrideRequests.some((r: any) => r.moduleId === moduleId)).toBe(false);
  });
});

describe('Approvals queue: GET .../exceptions/pending', () => {
  afterEach(() => {
    mockUser = undefined;
  });

  it('rejects an unauthenticated request', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/capability-registry/exceptions/pending');
    expect(response.status).toBe(401);
  });

  it('an admin sees a pending exception', async () => {
    const superAdminId = await createTestUser('super_admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });

    const response = await request(app).get('/api/v1/capability-registry/exceptions/pending');
    expect(response.status).toBe(200);
    const match = response.body.exceptions.find((e: any) => e.moduleId === moduleId);
    expect(match).toBeDefined();
    expect(match.reviews.length).toBeGreaterThan(0);
  });

  it('a plain user sees only exceptions where they are a named reviewer with an undecided review', async () => {
    const superAdminId = await createTestUser('super_admin');
    const outsiderId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });

    // The requesting super_admin IS a named reviewer (super_admin category) with an undecided review.
    const asReviewer = await request(app).get('/api/v1/capability-registry/exceptions/pending');
    expect(asReviewer.body.exceptions.some((e: any) => e.moduleId === moduleId)).toBe(true);

    mockUser = { id: outsiderId, role: 'user' };
    const asOutsider = await request(app).get('/api/v1/capability-registry/exceptions/pending');
    expect(asOutsider.body.exceptions.some((e: any) => e.moduleId === moduleId)).toBe(false);
  });
});
