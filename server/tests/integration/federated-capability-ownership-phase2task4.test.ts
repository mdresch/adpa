/**
 * Real-Postgres proof for ADR-005 Phase 2 task 4 (see
 * docs/superpowers/specs/2026-07-13-federated-capability-ownership-phase2task4-design.md):
 * the two-distinct-department-member override request/approve/deny flow
 * (migration 440), built entirely Node-side. Auth is mocked (mirrors
 * federated-capability-ownership-phase6.test.ts's established pattern) --
 * this tests the real authorization + real stored procedure, not Firebase
 * token verification. Each `it` runs inside a transaction that's rolled back
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

async function createCapability(portfolioId: string, functionalOwnerDepartment = 'Compliance'): Promise<string> {
  const moduleId = `phase2t4-test-${randomUUID()}`;
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

describe('ADR-005 Phase 2 task 4 integration: override request/approve/deny', () => {
  afterEach(() => {
    mockUser = undefined;
  });

  it('rejects a request from a non-member', async () => {
    const userId = await createTestUser();
    mockUser = { id: userId, role: 'user' };
    const app = createApp();
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });

    expect(response.status).toBe(403);
  });

  it('allows an active member to create a pending request', async () => {
    const userId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(userId, portfolioId);
    const moduleId = await createCapability(portfolioId);
    mockUser = { id: userId, role: 'user' };
    const app = createApp();

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });

    expect(response.status).toBe(201);
    expect(response.body.overrideRequest.status).toBe('pending');
  });

  it('rejects the requester approving their own request', async () => {
    const userId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(userId, portfolioId);
    const moduleId = await createCapability(portfolioId);
    mockUser = { id: userId, role: 'user' };
    const app = createApp();

    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });
    const requestId = created.body.overrideRequest.id;

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/${requestId}/approve`)
      .send({});

    expect(response.status).toBe(403);
  });

  it('allows a different active member to approve, promoting the capability with isOverride=true', async () => {
    const requesterId = await createTestUser();
    const approverId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId);
    await addActiveMember(approverId, portfolioId);
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });
    const requestId = created.body.overrideRequest.id;

    mockUser = { id: approverId, role: 'user' };
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/${requestId}/approve`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.capability.activationStatus).toBe('pending_department_approval');
    expect(response.body.overrideRequest.status).toBe('approved');
    expect(response.body.overrideRequest.overrideExpiresAt).not.toBeNull();

    const history = await pool.query(
      `SELECT is_override, override_expires_at FROM capability_activation_history WHERE capability_id = (
         SELECT id FROM capability_registry WHERE module_id = $1 AND portfolio_id = $2
       ) ORDER BY changed_at DESC LIMIT 1`,
      [moduleId, portfolioId]
    );
    expect(history.rows[0].is_override).toBe(true);
    expect(history.rows[0].override_expires_at).not.toBeNull();
  });

  it('allows a different active member to deny, recording a reason without touching activation_status', async () => {
    const requesterId = await createTestUser();
    const denierId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId);
    await addActiveMember(denierId, portfolioId);
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });
    const requestId = created.body.overrideRequest.id;

    mockUser = { id: denierId, role: 'user' };
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/${requestId}/deny`)
      .send({ reason: 'not justified' });

    expect(response.status).toBe(200);
    expect(response.body.overrideRequest.status).toBe('denied');
    expect(response.body.overrideRequest.denialReason).toBe('not justified');

    const capability = await pool.query(`SELECT activation_status FROM capability_registry WHERE module_id = $1 AND portfolio_id = $2`, [
      moduleId,
      portfolioId
    ]);
    expect(capability.rows[0].activation_status).toBe('draft');
  });

  it('rejects deciding an already-decided request', async () => {
    const requesterId = await createTestUser();
    const approverId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId);
    await addActiveMember(approverId, portfolioId);
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'need it now' });
    const requestId = created.body.overrideRequest.id;

    mockUser = { id: approverId, role: 'user' };
    await request(app).post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/${requestId}/approve`).send({});

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/override/${requestId}/deny`)
      .send({ reason: 'too late' });

    expect(response.status).toBe(400);
  });
});
