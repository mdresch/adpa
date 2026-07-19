/**
 * Real-Postgres proof for ADR-005 Phase 3 task 6 (see
 * docs/superpowers/specs/2026-07-13-federated-capability-ownership-phase3task6-design.md):
 * the structural-deadlock break-glass substitute (migration 441) -- the
 * deadlock-only trigger, reviewer auto-population, decline-disables-immediately,
 * super-admin-only activation, and the external_auditor proxy-decision path.
 * Auth is mocked (mirrors phase6/phase2task4's established pattern). Each `it`
 * runs inside a transaction that's rolled back afterward
 * (tests/setup/integration-setup.js).
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
  const moduleId = `phase3t6-test-${randomUUID()}`;
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

describe('ADR-005 Phase 3 task 6 integration: break-glass exceptions', () => {
  afterEach(() => {
    mockUser = undefined;
  });

  it('rejects raising an exception when the department has 2+ active members (not a deadlock)', async () => {
    const requesterId = await createTestUser();
    const memberA = await createTestUser();
    const memberB = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(requesterId, portfolioId);
    await addActiveMember(memberA, portfolioId);
    await addActiveMember(memberB, portfolioId);
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: requesterId, role: 'user' };
    const app = createApp();
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/structural deadlock/);
  });

  it('allows raising an exception when the department has 0 active members, populating real reviewers', async () => {
    const superAdminId = await createTestUser('super_admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency, zero members' });

    expect(response.status).toBe(201);
    expect(response.body.exception.exceptionReviewStatus).toBe('pending');
    // At minimum, the super_admin reviewer category should be populated (this test's own caller).
    expect(response.body.reviews.some((r: any) => r.reviewerCategory === 'super_admin')).toBe(true);
  });

  it('a decline from any one reviewer disables the capability and updates the exception status', async () => {
    const superAdminId = await createTestUser('super_admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;
    const reviewerRow = created.body.reviews.find((r: any) => r.reviewerCategory === 'super_admin');

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/reviews/${reviewerRow.id}/decide`)
      .send({ decision: 'declined', notes: 'not warranted' });

    expect(response.status).toBe(200);
    expect(response.body.exception.exceptionReviewStatus).toBe('disabled');

    const capability = await pool.query(`SELECT activation_status FROM capability_registry WHERE module_id = $1 AND portfolio_id = $2`, [
      moduleId,
      portfolioId
    ]);
    expect(capability.rows[0].activation_status).toBe('disabled');
  });

  it('rejects activation from an admin with no relationship to the target portfolio', async () => {
    const superAdminId = await createTestUser('super_admin');
    const adminId = await createTestUser('admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;

    mockUser = { id: adminId, role: 'admin' };
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/activate`)
      .send({});

    expect(response.status).toBe(403);
  });

  it("allows activation from an admin whose own company owns the target portfolio", async () => {
    const superAdminId = await createTestUser('super_admin');
    const adminId = await createTestUser('admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    const portfolioRow = await pool.query(`SELECT company_id FROM portfolio_governance WHERE id = $1`, [portfolioId]);
    await pool.query(`UPDATE users SET company_id = $1 WHERE id = $2`, [portfolioRow.rows[0].company_id, adminId]);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;

    mockUser = { id: adminId, role: 'admin' };
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/activate`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.capability.activationStatus).toBe('pending_department_approval');
  });

  it('rejects activation from a non-super_admin caller', async () => {
    const superAdminId = await createTestUser('super_admin');
    const plainUserId = await createTestUser('user');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;

    mockUser = { id: plainUserId, role: 'user' };
    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/activate`)
      .send({});

    expect(response.status).toBe(403);
  });

  it('allows a super_admin to activate a pending exception, promoting with isOverride=true', async () => {
    const superAdminId = await createTestUser('super_admin');
    const portfolioId = await createTestPortfolio();
    const moduleId = await createCapability(portfolioId);

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;

    const response = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/activate`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.capability.activationStatus).toBe('pending_department_approval');
    expect(response.body.exception.exceptionReviewStatus).toBe('active');

    const history = await pool.query(
      `SELECT is_override FROM capability_activation_history WHERE capability_id = (
         SELECT id FROM capability_registry WHERE module_id = $1 AND portfolio_id = $2
       ) ORDER BY changed_at DESC LIMIT 1`,
      [moduleId, portfolioId]
    );
    expect(history.rows[0].is_override).toBe(true);
  });

  it('lets an Internal Audit member decide an external_auditor review on their behalf, but not an arbitrary caller', async () => {
    const superAdminId = await createTestUser('super_admin');
    const internalAuditId = await createTestUser();
    const outsiderId = await createTestUser();
    const portfolioId = await createTestPortfolio();
    await addActiveMember(internalAuditId, portfolioId, 'Internal Audit');
    const moduleId = await createCapability(portfolioId);

    await pool.query(
      `UPDATE portfolio_governance SET external_auditor_contacts = $1 WHERE id = $2`,
      [JSON.stringify([{ label: 'Acme External Audit' }]), portfolioId]
    );

    mockUser = { id: superAdminId, role: 'super_admin' };
    const app = createApp();
    const created = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/request`)
      .send({ requestedNewStatus: 'pending_department_approval', justification: 'emergency' });
    const exceptionId = created.body.exception.id;
    const externalReview = created.body.reviews.find((r: any) => r.reviewerCategory === 'external_auditor');
    expect(externalReview).toBeDefined();

    mockUser = { id: outsiderId, role: 'user' };
    const rejected = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/reviews/${externalReview.id}/decide`)
      .send({ decision: 'approved' });
    expect(rejected.status).toBe(403);

    mockUser = { id: internalAuditId, role: 'user' };
    const accepted = await request(app)
      .post(`/api/v1/capability-registry/${moduleId}/${portfolioId}/exceptions/${exceptionId}/reviews/${externalReview.id}/decide`)
      .send({ decision: 'approved', notes: 'recorded on behalf of Acme External Audit' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.review.decision).toBe('approved');
  });
});
