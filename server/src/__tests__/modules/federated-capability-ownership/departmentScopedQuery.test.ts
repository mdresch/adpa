import { Pool } from 'pg';
import { buildAdminOrActiveDepartmentMemberClause } from '../../../modules/capabilityRegistry/departmentScopedQuery';
import { CapabilityOverrideRequestRepository } from '../../../modules/capabilityRegistry/CapabilityOverrideRequestRepository';

function fakePool(rows: any[] = []) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: departmentScopedQuery', () => {
  // REQ-CAP-010: shared admin-sees-all/member-sees-own-department scoping clause
  describe('REQ-CAP-010: buildAdminOrActiveDepartmentMemberClause', () => {
    it('builds an admin-bypass-or-active-membership EXISTS clause parameterized by the given columns', () => {
      const clause = buildAdminOrActiveDepartmentMemberClause({
        portfolioColumn: 'cr.portfolio_id',
        departmentColumn: 'r.requested_by_department'
      });

      expect(clause).toContain('$1::boolean = true');
      expect(clause).toContain('EXISTS');
      expect(clause).toContain('ud.user_id = $2');
      expect(clause).toContain('ud.portfolio_id = cr.portfolio_id');
      expect(clause).toContain('ud.department = r.requested_by_department');
      expect(clause).toContain('ud.is_active = true');
    });

    it('interpolates a different column pair for a different consumer (e.g. the capability-registry list endpoint)', () => {
      const clause = buildAdminOrActiveDepartmentMemberClause({
        portfolioColumn: 'cr.portfolio_id',
        departmentColumn: 'cr.functional_owner_department'
      });

      expect(clause).toContain('ud.department = cr.functional_owner_department');
      expect(clause).not.toContain('requested_by_department');
    });

    it('never renumbers $1/$2 -- callers own the surrounding query\'s parameter order', () => {
      const clause = buildAdminOrActiveDepartmentMemberClause({
        portfolioColumn: 'cr.portfolio_id',
        departmentColumn: 'r.requested_by_department'
      });

      expect((clause.match(/\$1/g) ?? []).length).toBe(1);
      expect((clause.match(/\$2/g) ?? []).length).toBe(1);
      expect(clause).not.toContain('$3');
    });
  });

  // REQ-CAP-010: CapabilityOverrideRequestRepository.listPendingForUser now consumes the
  // shared clause -- behavior-preserving, same SQL shape and param order as before extraction.
  describe('REQ-CAP-010: CapabilityOverrideRequestRepository.listPendingForUser wiring', () => {
    it('sends isAdmin then userId as $1/$2, matching the shared clause\'s expected binding order', async () => {
      const pool = fakePool();
      const repo = new CapabilityOverrideRequestRepository(pool);

      await repo.listPendingForUser('user-123', false);

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(params).toEqual([false, 'user-123']);
      expect(sql).toContain('$1::boolean = true');
      expect(sql).toContain('ud.user_id = $2');
      expect(sql).toContain('ud.department = r.requested_by_department');
    });
  });
});
