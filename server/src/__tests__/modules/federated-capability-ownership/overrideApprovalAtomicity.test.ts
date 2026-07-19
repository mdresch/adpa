jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

import { pool } from '../../../database/connection';
import { CapabilityOverrideController } from '../../../modules/capabilityRegistry/CapabilityOverrideController';
import { CapabilityRegistryRepository } from '../../../modules/capabilityRegistry/CapabilityRegistryRepository';
import { CapabilityOverrideRequestRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideRequestRepository';
import { UserDepartmentRepository } from '../../../modules/departments/UserDepartmentRepository';

const capability = {
  id: 'cap-1',
  moduleId: 'rag',
  portfolioId: 'portfolio-1',
  platformOperator: 'adpa',
  functionalOwnerType: 'department',
  functionalOwnerDepartment: 'Compliance',
  controlDefinitionOwnerDepartment: null,
  activationStatus: 'pending_department_approval'
};

const overrideRequest = {
  id: 'req-1',
  capabilityId: 'cap-1',
  requestedNewStatus: 'active',
  dracoVerdictId: null,
  justification: 'needs approval',
  requestedBy: 'requester-1',
  requestedByDepartment: 'Compliance',
  requestedAt: '2026-07-18T00:00:00Z',
  status: 'pending' as const,
  approvedBy: null,
  approvedByDepartment: null,
  decidedAt: null,
  denialReason: null,
  overrideExpiresAt: null,
  withdrawnAt: null
};

function fakeReqRes() {
  const req: any = {
    params: { moduleId: 'rag', portfolioId: 'portfolio-1', requestId: 'req-1' },
    user: { id: 'approver-1', role: 'user' }
  };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

// REQ-CAP-016: ADR-012 review finding (PR #742/#744/#746/#748) -- approve() must wrap
// promote_capability_status and the request's own decision in one transaction, so a
// failure or a concurrent withdraw() between them can't leave the capability promoted
// with the request still pending/withdrawn.
describe('federated-capability-ownership: overrideApprovalAtomicity', () => {
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.restoreAllMocks();
    client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);

    jest.spyOn(CapabilityRegistryRepository.prototype, 'findFullByModuleAndPortfolio').mockResolvedValue(capability as any);
    jest.spyOn(CapabilityOverrideRequestRepository.prototype, 'findById').mockResolvedValue(overrideRequest as any);
    jest.spyOn(UserDepartmentRepository.prototype, 'isActiveMember').mockResolvedValue(true);
  });

  it('issues promote_capability_status and the decide_capability_request delegation on the SAME client, inside one BEGIN/COMMIT', async () => {
    const controller = new CapabilityOverrideController();
    const { req, res } = fakeReqRes();

    await controller.approve(req, res);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    const calls = client.query.mock.calls.map(([sql]) => (sql as string).trim());
    expect(calls[0]).toMatch(/^BEGIN/i);
    expect(calls.some((s) => /promote_capability_status/.test(s))).toBe(true);
    expect(calls.some((s) => /decide_capability_request/.test(s))).toBe(true);
    expect(calls[calls.length - 1]).toMatch(/^COMMIT/i);
    expect(client.release).toHaveBeenCalledTimes(1);
    // Neither write went through the bare (non-transactional) pool.query.
    expect((pool.query as jest.Mock).mock.calls.some(([sql]) => /promote_capability_status|decide_capability_request/.test(sql))).toBe(
      false
    );
  });

  it('rolls back BOTH writes if the decide_capability_request delegation fails after promote_capability_status already ran', async () => {
    client.query.mockImplementation(async (sql: string) => {
      const s = sql.trim();
      if (/^BEGIN|^ROLLBACK/i.test(s)) return {};
      if (/promote_capability_status/.test(s)) return {};
      if (/decide_capability_request/.test(s)) throw new Error('capability_override_request req-1 has already been decided (status: withdrawn)');
      return {};
    });
    const controller = new CapabilityOverrideController();
    const { req, res } = fakeReqRes();

    await controller.approve(req, res);

    const calls = client.query.mock.calls.map(([sql]) => (sql as string).trim());
    expect(calls.some((s) => /promote_capability_status/.test(s))).toBe(true);
    expect(calls[calls.length - 1]).toMatch(/^ROLLBACK/i);
    expect(calls.some((s) => /^COMMIT/i.test(s))).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
    // The controller's own catch block classifies "has already been decided" as a
    // known rejection -> 400, not a 500 -- proving the rollback path still surfaces a
    // clean error rather than swallowing it or crashing.
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('releases the client even if promote_capability_status itself throws', async () => {
    client.query.mockImplementation(async (sql: string) => {
      const s = sql.trim();
      if (/^BEGIN|^ROLLBACK/i.test(s)) return {};
      if (/promote_capability_status/.test(s)) throw new Error('illegal activation_status transition');
      return {};
    });
    const controller = new CapabilityOverrideController();
    const { req, res } = fakeReqRes();

    await controller.approve(req, res);

    const calls = client.query.mock.calls.map(([sql]) => (sql as string).trim());
    expect(calls.some((s) => /decide_capability_request/.test(s))).toBe(false); // never reached
    expect(calls[calls.length - 1]).toMatch(/^ROLLBACK/i);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
