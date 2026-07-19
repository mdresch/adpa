import { Pool } from 'pg';
import { CapabilityOverrideRequestRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideRequestRepository';
import { CapabilityOverrideExceptionRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideExceptionRepository';

function fakePool(...results: any[][]) {
  const query = jest.fn();
  for (const rows of results) {
    query.mockResolvedValueOnce({ rows });
  }
  return { query } as unknown as Pool;
}

const sampleOverrideRow = {
  id: 'req-1',
  capability_id: 'cap-1',
  requested_new_status: 'active',
  draco_verdict_id: null,
  justification: 'need it',
  requested_by: 'requester-1',
  requested_by_department: 'Compliance',
  requested_at: '2026-07-18T00:00:00Z',
  status: 'approved',
  approved_by: 'approver-1',
  approved_by_department: 'Compliance',
  decided_at: '2026-07-18T01:00:00Z',
  denial_reason: null,
  override_expires_at: null,
  withdrawn_at: null,
  module_id: 'rag',
  portfolio_id: 'portfolio-1',
  chain_entry_id: 'audit-2',
  chain_recorded_at: '2026-07-18T01:00:00Z'
};

const sampleExceptionRow = {
  id: 'exc-1',
  capability_id: 'cap-1',
  requested_new_status: 'active',
  draco_verdict_id: null,
  justification: 'deadlock',
  raised_by: 'requester-1',
  raised_at: '2026-07-18T00:00:00Z',
  exception_review_status: 'pending',
  activated_by: null,
  activated_at: null,
  module_id: 'rag',
  portfolio_id: 'portfolio-1',
  chain_entry_id: 'audit-1',
  chain_recorded_at: '2026-07-18T00:00:00Z'
};

// REQ-CAP-015: ADR-012 PR8 -- visible provenance marker (Chain Entry / Recorded)
describe('federated-capability-ownership: chainProvenance', () => {
  describe('CapabilityOverrideRequestRepository', () => {
    it('listPendingForUser() joins the latest audit_log row for each request via table_name/row_id', async () => {
      const pool = fakePool([sampleOverrideRow]);
      const repo = new CapabilityOverrideRequestRepository(pool);

      const result = await repo.listPendingForUser('user-1', false);

      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LEFT JOIN LATERAL/);
      expect(sql).toMatch(/table_name = 'capability_override_requests'/);
      expect(sql).toMatch(/row_id = r\.id/);
      expect(sql).toMatch(/ORDER BY al\.occurred_at DESC\s+LIMIT 1/);
      expect(result[0]).toEqual(
        expect.objectContaining({ chainEntryId: 'audit-2', chainRecordedAt: '2026-07-18T01:00:00Z' })
      );
    });

    it('listOwnRequests() joins the latest audit_log row the same way as listPendingForUser', async () => {
      const pool = fakePool([sampleOverrideRow]);
      const repo = new CapabilityOverrideRequestRepository(pool);

      const result = await repo.listOwnRequests('requester-1');

      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LEFT JOIN LATERAL/);
      expect(sql).toMatch(/table_name = 'capability_override_requests'/);
      expect(result[0]).toEqual(
        expect.objectContaining({ chainEntryId: 'audit-2', chainRecordedAt: '2026-07-18T01:00:00Z' })
      );
    });

    it('maps a missing chain entry to null rather than undefined', async () => {
      const pool = fakePool([{ ...sampleOverrideRow, chain_entry_id: null, chain_recorded_at: null }]);
      const repo = new CapabilityOverrideRequestRepository(pool);

      const result = await repo.listOwnRequests('requester-1');

      expect(result[0].chainEntryId).toBeNull();
      expect(result[0].chainRecordedAt).toBeNull();
    });
  });

  describe('CapabilityOverrideExceptionRepository', () => {
    it('listPendingForUser() joins the create-time audit_log row for each exception via table_name/row_id', async () => {
      // First call: the exception list query itself. Second call: listReviews() for exc-1.
      const pool = fakePool([sampleExceptionRow], []);
      const repo = new CapabilityOverrideExceptionRepository(pool);

      const result = await repo.listPendingForUser('user-1', true);

      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LEFT JOIN LATERAL/);
      expect(sql).toMatch(/table_name = 'capability_override_exceptions'/);
      expect(sql).toMatch(/row_id = e\.id/);
      expect(result[0]).toEqual(
        expect.objectContaining({ chainEntryId: 'audit-1', chainRecordedAt: '2026-07-18T00:00:00Z' })
      );
    });

    it('listOwnExceptions() joins the create-time audit_log row the same way as listPendingForUser', async () => {
      const pool = fakePool([sampleExceptionRow], []);
      const repo = new CapabilityOverrideExceptionRepository(pool);

      const result = await repo.listOwnExceptions('requester-1');

      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LEFT JOIN LATERAL/);
      expect(sql).toMatch(/table_name = 'capability_override_exceptions'/);
      expect(result[0]).toEqual(
        expect.objectContaining({ chainEntryId: 'audit-1', chainRecordedAt: '2026-07-18T00:00:00Z' })
      );
    });
  });
});
