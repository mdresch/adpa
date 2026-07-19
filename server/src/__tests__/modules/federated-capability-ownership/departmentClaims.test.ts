import {
  isValidDepartmentCode,
  buildDepartmentClaims,
  shouldRevokeRefreshTokens,
  UserDepartmentRow
} from '../../../modules/departments/departmentClaims';

describe('federated-capability-ownership: departmentClaims', () => {
  // REQ-DEPT-001: department code validation
  describe('REQ-DEPT-001: department code validation', () => {
    it('accepts every code in the fixed seed list', () => {
      const seeded = ['IT', 'Compliance', 'Legal', 'Finance', 'HR', 'Risk', 'Internal Audit'];
      seeded.forEach((code) => {
        expect(isValidDepartmentCode(code)).toBe(true);
      });
    });

    it('rejects a code outside the seed list, including near-miss typos', () => {
      expect(isValidDepartmentCode('Complience')).toBe(false);
      expect(isValidDepartmentCode('Sales')).toBe(false);
      expect(isValidDepartmentCode('')).toBe(false);
    });

    it('is case-sensitive — a lowercase variant of a real code is not itself valid', () => {
      expect(isValidDepartmentCode('compliance')).toBe(false);
    });
  });

  // REQ-DEPT-002: claims built only from active rows, scoped by portfolio
  describe('REQ-DEPT-002: claims built only from active rows', () => {
    const rows: UserDepartmentRow[] = [
      { userId: 'u1', portfolioId: 'p1', department: 'Compliance', departmentRole: 'member', isActive: true },
      { userId: 'u1', portfolioId: 'p2', department: 'Legal', departmentRole: 'deputy', isActive: true },
      { userId: 'u1', portfolioId: 'p1', department: 'Finance', departmentRole: 'member', isActive: false }
    ];

    it('includes one claim entry per active row, carrying portfolioId alongside department and role', () => {
      const claims = buildDepartmentClaims(rows);
      expect(claims).toEqual(
        expect.arrayContaining([
          { portfolioId: 'p1', department: 'Compliance', role: 'member' },
          { portfolioId: 'p2', department: 'Legal', role: 'deputy' }
        ])
      );
    });

    it('never includes a deactivated row in the resulting claims', () => {
      const claims = buildDepartmentClaims(rows);
      expect(claims.some((c) => c.department === 'Finance')).toBe(false);
      expect(claims).toHaveLength(2);
    });

    it('returns an empty claims array when every membership row is inactive', () => {
      const allInactive: UserDepartmentRow[] = [
        { userId: 'u1', portfolioId: 'p1', department: 'Compliance', departmentRole: 'member', isActive: false }
      ];
      expect(buildDepartmentClaims(allInactive)).toEqual([]);
    });
  });

  // REQ-DEPT-003: revoke only on active -> inactive transition
  describe('REQ-DEPT-003: revoke only on active→inactive transition', () => {
    it('requires revocation when a row transitions from active to inactive (removal)', () => {
      expect(shouldRevokeRefreshTokens({ wasActive: true, isActive: false })).toBe(true);
    });

    it('does not require revocation on add (was not active, now active)', () => {
      expect(shouldRevokeRefreshTokens({ wasActive: false, isActive: true })).toBe(false);
    });

    it('does not require revocation on an update that keeps the row active', () => {
      expect(shouldRevokeRefreshTokens({ wasActive: true, isActive: true })).toBe(false);
    });

    it('does not require revocation when a row stays inactive', () => {
      expect(shouldRevokeRefreshTokens({ wasActive: false, isActive: false })).toBe(false);
    });
  });
});
