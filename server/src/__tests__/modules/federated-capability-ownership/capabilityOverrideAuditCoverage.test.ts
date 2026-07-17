import { Pool, PoolClient } from 'pg';
import { insertAuditLogDigest } from '../../../modules/capabilityRegistry/auditLogCoverage';
import { CapabilityOverrideRequestRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideRequestRepository';
import { CapabilityOverrideExceptionRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideExceptionRepository';

function fakeClient(overrides: { failOnAuditInsert?: boolean } = {}) {
  const client = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      const s = sql.trim();
      if (/^BEGIN/i.test(s)) return {};
      if (/^COMMIT/i.test(s)) return {};
      if (/^ROLLBACK/i.test(s)) return {};
      if (/INSERT INTO capability_override_requests/i.test(s)) {
        return { rows: [{ id: 'req-1', capability_id: 'cap-1', status: 'pending', requested_by: 'user-1', requested_by_department: 'Compliance', justification: 'a secret justification' }] };
      }
      if (/SELECT \* FROM capability_override_requests WHERE id = \$1/i.test(s)) {
        return { rows: [{ id: 'req-1', status: 'pending', justification: 'a secret justification' }] };
      }
      if (/UPDATE capability_override_requests/i.test(s)) {
        return { rows: [{ id: 'req-1', status: 'approved', justification: 'a secret justification' }] };
      }
      if (/INSERT INTO capability_override_exceptions/i.test(s)) {
        return { rows: [{ id: 'exc-1', capability_id: 'cap-1', raised_by: 'user-1', justification: 'a secret justification' }] };
      }
      if (/SELECT \* FROM override_exception_reviews WHERE id = \$1/i.test(s)) {
        return { rows: [{ id: 'rev-1', exception_id: 'exc-1', reviewer_user_id: 'user-2', decision: null }] };
      }
      if (/UPDATE override_exception_reviews/i.test(s)) {
        return { rows: [{ id: 'rev-1', exception_id: 'exc-1', reviewer_user_id: 'user-2', decision: 'approved' }] };
      }
      if (/INSERT INTO audit_log/i.test(s)) {
        if (overrides.failOnAuditInsert) throw new Error('audit_log insert failed');
        return {};
      }
      return { rows: [], params };
    }),
    release: jest.fn()
  };
  return client;
}

function poolWithClient(client: any) {
  return { connect: jest.fn().mockResolvedValue(client) } as unknown as Pool;
}

function fakePool(rows: any[] = []) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: capabilityOverrideAuditCoverage', () => {
  // REQ-CAP-011: shared audit_log digest-insert helper
  describe('REQ-CAP-011: insertAuditLogDigest', () => {
    it('routes old/new row content through capability_row_digest, never storing the raw row directly', async () => {
      const client = { query: jest.fn().mockResolvedValue({}) } as unknown as PoolClient;

      await insertAuditLogDigest(client, {
        tableName: 'capability_override_requests',
        rowId: 'req-1',
        action: 'create',
        actorUserId: 'user-1',
        newRow: { id: 'req-1', justification: 'a secret justification' }
      });

      const [sql, params] = (client.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('capability_row_digest($5::jsonb)');
      expect(sql).not.toMatch(/new_values\s*=\s*\$5::jsonb\)/); // never stored as-is, only via the digest function
      expect(params[0]).toBe('capability_override_requests');
      expect(params[1]).toBe('req-1');
      expect(params[2]).toBe('create');
      expect(params[3]).toBe('user-1');
    });

    it('passes NULL for old_values when no oldRow is given, without calling the digest function on it', async () => {
      const client = { query: jest.fn().mockResolvedValue({}) } as unknown as PoolClient;

      await insertAuditLogDigest(client, {
        tableName: 'capability_override_requests',
        rowId: 'req-1',
        action: 'create',
        actorUserId: 'user-1',
        newRow: { id: 'req-1' }
      });

      const [, params] = (client.query as jest.Mock).mock.calls[0];
      expect(params[4]).toBeNull();
    });
  });

  // REQ-CAP-011: CapabilityOverrideRequestRepository writes now transactionally audited
  describe('REQ-CAP-011: CapabilityOverrideRequestRepository.create/markApproved/markDenied', () => {
    it('create() wraps the insert and the audit_log insert in one BEGIN/COMMIT transaction on one client', async () => {
      const client = fakeClient();
      const repo = new CapabilityOverrideRequestRepository(poolWithClient(client));

      await repo.create({
        capabilityId: 'cap-1',
        requestedNewStatus: 'pending_department_approval',
        dracoVerdictId: null,
        justification: 'a secret justification',
        requestedBy: 'user-1',
        requestedByDepartment: 'Compliance'
      });

      const sqlSeq = (client.query as jest.Mock).mock.calls.map(([sql]) => sql.trim());
      expect(sqlSeq[0]).toMatch(/^BEGIN/i);
      expect(sqlSeq.some((s: string) => /INSERT INTO capability_override_requests/i.test(s))).toBe(true);
      expect(sqlSeq.some((s: string) => /INSERT INTO audit_log/i.test(s))).toBe(true);
      expect(sqlSeq[sqlSeq.length - 1]).toMatch(/^COMMIT/i);
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('create() rolls back the request insert if the audit_log insert fails', async () => {
      const client = fakeClient({ failOnAuditInsert: true });
      const repo = new CapabilityOverrideRequestRepository(poolWithClient(client));

      await expect(
        repo.create({
          capabilityId: 'cap-1',
          requestedNewStatus: 'pending_department_approval',
          dracoVerdictId: null,
          justification: 'a secret justification',
          requestedBy: 'user-1',
          requestedByDepartment: 'Compliance'
        })
      ).rejects.toThrow('audit_log insert failed');

      const sqlSeq = (client.query as jest.Mock).mock.calls.map(([sql]) => sql.trim());
      expect(sqlSeq[sqlSeq.length - 1]).toMatch(/^ROLLBACK/i);
      expect(sqlSeq.some((s: string) => /^COMMIT/i.test(s))).toBe(false);
      expect(client.release).toHaveBeenCalledTimes(1);
    });

  });

  // REQ-CAP-013 (ADR-012 PR6b): markApproved/markDenied now delegate entirely to
  // decide_capability_request -- the procedure performs its own UPDATE and its own
  // audit_log insert atomically, so there is no longer a TS-managed transaction or a
  // bare UPDATE for these two methods to get wrong.
  describe('REQ-CAP-013: CapabilityOverrideRequestRepository.markApproved/markDenied delegate to decide_capability_request', () => {
    it('markApproved() calls decide_capability_request with the approved decision and no reason', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);
      const expiresAt = new Date();

      await repo.markApproved('req-1', 'approver-1', 'Compliance', expiresAt);

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('decide_capability_request');
      expect(sql).toContain("'approved'");
      expect(params).toEqual(['req-1', 'approver-1', 'Compliance', expiresAt]);
    });

    it('markDenied() calls decide_capability_request with the denied decision and the denial reason', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);

      await repo.markDenied('req-1', 'denier-1', 'Compliance', 'not justified');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('decide_capability_request');
      expect(sql).toContain("'denied'");
      expect(params).toEqual(['req-1', 'denier-1', 'Compliance', 'not justified']);
    });

    it('neither method issues a bare UPDATE or manages its own BEGIN/COMMIT transaction anymore', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);

      await repo.markApproved('req-1', 'approver-1', 'Compliance', new Date());
      await repo.markDenied('req-2', 'denier-1', 'Compliance', 'reason');

      const allSql = (pool.query as jest.Mock).mock.calls.map(([sql]) => (sql as string).trim());
      expect(allSql.every((sql: string) => !/^UPDATE/i.test(sql))).toBe(true);
      expect(allSql.every((sql: string) => !/^BEGIN/i.test(sql))).toBe(true);
    });
  });

  // REQ-CAP-011: CapabilityOverrideExceptionRepository writes now transactionally audited
  describe('REQ-CAP-011: CapabilityOverrideExceptionRepository.createException/decideReview', () => {
    it('createException() wraps the insert and the audit_log insert in one transaction', async () => {
      const client = fakeClient();
      const repo = new CapabilityOverrideExceptionRepository(poolWithClient(client));

      await repo.createException({
        capabilityId: 'cap-1',
        requestedNewStatus: 'pending_department_approval',
        dracoVerdictId: null,
        justification: 'a secret justification',
        raisedBy: 'user-1'
      });

      const sqlSeq = (client.query as jest.Mock).mock.calls.map(([sql]) => sql.trim());
      expect(sqlSeq[0]).toMatch(/^BEGIN/i);
      expect(sqlSeq.some((s: string) => /INSERT INTO capability_override_exceptions/i.test(s))).toBe(true);
      expect(sqlSeq.some((s: string) => /INSERT INTO audit_log/i.test(s))).toBe(true);
      expect(sqlSeq[sqlSeq.length - 1]).toMatch(/^COMMIT/i);
    });

    it('decideReview() wraps the update and the audit_log insert in one transaction', async () => {
      const client = fakeClient();
      const repo = new CapabilityOverrideExceptionRepository(poolWithClient(client));

      await repo.decideReview('rev-1', 'approved', null);

      const sqlSeq = (client.query as jest.Mock).mock.calls.map(([sql]) => sql.trim());
      expect(sqlSeq[0]).toMatch(/^BEGIN/i);
      expect(sqlSeq.some((s: string) => /UPDATE override_exception_reviews/i.test(s))).toBe(true);
      expect(sqlSeq.some((s: string) => /INSERT INTO audit_log/i.test(s))).toBe(true);
      expect(sqlSeq[sqlSeq.length - 1]).toMatch(/^COMMIT/i);
    });

    it('decideReview() rolls back if the audit_log insert fails', async () => {
      const client = fakeClient({ failOnAuditInsert: true });
      const repo = new CapabilityOverrideExceptionRepository(poolWithClient(client));

      await expect(repo.decideReview('rev-1', 'declined', 'not enough evidence')).rejects.toThrow();

      const sqlSeq = (client.query as jest.Mock).mock.calls.map(([sql]) => sql.trim());
      expect(sqlSeq[sqlSeq.length - 1]).toMatch(/^ROLLBACK/i);
    });
  });
});
