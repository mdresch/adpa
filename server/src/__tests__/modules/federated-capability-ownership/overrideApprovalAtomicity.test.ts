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
  overrideExpiresAt: null
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

/**
 * markApproved's own body (unlike PR6b's later single-call delegation) does real
 * SELECT ... FOR UPDATE / UPDATE / audit_log work, so the shared mock client needs to
 * answer those query shapes too, not just promote_capability_status/decide_capability_
 * request.
 */
function defaultClientHandlers(sql: string) {
  const s = sql.trim();
  if (/^BEGIN|^COMMIT|^ROLLBACK/i.test(s)) return {};
  if (/promote_capability_status/.test(s)) return {};
  if (/SELECT \* FROM capability_override_requests WHERE id = \$1 FOR UPDATE/i.test(s)) {
    return { rows: [{ id: 'req-1', status: 'pending' }] };
  }
  if (/UPDATE capability_override_requests/i.test(s)) {
    return { rows: [{ id: 'req-1', status: 'approved' }] };
  }
  if (/INSERT INTO audit_log/i.test(s)) return {};
  return {};
}

// REQ-CAP-016: ADR-012 review finding (PR #742/#744/#746/#748) -- approve() must wrap
// promote_capability_status and markApproved's own decision write in one transaction.
describe('federated-capability-ownership: overrideApprovalAtomicity', () => {
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.restoreAllMocks();
    client = { query: jest.fn(async (sql: string) => defaultClientHandlers(sql)), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(client);

    jest.spyOn(CapabilityRegistryRepository.prototype, 'findFullByModuleAndPortfolio').mockResolvedValue(capability as any);
    jest.spyOn(CapabilityOverrideRequestRepository.prototype, 'findById').mockResolvedValue(overrideRequest as any);
    jest.spyOn(UserDepartmentRepository.prototype, 'isActiveMember').mockResolvedValue(true);
  });

  it('issues promote_capability_status and the decision UPDATE on the SAME client, inside one BEGIN/COMMIT', async () => {
    const controller = new CapabilityOverrideController();
    const { req, res } = fakeReqRes();

    await controller.approve(req, res);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    const calls = client.query.mock.calls.map(([sql]) => (sql as string).trim());
    expect(calls[0]).toMatch(/^BEGIN/i);
    expect(calls.some((s) => /promote_capability_status/.test(s))).toBe(true);
    expect(calls.some((s) => /^UPDATE capability_override_requests/i.test(s))).toBe(true);
    expect(calls[calls.length - 1]).toMatch(/^COMMIT/i);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect((pool.query as jest.Mock).mock.calls.some(([sql]) => /promote_capability_status/.test(sql))).toBe(false);
  });

  it('rolls back BOTH writes if the decision UPDATE finds the request already decided', async () => {
    client.query.mockImplementation(async (sql: string) => {
      const s = sql.trim();
      if (/^BEGIN|^ROLLBACK/i.test(s)) return {};
      if (/promote_capability_status/.test(s)) return {};
      if (/SELECT \* FROM capability_override_requests WHERE id = \$1 FOR UPDATE/i.test(s)) {
        return { rows: [{ id: 'req-1', status: 'withdrawn' }] };
      }
      if (/UPDATE capability_override_requests/i.test(s)) {
        return { rows: [] }; // AND status = 'pending' predicate: 0 rows, already decided
      }
      return {};
    });
    const controller = new CapabilityOverrideController();
    const { req, res } = fakeReqRes();

    await controller.approve(req, res);

    const calls = client.query.mock.calls.map(([sql]) => (sql as string).trim());
    expect(calls.some((s) => /promote_capability_status/.test(s))).toBe(true);
    expect(calls[calls.length - 1]).toMatch(/^ROLLBACK/i);
    expect(calls.some((s) => /^COMMIT/i.test(s))).toBe(false);
    expect(calls.some((s) => /INSERT INTO audit_log/i.test(s))).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
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
    expect(calls.some((s) => /^UPDATE capability_override_requests/i.test(s))).toBe(false); // never reached
    expect(calls[calls.length - 1]).toMatch(/^ROLLBACK/i);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
