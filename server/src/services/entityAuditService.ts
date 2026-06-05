/**
 * Entity Audit Service
 * Manages immutable audit trail for entity lifecycle with cryptographic verification
 * Phase 1-3 Implementation: Full crypto signing for immutable temporal tracking
 */

import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import {
  sha256,
  sha256Object,
  generateChainHash,
  verifyAuditChain,
  createCreationAuditEntry,
  createUpdateAuditEntry,
  createRetirementAuditEntry
} from '../utils/crypto';

export interface AuditTrailEntry {
  id: string;
  entity_id: string;
  version: number;
  operation_type: 'CREATE' | 'UPDATE' | 'RETIRE' | 'MATCH' | string;
  timestamp: Date;
  changed_by: string;
  previous_version_id: string | null;
  entity_snapshot: Record<string, any>;
  snapshot_hash: string;
  chain_hash: string;
  metadata: Record<string, any>;
}

export interface EntityVersionInfo {
  current_version: number;
  chain_hash: string | null;
  latest_audit_id: string | null;
}

/**
 * Entity Audit Service
 * Provides immutable audit trail functionality for entity lifecycle
 */
export class EntityAuditService {
  
  /**
   * Get the current version and chain hash for an entity
   */
  async getEntityVersionInfo(entityId: string): Promise<EntityVersionInfo> {
    const result = await pool.query(
      `SELECT current_version, audit_chain_hash FROM entity_extractions WHERE id = $1`,
      [entityId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const row = result.rows[0];
    return {
      current_version: row.current_version || 1,
      chain_hash: row.audit_chain_hash || null,
      latest_audit_id: null // Would need to query audit_trail table
    };
  }

  /**
   * Get the latest audit entry for an entity
   */
  async getLatestAuditEntry(entityId: string): Promise<AuditTrailEntry | null> {
    const result = await pool.query(
      `SELECT id, entity_id, version, operation_type, timestamp, changed_by, 
              previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
       FROM entity_audit_trail 
       WHERE entity_id = $1 
       ORDER BY version DESC 
       LIMIT 1`,
      [entityId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      entity_id: row.entity_id,
      version: row.version,
      operation_type: row.operation_type,
      timestamp: row.timestamp,
      changed_by: row.changed_by,
      previous_version_id: row.previous_version_id,
      entity_snapshot: typeof row.entity_snapshot === 'string' 
        ? JSON.parse(row.entity_snapshot) 
        : row.entity_snapshot,
      snapshot_hash: row.snapshot_hash,
      chain_hash: row.chain_hash,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata
    };
  }

  /**
   * Get the previous chain hash for an entity
   * Used to continue the cryptographic chain
   */
  async getPreviousChainHash(entityId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT audit_chain_hash FROM entity_extractions WHERE id = $1`,
      [entityId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].audit_chain_hash || null;
  }

  /**
   * Get the next version number for an entity
   */
  async getNextVersion(entityId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 as next_version 
       FROM entity_audit_trail 
       WHERE entity_id = $1`,
      [entityId]
    );

    return result.rows[0].next_version || 1;
  }

  /**
   * Get the previous version's audit entry ID
   */
  async getPreviousVersionId(entityId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT id FROM entity_audit_trail 
       WHERE entity_id = $1 
       ORDER BY version DESC 
       LIMIT 1`,
      [entityId]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Write an audit entry for entity creation
   */
  async recordCreation(
    entityId: string,
    entityData: Record<string, any>,
    changedBy: string = 'system'
  ): Promise<AuditTrailEntry> {
    try {
      const version = 1;
      const previousVersionId = null;
      const previousChainHash = null;

      // Create audit entry with crypto
      const { snapshot_hash, chain_hash, entity_snapshot, metadata } = 
        createCreationAuditEntry(entityId, entityData, changedBy);

      // Insert into audit trail
      const result = await pool.query(
        `INSERT INTO entity_audit_trail (
          entity_id, version, operation_type, changed_by, 
          previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, entity_id, version, operation_type, timestamp, changed_by, 
                  previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata`,
        [
          entityId,
          version,
          'CREATE',
          changedBy,
          previousVersionId,
          JSON.stringify(entity_snapshot),
          snapshot_hash,
          chain_hash,
          JSON.stringify(metadata)
        ]
      );

      // Update entity_extractions with current version and chain hash
      await pool.query(
        `UPDATE entity_extractions 
         SET current_version = $1, audit_chain_hash = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [version, chain_hash, entityId]
      );

      const row = result.rows[0];
      const entry: AuditTrailEntry = {
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      };

      logger.info('📝 Created audit trail entry for entity creation', {
        entityId,
        version,
        chainHash: chain_hash
      });

      return entry;
    } catch (error: any) {
      logger.error('❌ Failed to record entity creation audit', {
        entityId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Write an audit entry for entity update
   */
  async recordUpdate(
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    changedBy: string = 'system'
  ): Promise<AuditTrailEntry> {
    try {
      // Get current version info
      const [versionInfo, previousChainHash] = await Promise.all([
        this.getEntityVersionInfo(entityId),
        this.getPreviousChainHash(entityId)
      ]);

      const version = versionInfo.current_version + 1;
      const previousVersionId = await this.getPreviousVersionId(entityId);

      // Create audit entry with crypto
      const { snapshot_hash, chain_hash, entity_snapshot, metadata } = 
        createUpdateAuditEntry(entityId, oldData, newData, previousChainHash, changedBy);

      // Insert into audit trail
      const result = await pool.query(
        `INSERT INTO entity_audit_trail (
          entity_id, version, operation_type, changed_by, 
          previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, entity_id, version, operation_type, timestamp, changed_by, 
                  previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata`,
        [
          entityId,
          version,
          'UPDATE',
          changedBy,
          previousVersionId,
          JSON.stringify(entity_snapshot),
          snapshot_hash,
          chain_hash,
          JSON.stringify(metadata)
        ]
      );

      // Update entity_extractions with new version and chain hash
      await pool.query(
        `UPDATE entity_extractions 
         SET current_version = $1, audit_chain_hash = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [version, chain_hash, entityId]
      );

      const row = result.rows[0];
      const entry: AuditTrailEntry = {
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      };

      logger.info('📝 Created audit trail entry for entity update', {
        entityId,
        version,
        chainHash: chain_hash
      });

      return entry;
    } catch (error: any) {
      logger.error('❌ Failed to record entity update audit', {
        entityId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Write an audit entry for entity retirement
   */
  async recordRetirement(
    entityId: string,
    dataBeforeRetirement: Record<string, any>,
    changedBy: string = 'system'
  ): Promise<AuditTrailEntry> {
    try {
      // Get current version info
      const [versionInfo, previousChainHash] = await Promise.all([
        this.getEntityVersionInfo(entityId),
        this.getPreviousChainHash(entityId)
      ]);

      const version = versionInfo.current_version + 1;
      const previousVersionId = await this.getPreviousVersionId(entityId);

      // Create audit entry with crypto
      const { snapshot_hash, chain_hash, entity_snapshot, metadata } = 
        createRetirementAuditEntry(entityId, dataBeforeRetirement, previousChainHash, changedBy);

      // Insert into audit trail
      const result = await pool.query(
        `INSERT INTO entity_audit_trail (
          entity_id, version, operation_type, changed_by, 
          previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, entity_id, version, operation_type, timestamp, changed_by, 
                  previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata`,
        [
          entityId,
          version,
          'RETIRE',
          changedBy,
          previousVersionId,
          JSON.stringify(entity_snapshot),
          snapshot_hash,
          chain_hash,
          JSON.stringify(metadata)
        ]
      );

      // Update entity_extractions with new version and chain hash
      await pool.query(
        `UPDATE entity_extractions 
         SET current_version = $1, audit_chain_hash = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [version, chain_hash, entityId]
      );

      const row = result.rows[0];
      const entry: AuditTrailEntry = {
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      };

      logger.info('📝 Created audit trail entry for entity retirement', {
        entityId,
        version,
        chainHash: chain_hash
      });

      return entry;
    } catch (error: any) {
      logger.error('❌ Failed to record entity retirement audit', {
        entityId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get complete lineage for an entity
   */
  async getEntityLineage(
    entityId: string,
    options: { limit?: number } = {}
  ): Promise<AuditTrailEntry[]> {
    try {
      const limit = options.limit || 100;
      const result = await pool.query(
        `SELECT id, entity_id, version, operation_type, timestamp, changed_by, 
                previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
         FROM entity_audit_trail 
         WHERE entity_id = $1 
         ORDER BY version ASC
         LIMIT $2`,
        [entityId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      }));
    } catch (error: any) {
      logger.error('❌ Failed to get entity lineage', {
        entityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify the cryptographic chain for an entity
   */
  async verifyEntityChain(entityId: string): Promise<boolean> {
    try {
      const lineage = await this.getEntityLineage(entityId);
      
      if (lineage.length === 0) {
        return true; // No audit trail yet, nothing to verify
      }

      // Build entries with the format expected by verifyAuditChain
      const entries = lineage.map(entry => ({
        snapshot_hash: entry.snapshot_hash,
        chain_hash: entry.chain_hash,
        previous_version_id: entry.previous_version_id,
        version: entry.version
      }));

      return verifyAuditChain(entries);
    } catch (error: any) {
      logger.error('❌ Failed to verify entity chain', {
        entityId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get entity state at a specific version
   */
  async getEntityAtVersion(
    entityId: string,
    version: number
  ): Promise<AuditTrailEntry | null> {
    try {
      const result = await pool.query(
        `SELECT id, entity_id, version, operation_type, timestamp, changed_by, 
                previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
         FROM entity_audit_trail 
         WHERE entity_id = $1 AND version = $2
         LIMIT 1`,
        [entityId, version]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      };
    } catch (error: any) {
      logger.error('❌ Failed to get entity at version', {
        entityId,
        version,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get entity state as of a specific timestamp
   */
  async getEntityAsOf(
    entityId: string,
    timestamp: Date
  ): Promise<AuditTrailEntry | null> {
    try {
      const result = await pool.query(
        `SELECT id, entity_id, version, operation_type, timestamp, changed_by, 
                previous_version_id, entity_snapshot, snapshot_hash, chain_hash, metadata
         FROM entity_audit_trail 
         WHERE entity_id = $1 AND timestamp <= $2
         ORDER BY timestamp DESC, version DESC
         LIMIT 1`,
        [entityId, timestamp]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        entity_id: row.entity_id,
        version: row.version,
        operation_type: row.operation_type,
        timestamp: row.timestamp,
        changed_by: row.changed_by,
        previous_version_id: row.previous_version_id,
        entity_snapshot: typeof row.entity_snapshot === 'string' 
          ? JSON.parse(row.entity_snapshot) 
          : row.entity_snapshot,
        snapshot_hash: row.snapshot_hash,
        chain_hash: row.chain_hash,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata
      };
    } catch (error: any) {
      logger.error('❌ Failed to get entity as of timestamp', {
        entityId,
        timestamp: timestamp.toISOString(),
        error: error.message
      });
      throw error;
    }
  }
}

// Singleton instance
export const entityAuditService = new EntityAuditService();

export default entityAuditService;
