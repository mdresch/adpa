import { Pool } from 'pg';
import { CapabilityOverrideRequestRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideRequestRepository';
import { CapabilityOverrideExceptionRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideExceptionRepository';

function fakePool(rows: any[] = []) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: myRequests', () => {
  // REQ-CAP-014: ADR-012 PR6d -- withdraw + My Requests (own-requests listing)
  describe('REQ-CAP-014: CapabilityOverrideRequestRepository.withdraw/listOwnRequests', () => {
    it('withdraw() calls decide_capability_request with the withdrawn decision and no department/reason', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);

      await repo.withdraw('req-1', 'requester-1');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('decide_capability_request');
      expect(sql).toContain("'withdrawn'");
      expect(params).toEqual(['req-1', 'requester-1']);
    });

    it('listOwnRequests() scopes by requested_by only, no admin/department branching', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);

      await repo.listOwnRequests('requester-1');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/WHERE r\.requested_by = \$1/);
      expect(sql).not.toMatch(/\$1::boolean/); // not the admin-sees-all shape -- this is always "mine"
      expect(params).toEqual(['requester-1']);
    });

    it('listOwnRequests() maps rows to the same PendingOverrideRequestRow shape listPendingForUser uses', async () => {
      const pool = fakePool([
        {
          id: 'req-1',
          capability_id: 'cap-1',
          requested_new_status: 'active',
          draco_verdict_id: null,
          justification: 'need it',
          requested_by: 'requester-1',
          requested_by_department: 'Compliance',
          requested_at: '2026-07-18T00:00:00Z',
          status: 'withdrawn',
          approved_by: null,
          approved_by_department: null,
          decided_at: null,
          denial_reason: null,
          override_expires_at: null,
          withdrawn_at: '2026-07-18T01:00:00Z',
          module_id: 'rag',
          portfolio_id: 'portfolio-1'
        }
      ]);
      const repo = new CapabilityOverrideRequestRepository(pool);

      const result = await repo.listOwnRequests('requester-1');

      expect(result).toEqual([
        expect.objectContaining({
          id: 'req-1',
          moduleId: 'rag',
          portfolioId: 'portfolio-1',
          status: 'withdrawn',
          withdrawnAt: '2026-07-18T01:00:00Z'
        })
      ]);
    });
  });

  describe('REQ-CAP-014: CapabilityOverrideExceptionRepository.listOwnExceptions', () => {
    it('scopes by raised_by only, no reviewer-assignment branching (read-only in My Requests)', async () => {
      const pool = fakePool([]);
      const repo = new CapabilityOverrideExceptionRepository(pool);

      await repo.listOwnExceptions('requester-1');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/WHERE e\.raised_by = \$1/);
      expect(params).toEqual(['requester-1']);
    });
  });
});
