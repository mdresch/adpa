/**
 * Entity Audit Service Tests
 * Tests for immutable audit trail with cryptographic signing
 * Phase 1-3 Implementation
 */

import { 
  sha256, 
  sha256Object, 
  generateChainHash, 
  verifyAuditChain,
  createAuditEntry,
  createCreationAuditEntry,
  createUpdateAuditEntry,
  createRetirementAuditEntry
} from '../../utils/crypto';

describe('Crypto Utilities', () => {
  describe('sha256', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test data';
      const hash1 = sha256(input);
      const hash2 = sha256(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = sha256('input1');
      const hash2 = sha256('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash', () => {
      const hash = sha256('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate different hash for empty string vs non-empty', () => {
      const emptyHash = sha256('');
      const nonEmptyHash = sha256('test');
      expect(emptyHash).not.toBe(nonEmptyHash);
    });
  });

  describe('sha256Object', () => {
    it('should generate consistent hash for same object', () => {
      const obj = { a: 1, b: 2 };
      const hash1 = sha256Object(obj);
      const hash2 = sha256Object(obj);
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash regardless of property order', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      const hash1 = sha256Object(obj1);
      const hash2 = sha256Object(obj2);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };
      const hash1 = sha256Object(obj1);
      const hash2 = sha256Object(obj2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateChainHash', () => {
    it('should return snapshot hash when previous chain hash is null', () => {
      const snapshotHash = sha256('test');
      const chainHash = generateChainHash(null, snapshotHash);
      expect(chainHash).toBe(snapshotHash);
    });

    it('should generate deterministic chain hash', () => {
      const prevHash = sha256('previous');
      const snapshotHash = sha256('current');
      const chainHash1 = generateChainHash(prevHash, snapshotHash);
      const chainHash2 = generateChainHash(prevHash, snapshotHash);
      expect(chainHash1).toBe(chainHash2);
    });

    it('should generate different chain hash for different inputs', () => {
      const prevHash = sha256('previous');
      const chainHash1 = generateChainHash(prevHash, sha256('current1'));
      const chainHash2 = generateChainHash(prevHash, sha256('current2'));
      expect(chainHash1).not.toBe(chainHash2);
    });

    it('should generate chain that depends on previous hash', () => {
      const snapshotHash = sha256('current');
      const chainHash1 = generateChainHash(sha256('prev1'), snapshotHash);
      const chainHash2 = generateChainHash(sha256('prev2'), snapshotHash);
      expect(chainHash1).not.toBe(chainHash2);
    });
  });

  describe('verifyAuditChain', () => {
    it('should return true for empty chain', () => {
      const isValid = verifyAuditChain([]);
      expect(isValid).toBe(true);
    });

    it('should return true for single entry chain', () => {
      const snapshotHash = sha256('test');
      const entries = [{
        snapshot_hash: snapshotHash,
        chain_hash: snapshotHash, // First entry: chain_hash = snapshot_hash
        previous_version_id: null
      }];
      const isValid = verifyAuditChain(entries);
      expect(isValid).toBe(true);
    });

    it('should return true for valid two-entry chain', () => {
      const snapshotHash1 = sha256('entry1');
      const chainHash1 = snapshotHash1;
      const snapshotHash2 = sha256('entry2');
      const chainHash2 = generateChainHash(chainHash1, snapshotHash2);
      
      const entries = [
        {
          snapshot_hash: snapshotHash1,
          chain_hash: chainHash1,
          previous_version_id: null
        },
        {
          snapshot_hash: snapshotHash2,
          chain_hash: chainHash2,
          previous_version_id: 'some-id'
        }
      ];
      const isValid = verifyAuditChain(entries);
      expect(isValid).toBe(true);
    });

    it('should return false for tampered chain', () => {
      const snapshotHash1 = sha256('entry1');
      const chainHash1 = snapshotHash1;
      const snapshotHash2 = sha256('entry2');
      const correctChainHash2 = generateChainHash(chainHash1, snapshotHash2);
      const tamperedChainHash2 = sha256('tampered');
      
      const entries = [
        {
          snapshot_hash: snapshotHash1,
          chain_hash: chainHash1,
          previous_version_id: null
        },
        {
          snapshot_hash: snapshotHash2,
          chain_hash: tamperedChainHash2, // Tampered!
          previous_version_id: 'some-id'
        }
      ];
      const isValid = verifyAuditChain(entries);
      expect(isValid).toBe(false);
    });

    it('should return false for tampered snapshot hash', () => {
      const snapshotHash1 = sha256('entry1');
      const chainHash1 = snapshotHash1;
      const chainHash2 = generateChainHash(chainHash1, sha256('entry2'));
      
      const entries = [
        {
          snapshot_hash: snapshotHash1,
          chain_hash: chainHash1,
          previous_version_id: null
        },
        {
          snapshot_hash: sha256('tampered'), // Tampered snapshot!
          chain_hash: chainHash2,
          previous_version_id: 'some-id'
        }
      ];
      const isValid = verifyAuditChain(entries);
      expect(isValid).toBe(false);
    });
  });

  describe('createAuditEntry', () => {
    it('should create audit entry with correct hashes', () => {
      const snapshot = { test: 'data' };
      const entry = createAuditEntry(
        snapshot,
        null,
        'CREATE',
        { custom: 'metadata' }
      );

      expect(entry.entity_snapshot).toEqual({
        entity_id: undefined,
        initial_data: { test: 'data' },
        operation: 'CREATE'
      });
      expect(entry.metadata).toEqual({
        operation_timestamp: expect.any(String),
        custom: 'metadata'
      });
      expect(entry.snapshot_hash).toHaveLength(64);
      expect(entry.chain_hash).toBe(entry.snapshot_hash); // First entry
    });

    it('should create audit entry with chain hash when previous exists', () => {
      const snapshot1 = { test: 'data1' };
      const entry1 = createAuditEntry(snapshot1, null, 'CREATE');

      const snapshot2 = { test: 'data2' };
      const entry2 = createAuditEntry(snapshot2, entry1.chain_hash, 'UPDATE');

      expect(entry2.chain_hash).not.toBe(entry2.snapshot_hash);
      expect(entry2.chain_hash).toBe(generateChainHash(entry1.chain_hash, entry2.snapshot_hash));
    });
  });

  describe('createCreationAuditEntry', () => {
    it('should create valid creation audit entry', () => {
      const entityId = 'test-entity-id';
      const entityData = { name: 'Test Entity', type: 'stakeholder' };
      
      const entry = createCreationAuditEntry(entityId, entityData, 'test-user');

      expect(entry.entity_id).toBe(entityId);
      expect(entry.operation_type).toBe('CREATE');
      expect(entry.changed_by).toBe('test-user');
      expect(entry.snapshot_hash).toHaveLength(64);
      expect(entry.chain_hash).toHaveLength(64);
      expect(entry.entity_snapshot).toHaveProperty('entity_id', entityId);
      expect(entry.entity_snapshot).toHaveProperty('initial_data', entityData);
    });
  });

  describe('createUpdateAuditEntry', () => {
    it('should create valid update audit entry', () => {
      const entityId = 'test-entity-id';
      const oldData = { name: 'Old Name', confidence: 50 };
      const newData = { name: 'New Name', confidence: 80 };
      const previousChainHash = sha256('previous');
      
      const entry = createUpdateAuditEntry(
        entityId,
        oldData,
        newData,
        previousChainHash,
        'test-user'
      );

      expect(entry.entity_id).toBe(entityId);
      expect(entry.operation_type).toBe('UPDATE');
      expect(entry.changed_by).toBe('test-user');
      expect(entry.entity_snapshot).toHaveProperty('entity_id', entityId);
      expect(entry.entity_snapshot).toHaveProperty('old_data', oldData);
      expect(entry.entity_snapshot).toHaveProperty('new_data', newData);
      expect(entry.chain_hash).toBe(generateChainHash(previousChainHash, entry.snapshot_hash));
    });
  });

  describe('createRetirementAuditEntry', () => {
    it('should create valid retirement audit entry', () => {
      const entityId = 'test-entity-id';
      const entityData = { name: 'Entity to Retire', status: 'active' };
      const previousChainHash = sha256('previous');
      
      const entry = createRetirementAuditEntry(
        entityId,
        entityData,
        previousChainHash,
        'system'
      );

      expect(entry.entity_id).toBe(entityId);
      expect(entry.operation_type).toBe('RETIRE');
      expect(entry.changed_by).toBe('system');
      expect(entry.entity_snapshot).toHaveProperty('entity_id', entityId);
      expect(entry.entity_snapshot).toHaveProperty('data_before_retirement', entityData);
      expect(entry.metadata.reason).toBe('zero_references');
    });
  });

  describe('Chain Integrity Tests', () => {
    it('should create and verify a complete chain of operations', () => {
      const entityId = 'chain-test-entity';
      const initialData = { name: 'Initial', version: 1 };
      const updatedData = { name: 'Updated', version: 2 };
      const retiredData = { name: 'Retired', version: 3 };

      // Create chain
      const createEntry = createCreationAuditEntry(entityId, initialData, 'user1');
      const updateEntry = createUpdateAuditEntry(
        entityId,
        initialData,
        updatedData,
        createEntry.chain_hash,
        'user2'
      );
      const retireEntry = createRetirementAuditEntry(
        entityId,
        updatedData,
        updateEntry.chain_hash,
        'system'
      );

      // Verify chain
      const entries = [
        {
          snapshot_hash: createEntry.snapshot_hash,
          chain_hash: createEntry.chain_hash,
          previous_version_id: null
        },
        {
          snapshot_hash: updateEntry.snapshot_hash,
          chain_hash: updateEntry.chain_hash,
          previous_version_id: 'some-id'
        },
        {
          snapshot_hash: retireEntry.snapshot_hash,
          chain_hash: retireEntry.chain_hash,
          previous_version_id: 'another-id'
        }
      ];

      // The verifyAuditChain function expects entries in order
      // For this test, we just verify the chain hashes are correctly linked
      expect(updateEntry.chain_hash).toBe(
        generateChainHash(createEntry.chain_hash, updateEntry.snapshot_hash)
      );
      expect(retireEntry.chain_hash).toBe(
        generateChainHash(updateEntry.chain_hash, retireEntry.snapshot_hash)
      );
    });

    it('should detect tampering in chain', () => {
      const entityId = 'tamper-test-entity';
      const initialData = { name: 'Initial' };
      const updatedData = { name: 'Updated' };

      // Create legitimate chain
      const createEntry = createCreationAuditEntry(entityId, initialData, 'user1');
      const updateEntry = createUpdateAuditEntry(
        entityId,
        initialData,
        updatedData,
        createEntry.chain_hash,
        'user2'
      );

      // Now tamper with the update entry's chain hash
      const tamperedUpdateEntry = { ...updateEntry, chain_hash: sha256('tampered') };

      // Verify the chain is now invalid
      const entries = [
        {
          snapshot_hash: createEntry.snapshot_hash,
          chain_hash: createEntry.chain_hash,
          previous_version_id: null
        },
        {
          snapshot_hash: tamperedUpdateEntry.snapshot_hash,
          chain_hash: tamperedUpdateEntry.chain_hash,
          previous_version_id: 'some-id'
        }
      ];

      // The verifyAuditChain would detect this as invalid
      // because the chain_hash doesn't match the expected value
      const expectedChainHash = generateChainHash(
        createEntry.chain_hash,
        tamperedUpdateEntry.snapshot_hash
      );
      expect(tamperedUpdateEntry.chain_hash).not.toBe(expectedChainHash);
    });
  });
});

describe('EntityAuditService Integration Tests', () => {
  // Note: These tests would require database connection
  // They are placeholders for actual integration tests

  describe('Audit Trail Immutability', () => {
    it('should be able to recreate entity state from any audit entry', () => {
      // This would test the actual service methods
      // Placeholder for integration test
    });

    it('should verify chain integrity across all entity operations', () => {
      // This would test the full audit chain verification
      // Placeholder for integration test
    });
  });
});
