import { reconcileActivationHistory, CapabilityStatusRow } from '../../../modules/capabilityRegistry/activationHistoryReconciliation';

describe('federated-capability-ownership: activationHistoryReconciliation', () => {
  it('REQ-PHASE5-RECON-001: does not flag a capability whose status matches its latest history row', () => {
    const capabilities: CapabilityStatusRow[] = [{ id: 'a', activationStatus: 'active' }];
    const latest = new Map([['a', 'active']]);
    expect(reconcileActivationHistory(capabilities, latest)).toEqual([]);
  });

  it('REQ-PHASE5-RECON-002: does not flag a draft capability with no history row at all', () => {
    const capabilities: CapabilityStatusRow[] = [{ id: 'a', activationStatus: 'draft' }];
    const latest = new Map<string, string>();
    expect(reconcileActivationHistory(capabilities, latest)).toEqual([]);
  });

  it('REQ-PHASE5-RECON-003: flags an active capability with no history row at all', () => {
    const capabilities: CapabilityStatusRow[] = [{ id: 'a', activationStatus: 'active' }];
    const latest = new Map<string, string>();
    expect(reconcileActivationHistory(capabilities, latest)).toEqual([
      { capabilityId: 'a', registryStatus: 'active', latestHistoryStatus: null }
    ]);
  });

  it('REQ-PHASE5-RECON-004: flags a capability whose status disagrees with its latest history row', () => {
    const capabilities: CapabilityStatusRow[] = [{ id: 'a', activationStatus: 'active' }];
    const latest = new Map([['a', 'disabled']]);
    expect(reconcileActivationHistory(capabilities, latest)).toEqual([
      { capabilityId: 'a', registryStatus: 'active', latestHistoryStatus: 'disabled' }
    ]);
  });

  it('REQ-PHASE5-RECON-005: a draft capability WITH a disagreeing history row is still flagged (the draft exemption only covers no-history-at-all)', () => {
    const capabilities: CapabilityStatusRow[] = [{ id: 'a', activationStatus: 'draft' }];
    const latest = new Map([['a', 'active']]);
    expect(reconcileActivationHistory(capabilities, latest)).toEqual([
      { capabilityId: 'a', registryStatus: 'draft', latestHistoryStatus: 'active' }
    ]);
  });

  it('REQ-PHASE5-RECON-006: reconciles a mixed batch, only flagging the actual drifted rows', () => {
    const capabilities: CapabilityStatusRow[] = [
      { id: 'ok-draft', activationStatus: 'draft' },
      { id: 'ok-active', activationStatus: 'active' },
      { id: 'bad-no-history', activationStatus: 'active' },
      { id: 'bad-mismatch', activationStatus: 'pending_re_approval' }
    ];
    const latest = new Map([
      ['ok-active', 'active'],
      ['bad-mismatch', 'active']
    ]);
    const result = reconcileActivationHistory(capabilities, latest);
    expect(result.map((r) => r.capabilityId).sort()).toEqual(['bad-mismatch', 'bad-no-history']);
  });
});
