import {
  reconcileCapabilityRegistry,
  buildCapabilityRegistryRow,
  getAttestationCadenceDays,
  CapabilityRegistryRow,
  DEFAULT_ATTESTATION_CADENCE_DAYS
} from '../../../modules/capabilityRegistry/capabilityRegistryReconciliation';
import { resolveModuleOwnerDepartments } from '../../../modules/capabilityRegistry/moduleOwnerAssignments';
import manifest from '../../../../governed-features.manifest.json';

describe('federated-capability-ownership: capabilityRegistry', () => {
  // REQ-CAP-001: missing rows across both drift directions
  describe('REQ-CAP-001: missing rows across both drift directions', () => {
    it('reports a missing row when a manifest module has no row for an existing portfolio', () => {
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag', 'doc-gen'],
        portfolioIds: ['p1'],
        existingRows: [{ moduleId: 'rag', portfolioId: 'p1' }]
      });
      expect(result.missingRows).toEqual([{ moduleId: 'doc-gen', portfolioId: 'p1' }]);
    });

    it('reports a missing row when an existing module has no row for a newly-created portfolio', () => {
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag'],
        portfolioIds: ['p1', 'p2'],
        existingRows: [{ moduleId: 'rag', portfolioId: 'p1' }]
      });
      expect(result.missingRows).toEqual([{ moduleId: 'rag', portfolioId: 'p2' }]);
    });

    it('reports the full cross product missing when the registry is empty', () => {
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag', 'doc-gen'],
        portfolioIds: ['p1', 'p2'],
        existingRows: []
      });
      expect(result.missingRows).toHaveLength(4);
      expect(result.missingRows).toEqual(
        expect.arrayContaining([
          { moduleId: 'rag', portfolioId: 'p1' },
          { moduleId: 'rag', portfolioId: 'p2' },
          { moduleId: 'doc-gen', portfolioId: 'p1' },
          { moduleId: 'doc-gen', portfolioId: 'p2' }
        ])
      );
    });
  });

  // REQ-CAP-002: orphaned rows
  describe('REQ-CAP-002: orphaned rows', () => {
    it('reports an existing row as orphaned when its module_id is not in the manifest', () => {
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag'],
        portfolioIds: ['p1'],
        existingRows: [
          { moduleId: 'rag', portfolioId: 'p1' },
          { moduleId: 'retired-feature', portfolioId: 'p1' }
        ]
      });
      expect(result.orphanedRows).toEqual([{ moduleId: 'retired-feature', portfolioId: 'p1' }]);
    });

    it('does not conflate a stale portfolio_id with an orphaned module_id', () => {
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag'],
        portfolioIds: ['p1'],
        existingRows: [{ moduleId: 'rag', portfolioId: 'p-deleted' }]
      });
      expect(result.orphanedRows).toEqual([{ moduleId: 'rag', portfolioId: 'p-deleted' }]);
      expect(result.missingRows).toEqual([{ moduleId: 'rag', portfolioId: 'p1' }]);
    });
  });

  // REQ-CAP-003: fully-synced registry reports nothing
  describe('REQ-CAP-003: fully-synced registry reports nothing', () => {
    it('reports no missing and no orphaned rows when the registry exactly matches the cross product', () => {
      const existingRows: CapabilityRegistryRow[] = [
        { moduleId: 'rag', portfolioId: 'p1' },
        { moduleId: 'rag', portfolioId: 'p2' },
        { moduleId: 'doc-gen', portfolioId: 'p1' },
        { moduleId: 'doc-gen', portfolioId: 'p2' }
      ];
      const result = reconcileCapabilityRegistry({
        manifestModuleIds: ['rag', 'doc-gen'],
        portfolioIds: ['p1', 'p2'],
        existingRows
      });
      expect(result.missingRows).toEqual([]);
      expect(result.orphanedRows).toEqual([]);
    });
  });

  // REQ-CAP-004: row builder defaults
  describe('REQ-CAP-004: row builder defaults', () => {
    it('defaults platformOperator to IT and functionalOwnerType to department', () => {
      const row = buildCapabilityRegistryRow('rag', 'p1');
      expect(row.platformOperator).toBe('IT');
      expect(row.functionalOwnerType).toBe('department');
    });

    it('leaves owner-department fields null unless explicitly supplied', () => {
      const row = buildCapabilityRegistryRow('rag', 'p1');
      expect(row.functionalOwnerDepartment).toBeNull();
      expect(row.controlDefinitionOwnerDepartment).toBeNull();
    });

    it('honors explicitly supplied overrides instead of guessing', () => {
      const row = buildCapabilityRegistryRow('compliance', 'p1', {
        functionalOwnerDepartment: 'Compliance',
        controlDefinitionOwnerDepartment: 'Legal'
      });
      expect(row.functionalOwnerDepartment).toBe('Compliance');
      expect(row.controlDefinitionOwnerDepartment).toBe('Legal');
      expect(row.moduleId).toBe('compliance');
      expect(row.portfolioId).toBe('p1');
    });
  });

  // REQ-CAP-005: attestation cadence configuration
  describe('REQ-CAP-005: attestation cadence configuration', () => {
    const originalEnv = process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS;
      } else {
        process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS = originalEnv;
      }
    });

    it('falls back to the documented default when unset', () => {
      delete process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS;
      expect(getAttestationCadenceDays()).toBe(DEFAULT_ATTESTATION_CADENCE_DAYS);
    });

    it('reads a positive override from configuration', () => {
      process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS = '30';
      expect(getAttestationCadenceDays()).toBe(30);
    });

    it('falls back to the default on a non-positive or non-numeric override', () => {
      process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS = '0';
      expect(getAttestationCadenceDays()).toBe(DEFAULT_ATTESTATION_CADENCE_DAYS);
      process.env.CAPABILITY_ATTESTATION_CADENCE_DAYS = 'not-a-number';
      expect(getAttestationCadenceDays()).toBe(DEFAULT_ATTESTATION_CADENCE_DAYS);
    });
  });

  // REQ-CAP-006: reconciles against the real manifest
  describe('REQ-CAP-006: reconciles against the real manifest', () => {
    it('reports exactly one missing row per manifest feature per portfolio when the registry is empty', () => {
      const manifestModuleIds = (manifest as { features: { id: string }[] }).features.map((f) => f.id);
      const portfolioIds = ['p1', 'p2'];
      const result = reconcileCapabilityRegistry({
        manifestModuleIds,
        portfolioIds,
        existingRows: []
      });
      expect(result.missingRows).toHaveLength(manifestModuleIds.length * portfolioIds.length);
      expect(result.orphanedRows).toEqual([]);
    });
  });

  // REQ-CAP-009 (ADR-005 Phase 7): the real owner-department business decision
  describe('REQ-CAP-009: resolveModuleOwnerDepartments', () => {
    it('assigns Compliance to the compliance and template-lifecycle packets', () => {
      expect(resolveModuleOwnerDepartments('compliance').functionalOwnerDepartment).toBe('Compliance');
      expect(resolveModuleOwnerDepartments('template-lifecycle').functionalOwnerDepartment).toBe('Compliance');
    });

    it('assigns Legal to the ip-governance packet', () => {
      expect(resolveModuleOwnerDepartments('ip-governance').functionalOwnerDepartment).toBe('Legal');
    });

    it('defaults every other packet to IT, including ones not yet in the manifest', () => {
      expect(resolveModuleOwnerDepartments('rag')).toEqual({
        functionalOwnerDepartment: 'IT',
        controlDefinitionOwnerDepartment: 'IT'
      });
      expect(resolveModuleOwnerDepartments('some-future-packet')).toEqual({
        functionalOwnerDepartment: 'IT',
        controlDefinitionOwnerDepartment: 'IT'
      });
    });

    it('resolves a real owner for every current manifest packet (no packet silently falls through unassigned)', () => {
      const manifestModuleIds = (manifest as { features: { id: string }[] }).features.map((f) => f.id);
      for (const moduleId of manifestModuleIds) {
        const assignment = resolveModuleOwnerDepartments(moduleId);
        expect(assignment.functionalOwnerDepartment).toBeTruthy();
        expect(assignment.controlDefinitionOwnerDepartment).toBeTruthy();
      }
    });
  });
});
