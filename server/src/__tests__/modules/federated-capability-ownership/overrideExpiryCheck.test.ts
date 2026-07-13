import { findOverrideExpiryActions, CapabilityOverrideRow } from '../../../modules/capabilityRegistry/overrideExpiryCheck';

function row(overrides: Partial<CapabilityOverrideRow> = {}): CapabilityOverrideRow {
  return {
    id: 'cap-1',
    activationStatus: 'active',
    historyId: 'hist-1',
    isOverride: true,
    overrideExpiresAt: new Date('2026-07-20T00:00:00Z'),
    warned24hAt: null,
    warned12hAt: null,
    functionalOwnerDepartment: 'IT',
    ...overrides
  };
}

const NOW = new Date('2026-07-19T00:00:00Z');

describe('federated-capability-ownership: overrideExpiryCheck', () => {
  // REQ-PHASE2T4-009
  describe('REQ-PHASE2T4-009: rows that should never be touched', () => {
    it('ignores a non-active capability', () => {
      const result = findOverrideExpiryActions([row({ activationStatus: 'pending_re_approval' })], NOW);
      expect(result).toEqual([]);
    });

    it('ignores an active capability whose latest history row is not an override', () => {
      const result = findOverrideExpiryActions([row({ isOverride: false })], NOW);
      expect(result).toEqual([]);
    });

    it('ignores an override row with no overrideExpiresAt set', () => {
      const result = findOverrideExpiryActions([row({ overrideExpiresAt: null })], NOW);
      expect(result).toEqual([]);
    });
  });

  // REQ-PHASE2T4-007
  describe('REQ-PHASE2T4-007: revert on lapsed override', () => {
    it('emits a revert action once overrideExpiresAt has passed', () => {
      const result = findOverrideExpiryActions([row({ overrideExpiresAt: new Date('2026-07-18T00:00:00Z') })], NOW);
      expect(result).toEqual([
        { capabilityId: 'cap-1', historyId: 'hist-1', functionalOwnerDepartment: 'IT', action: 'revert' }
      ]);
    });

    it('treats an exactly-now expiry as lapsed', () => {
      const result = findOverrideExpiryActions([row({ overrideExpiresAt: NOW })], NOW);
      expect(result[0].action).toBe('revert');
    });
  });

  // REQ-PHASE2T4-008
  describe('REQ-PHASE2T4-008: idempotent pre-expiry warnings', () => {
    it('emits warn24h within 24h of expiry when not yet warned', () => {
      const result = findOverrideExpiryActions(
        [row({ overrideExpiresAt: new Date(NOW.getTime() + 20 * 60 * 60 * 1000) })],
        NOW
      );
      expect(result).toEqual([{ capabilityId: 'cap-1', historyId: 'hist-1', functionalOwnerDepartment: 'IT', action: 'warn24h' }]);
    });

    it('does not re-emit warn24h once warned24hAt is set', () => {
      const result = findOverrideExpiryActions(
        [row({ overrideExpiresAt: new Date(NOW.getTime() + 20 * 60 * 60 * 1000), warned24hAt: new Date('2026-07-18T12:00:00Z') })],
        NOW
      );
      expect(result).toEqual([]);
    });

    it('emits warn12h within 12h of expiry once warned24hAt is already set', () => {
      const result = findOverrideExpiryActions(
        [
          row({
            overrideExpiresAt: new Date(NOW.getTime() + 10 * 60 * 60 * 1000),
            warned24hAt: new Date('2026-07-18T12:00:00Z')
          })
        ],
        NOW
      );
      expect(result).toEqual([{ capabilityId: 'cap-1', historyId: 'hist-1', functionalOwnerDepartment: 'IT', action: 'warn12h' }]);
    });

    it('does not re-emit warn12h once warned12hAt is set', () => {
      const result = findOverrideExpiryActions(
        [
          row({
            overrideExpiresAt: new Date(NOW.getTime() + 10 * 60 * 60 * 1000),
            warned24hAt: new Date('2026-07-18T12:00:00Z'),
            warned12hAt: new Date('2026-07-18T13:00:00Z')
          })
        ],
        NOW
      );
      expect(result).toEqual([]);
    });

    it('does not warn when expiry is more than 24h away', () => {
      const result = findOverrideExpiryActions(
        [row({ overrideExpiresAt: new Date(NOW.getTime() + 48 * 60 * 60 * 1000) })],
        NOW
      );
      expect(result).toEqual([]);
    });
  });

  it('handles multiple independent rows in one call', () => {
    const result = findOverrideExpiryActions(
      [
        row({ id: 'cap-a', historyId: 'hist-a', overrideExpiresAt: new Date('2026-07-01T00:00:00Z') }),
        row({ id: 'cap-b', historyId: 'hist-b', activationStatus: 'draft' }),
        row({ id: 'cap-c', historyId: 'hist-c', overrideExpiresAt: new Date(NOW.getTime() + 5 * 60 * 60 * 1000), warned24hAt: NOW })
      ],
      NOW
    );
    expect(result).toEqual([
      { capabilityId: 'cap-a', historyId: 'hist-a', functionalOwnerDepartment: 'IT', action: 'revert' },
      { capabilityId: 'cap-c', historyId: 'hist-c', functionalOwnerDepartment: 'IT', action: 'warn12h' }
    ]);
  });
});
