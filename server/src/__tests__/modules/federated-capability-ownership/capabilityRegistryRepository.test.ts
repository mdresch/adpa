import { Pool } from 'pg';
import { CapabilityRegistryRepository } from '../../../modules/capabilityRegistry/CapabilityRegistryRepository';

function fakePool(rows: any[] = []) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: capabilityRegistry lookup (Phase 2 support)', () => {
  // REQ-CAP-007: capability registry lookup returns the row when found, scoped by module + portfolio
  describe('REQ-CAP-007: findByModuleAndPortfolio returns the row when found', () => {
    it('scopes the query by both module_id and portfolio_id, not module_id alone', async () => {
      const pool = fakePool([
        {
          module_id: 'compliance',
          portfolio_id: 'p1',
          platform_operator: 'IT',
          functional_owner_type: 'department',
          functional_owner_department: 'Compliance',
          control_definition_owner_department: 'Legal'
        }
      ]);
      const repo = new CapabilityRegistryRepository(pool);

      const row = await repo.findByModuleAndPortfolio('compliance', 'p1');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/module_id\s*=\s*\$1/i);
      expect(sql).toMatch(/portfolio_id\s*=\s*\$2/i);
      expect(params).toEqual(['compliance', 'p1']);
      expect(row).toEqual({
        moduleId: 'compliance',
        portfolioId: 'p1',
        platformOperator: 'IT',
        functionalOwnerType: 'department',
        functionalOwnerDepartment: 'Compliance',
        controlDefinitionOwnerDepartment: 'Legal'
      });
    });
  });

  // REQ-CAP-008: capability registry lookup returns null, not a thrown error, when no row matches
  describe('REQ-CAP-008: findByModuleAndPortfolio returns null when not found', () => {
    it('returns null rather than throwing when no row matches the (module_id, portfolio_id) pair', async () => {
      const pool = fakePool([]);
      const repo = new CapabilityRegistryRepository(pool);

      const row = await repo.findByModuleAndPortfolio('unknown-module', 'p1');

      expect(row).toBeNull();
    });
  });
});
