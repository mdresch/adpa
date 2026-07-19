import {
  syncDepartmentMembershipChange,
  MembershipChangeDeps
} from '../../../modules/departments/departmentMembershipService';

function makeDeps(activeRows: any[] = []): MembershipChangeDeps {
  return {
    db: {
      query: jest.fn((sql: string) => {
        if (/select/i.test(sql)) {
          return Promise.resolve({ rows: activeRows });
        }
        return Promise.resolve({ rows: [{ id: 'job-1' }] });
      })
    },
    queue: { enqueue: jest.fn().mockResolvedValue({ jobId: 'job-1' }) }
  };
}

describe('federated-capability-ownership: departmentMembershipService', () => {
  // REQ-DEPT-011: membership change recomputes full claims set and enqueues once
  describe('REQ-DEPT-011: membership change recomputes full claims set and enqueues once', () => {
    const activeRows = [
      { user_id: 'u1', portfolio_id: 'p1', department: 'Compliance', department_role: 'member', is_active: true },
      { user_id: 'u1', portfolio_id: 'p2', department: 'Legal', department_role: 'deputy', is_active: true }
    ];

    it('re-queries all active rows for the user rather than trusting only the changed row', async () => {
      const deps = makeDeps(activeRows);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: false, isActive: true });

      const selectCall = (deps.db.query as jest.Mock).mock.calls.find(([sql]) => /user_departments/i.test(sql));
      expect(selectCall).toBeDefined();
      expect(selectCall![1]).toEqual(['u1']);
    });

    it('builds the enqueued claim payload from every active row, not just the changed one', async () => {
      const deps = makeDeps(activeRows);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: false, isActive: true });

      const [, payload] = (deps.queue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.claims).toEqual(
        expect.arrayContaining([
          { portfolioId: 'p1', department: 'Compliance', role: 'member' },
          { portfolioId: 'p2', department: 'Legal', role: 'deputy' }
        ])
      );
      expect(payload.claims).toHaveLength(2);
    });

    it('enqueues exactly once per invocation', async () => {
      const deps = makeDeps(activeRows);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: true, isActive: true });

      expect(deps.queue.enqueue).toHaveBeenCalledTimes(1);
    });

    it('marks isRemoval true only on an active -> inactive transition', async () => {
      const deps = makeDeps(activeRows);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: true, isActive: false });

      const [, payload] = (deps.queue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.isRemoval).toBe(true);
    });

    it('does not mark isRemoval on an add transition', async () => {
      const deps = makeDeps(activeRows);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: false, isActive: true });

      const [, payload] = (deps.queue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.isRemoval).toBe(false);
    });

    it('excludes an inactive row even if the query layer returns one defensively', async () => {
      const rowsWithStale = [
        ...activeRows,
        { user_id: 'u1', portfolio_id: 'p1', department: 'Finance', department_role: 'member', is_active: false }
      ];
      const deps = makeDeps(rowsWithStale);
      await syncDepartmentMembershipChange(deps, { userId: 'u1', wasActive: true, isActive: true });

      const [, payload] = (deps.queue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.claims.some((c: any) => c.department === 'Finance')).toBe(false);
    });
  });
});
