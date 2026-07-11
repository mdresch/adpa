import { findLapsedAttestations, CapabilityAttestationRow } from '../../../modules/capabilityRegistry/attestationLapseCheck';

describe('federated-capability-ownership: attestationLapseCheck', () => {
  const now = new Date('2026-07-11T00:00:00Z');
  const past = new Date('2026-07-01T00:00:00Z');
  const future = new Date('2026-08-01T00:00:00Z');

  it('REQ-PHASE3-ATT-001: flags an active row whose attestation is past due', () => {
    const rows: CapabilityAttestationRow[] = [
      { id: 'a', attestationDueAt: past, activationStatus: 'active' }
    ];
    expect(findLapsedAttestations(rows, now)).toEqual(rows);
  });

  it('REQ-PHASE3-ATT-002: does not flag a row whose attestation is not yet due', () => {
    const rows: CapabilityAttestationRow[] = [
      { id: 'a', attestationDueAt: future, activationStatus: 'active' }
    ];
    expect(findLapsedAttestations(rows, now)).toEqual([]);
  });

  it('REQ-PHASE3-ATT-003: does not flag a row with no attestation_due_at set', () => {
    const rows: CapabilityAttestationRow[] = [
      { id: 'a', attestationDueAt: null, activationStatus: 'active' }
    ];
    expect(findLapsedAttestations(rows, now)).toEqual([]);
  });

  it('REQ-PHASE3-ATT-004: only flags rows currently active -- draft/pending/disabled are excluded even if overdue', () => {
    const rows: CapabilityAttestationRow[] = [
      { id: 'draft', attestationDueAt: past, activationStatus: 'draft' },
      { id: 'pending-approval', attestationDueAt: past, activationStatus: 'pending_department_approval' },
      { id: 'pending-reapproval', attestationDueAt: past, activationStatus: 'pending_re_approval' },
      { id: 'disabled', attestationDueAt: past, activationStatus: 'disabled' },
      { id: 'active', attestationDueAt: past, activationStatus: 'active' }
    ];
    expect(findLapsedAttestations(rows, now)).toEqual([rows[4]]);
  });

  it('REQ-PHASE3-ATT-005: accepts string dates (raw DB rows), not only Date instances', () => {
    const rows: CapabilityAttestationRow[] = [
      { id: 'a', attestationDueAt: '2026-07-01T00:00:00Z', activationStatus: 'active' }
    ];
    expect(findLapsedAttestations(rows, now)).toEqual(rows);
  });
});
