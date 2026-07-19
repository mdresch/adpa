import { buildReviewerSet } from '../../../modules/capabilityRegistry/buildReviewerSet';

describe('federated-capability-ownership: buildReviewerSet', () => {
  // REQ-PHASE3T6-001
  describe('REQ-PHASE3T6-001: one candidate per real reviewer, graceful omission when unset', () => {
    it('includes account_owner and manager when set', () => {
      const result = buildReviewerSet({
        accountOwnerId: 'owner-1',
        managerId: 'manager-1',
        internalAuditUserIds: [],
        externalAuditorContacts: [],
        superAdminUserIds: []
      });
      expect(result).toEqual([
        { category: 'account_owner', userId: 'owner-1', label: null },
        { category: 'manager', userId: 'manager-1', label: null }
      ]);
    });

    it('omits account_owner and manager entirely when both are null', () => {
      const result = buildReviewerSet({
        accountOwnerId: null,
        managerId: null,
        internalAuditUserIds: [],
        externalAuditorContacts: [],
        superAdminUserIds: []
      });
      expect(result).toEqual([]);
    });

    it('produces one candidate per internal_audit member, not one per category', () => {
      const result = buildReviewerSet({
        accountOwnerId: null,
        managerId: null,
        internalAuditUserIds: ['ia-1', 'ia-2', 'ia-3'],
        externalAuditorContacts: [],
        superAdminUserIds: []
      });
      expect(result).toEqual([
        { category: 'internal_audit', userId: 'ia-1', label: null },
        { category: 'internal_audit', userId: 'ia-2', label: null },
        { category: 'internal_audit', userId: 'ia-3', label: null }
      ]);
    });

    it('produces one candidate per super_admin member, not one per category', () => {
      const result = buildReviewerSet({
        accountOwnerId: null,
        managerId: null,
        internalAuditUserIds: [],
        externalAuditorContacts: [],
        superAdminUserIds: ['admin-1', 'admin-2']
      });
      expect(result).toEqual([
        { category: 'super_admin', userId: 'admin-1', label: null },
        { category: 'super_admin', userId: 'admin-2', label: null }
      ]);
    });

    it('produces one label-only candidate per external_auditor contact, no userId', () => {
      const result = buildReviewerSet({
        accountOwnerId: null,
        managerId: null,
        internalAuditUserIds: [],
        externalAuditorContacts: [{ label: 'Acme Audit LLC' }],
        superAdminUserIds: []
      });
      expect(result).toEqual([{ category: 'external_auditor', userId: null, label: 'Acme Audit LLC' }]);
    });

    it('combines all five categories in one call, each independently present or absent', () => {
      const result = buildReviewerSet({
        accountOwnerId: 'owner-1',
        managerId: null,
        internalAuditUserIds: ['ia-1'],
        externalAuditorContacts: [{ label: 'Ext Auditor' }],
        superAdminUserIds: ['admin-1', 'admin-2']
      });
      expect(result.map((r) => r.category)).toEqual([
        'account_owner',
        'internal_audit',
        'external_auditor',
        'super_admin',
        'super_admin'
      ]);
    });
  });
});
