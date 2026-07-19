import { Pool } from 'pg';
import { CapabilityRegistryRepository } from '../../../modules/capabilityRegistry/CapabilityRegistryRepository';

function fakePool(rows: any[] = []) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: capabilityRegistryList', () => {
  // REQ-CAP-012: GET /api/v1/capability-registry list surface (ADR-012 PR4)
  describe('REQ-CAP-012: CapabilityRegistryRepository.listForUser', () => {
    it('sends isAdmin then userId as $1/$2, reusing PR2\'s shared department-scope clause', async () => {
      const pool = fakePool();
      const repo = new CapabilityRegistryRepository(pool);

      await repo.listForUser('user-123', false);

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(params).toEqual([false, 'user-123']);
      expect(sql).toContain('$1::boolean = true');
      expect(sql).toContain('ud.user_id = $2');
    });

    it('scopes by the capability\'s own functional_owner_department column, not a request table', async () => {
      const pool = fakePool();
      const repo = new CapabilityRegistryRepository(pool);

      await repo.listForUser('user-123', false);

      const [sql] = (pool.query as jest.Mock).mock.calls[0];
      // Divergence PR2's helper exists to prevent: this list must scope by the
      // capability's own column, never by joining a request table (a capability with
      // zero pending requests would otherwise be invisible to its own department).
      expect(sql).toMatch(/FROM capability_registry/i);
      expect(sql).not.toMatch(/JOIN capability_override_requests/i);
      expect(sql).not.toMatch(/requested_by_department/i);
      expect(sql).toMatch(/functional_owner_department/i);
    });

    it('maps each row to the full camelCase shape (id, moduleId, portfolioId, activationStatus, functionalOwnerDepartment)', async () => {
      const pool = fakePool([
        {
          id: 'cap-1',
          module_id: 'rag',
          portfolio_id: 'portfolio-1',
          platform_operator: 'IT',
          functional_owner_type: 'department',
          functional_owner_department: 'Compliance',
          control_definition_owner_department: null,
          activation_status: 'active'
        }
      ]);
      const repo = new CapabilityRegistryRepository(pool);

      const result = await repo.listForUser('user-123', true);

      expect(result).toEqual([
        {
          id: 'cap-1',
          moduleId: 'rag',
          portfolioId: 'portfolio-1',
          platformOperator: 'IT',
          functionalOwnerType: 'department',
          functionalOwnerDepartment: 'Compliance',
          controlDefinitionOwnerDepartment: null,
          activationStatus: 'active'
        }
      ]);
    });

    it('returns an empty array, not a rejected promise, when the caller has no scoped rows', async () => {
      const pool = fakePool([]);
      const repo = new CapabilityRegistryRepository(pool);

      const result = await repo.listForUser('user-with-no-departments', false);

      expect(result).toEqual([]);
    });
  });
});
