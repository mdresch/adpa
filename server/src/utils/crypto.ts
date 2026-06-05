/**
 * Cryptographic Utility Module
 * Provides SHA-256 hashing for immutable audit trail verification
 */

import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash of a string
 * @param data - String to hash
 * @returns 64-character hexadecimal hash
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate SHA-256 hash of an object (serialized to JSON)
 * @param obj - Object to hash
 * @returns 64-character hexadecimal hash
 */
export function sha256Object(obj: Record<string, any>): string {
  const normalized = JSON.stringify(obj, Object.keys(obj).sort());
  return sha256(normalized);
}

/**
 * Generate chain hash for audit trail
 * Creates a blockchain-like chain: chain_hash = sha256(previous_chain_hash + snapshot_hash)
 * @param previousChainHash - Previous chain hash (null for first entry)
 * @param snapshotHash - Hash of the current snapshot
 * @returns New chain hash
 */
export function generateChainHash(
  previousChainHash: string | null,
  snapshotHash: string
): string {
  if (!previousChainHash) {
    // First entry in chain - chain hash equals snapshot hash
    return snapshotHash;
  }
  return sha256(previousChainHash + snapshotHash);
}

/**
 * Verify audit trail chain integrity
 * Validates that each entry's chain_hash correctly links to the previous entry
 * @param entries - Audit trail entries in order
 * @returns true if chain is valid, false if tampered
 */
export function verifyAuditChain(
  entries: Array<{
    snapshot_hash: string;
    chain_hash: string;
    previous_version_id: string | null;
  }>
): boolean {
  if (entries.length === 0) return true;

  // Sort by version to ensure correct order
  const sorted = [...entries].sort((a, b) => {
    // In a real implementation, you'd have version numbers
    // For now, we assume entries are already in order
    return 0;
  });

  let expectedChainHash: string | null = null;

  for (const entry of sorted) {
    const expectedHash = expectedChainHash
      ? generateChainHash(expectedChainHash, entry.snapshot_hash)
      : entry.snapshot_hash;

    if (entry.chain_hash !== expectedHash) {
      return false; // Tampering detected!
    }

    expectedChainHash = entry.chain_hash;
  }

  return true;
}

/**
 * Create audit entry snapshot with cryptographic hashes
 * @param entitySnapshot - Full entity data snapshot
 * @param previousChainHash - Previous chain hash (null for first entry)
 * @param operationType - Type of operation (CREATE, UPDATE, RETIRE, etc.)
 * @param metadata - Additional metadata
 * @returns Complete audit entry with hashes
 */
export function createAuditEntry(
  entitySnapshot: Record<string, any>,
  previousChainHash: string | null,
  operationType: string,
  metadata: Record<string, any> = {}
): {
  snapshot_hash: string;
  chain_hash: string;
  entity_snapshot: Record<string, any>;
  metadata: Record<string, any>;
} {
  const snapshot_hash = sha256Object(entitySnapshot);
  const chain_hash = generateChainHash(previousChainHash, snapshot_hash);

  return {
    snapshot_hash,
    chain_hash,
    entity_snapshot: entitySnapshot,
    metadata: {
      operation_timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Get audit entry for entity update operation
 * @param entityId - Entity ID
 * @param entityData - Current entity data (full row from DB)
 * @param changes - Changes being applied
 * @param previousChainHash - Previous chain hash from entity_extractions.audit_chain_hash
 * @returns Audit entry ready for insertion
 */
export function createUpdateAuditEntry(
  entityId: string,
  entityData: Record<string, any>,
  changes: Record<string, any>,
  previousChainHash: string | null,
  changedBy: string = 'system'
): {
  entity_id: string;
  operation_type: string;
  changed_by: string;
  snapshot_hash: string;
  chain_hash: string;
  entity_snapshot: Record<string, any>;
  metadata: Record<string, any>;
} {
  // Create a snapshot that includes both old and new state for full traceability
  const snapshot = {
    entity_id: entityId,
    old_data: entityData,
    new_data: changes,
    operation: 'UPDATE'
  };

  const { snapshot_hash, chain_hash, entity_snapshot, metadata } = createAuditEntry(
    snapshot,
    previousChainHash,
    'UPDATE',
    {
      changed_by: changedBy,
      changed_fields: Object.keys(changes)
    }
  );

  return {
    entity_id: entityId,
    operation_type: 'UPDATE',
    changed_by: changedBy,
    snapshot_hash,
    chain_hash,
    entity_snapshot: entity_snapshot,
    metadata
  };
}

/**
 * Get audit entry for entity retirement
 * @param entityId - Entity ID
 * @param entityData - Current entity data
 * @param previousChainHash - Previous chain hash
 * @returns Audit entry ready for insertion
 */
export function createRetirementAuditEntry(
  entityId: string,
  entityData: Record<string, any>,
  previousChainHash: string | null,
  changedBy: string = 'system'
): {
  entity_id: string;
  operation_type: string;
  changed_by: string;
  snapshot_hash: string;
  chain_hash: string;
  entity_snapshot: Record<string, any>;
  metadata: Record<string, any>;
} {
  const snapshot = {
    entity_id: entityId,
    data_before_retirement: entityData,
    operation: 'RETIRE'
  };

  const { snapshot_hash, chain_hash, entity_snapshot, metadata } = createAuditEntry(
    snapshot,
    previousChainHash,
    'RETIRE',
    {
      changed_by: changedBy,
      reason: 'zero_references'
    }
  );

  return {
    entity_id: entityId,
    operation_type: 'RETIRE',
    changed_by: changedBy,
    snapshot_hash,
    chain_hash,
    entity_snapshot: entity_snapshot,
    metadata
  };
}

/**
 * Get audit entry for entity creation
 * @param entityId - Entity ID
 * @param entityData - Initial entity data
 * @returns Audit entry ready for insertion (no previous chain hash for first entry)
 */
export function createCreationAuditEntry(
  entityId: string,
  entityData: Record<string, any>,
  changedBy: string = 'system'
): {
  entity_id: string;
  operation_type: string;
  changed_by: string;
  snapshot_hash: string;
  chain_hash: string;
  entity_snapshot: Record<string, any>;
  metadata: Record<string, any>;
} {
  const snapshot = {
    entity_id: entityId,
    initial_data: entityData,
    operation: 'CREATE'
  };

  const { snapshot_hash, chain_hash, entity_snapshot, metadata } = createAuditEntry(
    snapshot,
    null, // No previous hash for creation
    'CREATE',
    {
      changed_by: changedBy
    }
  );

  return {
    entity_id: entityId,
    operation_type: 'CREATE',
    changed_by: changedBy,
    snapshot_hash,
    chain_hash,
    entity_snapshot: entity_snapshot,
    metadata
  };
}

export default {
  sha256,
  sha256Object,
  generateChainHash,
  verifyAuditChain,
  createAuditEntry,
  createUpdateAuditEntry,
  createRetirementAuditEntry,
  createCreationAuditEntry
};
