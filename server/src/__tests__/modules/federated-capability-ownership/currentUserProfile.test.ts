import {
  resolveCurrentUserDepartments,
  DepartmentMembershipDeps
} from '../../../modules/departments/currentUserProfile';

function makeDeps(rows: any[] = []): DepartmentMembershipDeps {
  return {
    listActiveDepartmentsByUser: jest.fn().mockResolvedValue(rows)
  };
}

describe('federated-capability-ownership: currentUserProfile', () => {
  // REQ-DEPT-012: current-user profile lookup (ADR-012 PR1) resolves active department memberships
  describe('REQ-DEPT-012: current-user profile lookup resolves active department memberships', () => {
    it('shapes each active membership row into portfolioId/department/departmentRole', async () => {
      const deps = makeDeps([
        { id: 'row-1', userId: 'u1', portfolioId: 'p1', department: 'Compliance', departmentRole: 'member', isActive: true },
        { id: 'row-2', userId: 'u1', portfolioId: 'p2', department: 'Legal', departmentRole: 'deputy', isActive: true }
      ]);

      const result = await resolveCurrentUserDepartments('u1', deps);

      expect(result).toEqual([
        { portfolioId: 'p1', department: 'Compliance', departmentRole: 'member' },
        { portfolioId: 'p2', department: 'Legal', departmentRole: 'deputy' }
      ]);
    });

    it('returns an empty array, not a rejected promise, for a caller with no department rows', async () => {
      const deps = makeDeps([]);

      const result = await resolveCurrentUserDepartments('u-no-departments', deps);

      expect(result).toEqual([]);
    });

    it('passes the given userId through to the underlying lookup unchanged', async () => {
      const deps = makeDeps([]);

      await resolveCurrentUserDepartments('u-specific-id', deps);

      expect(deps.listActiveDepartmentsByUser).toHaveBeenCalledWith('u-specific-id');
    });
  });
});
