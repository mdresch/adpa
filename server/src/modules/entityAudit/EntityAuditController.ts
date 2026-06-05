/**
 * Entity Audit Controller
 * Provides API endpoints for querying the immutable entity audit trail
 * Phase 1-3: Full crypto signing for immutable temporal tracking
 */

import { Request, Response } from 'express';
import { entityAuditService } from '../../services/entityAuditService';
import { logger } from '../../utils/logger';

export class EntityAuditController {
  
  /**
   * GET /api/v1/entity-audit/lineage/:entityId
   * Get complete lineage/audit trail for an entity
   */
  async getEntityLineage(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { limit } = req.query;
      
      if (!entityId) {
        return res.status(400).json({
          error: 'entityId parameter is required'
        });
      }
      
      const options = limit ? { limit: parseInt(limit as string) } : {};
      const lineage = await entityAuditService.getEntityLineage(entityId, options);
      
      return res.json({
        success: true,
        entityId,
        lineage,
        count: lineage.length
      });
    } catch (error: any) {
      logger.error('Failed to get entity lineage', {
        entityId: req.params.entityId,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to retrieve entity lineage',
        details: error.message
      });
    }
  }

  /**
   * GET /api/v1/entity-audit/version/:entityId/:version
   * Get entity state at a specific version
   */
  async getEntityAtVersion(req: Request, res: Response) {
    try {
      const { entityId, version } = req.params;
      
      if (!entityId || !version) {
        return res.status(400).json({
          error: 'entityId and version parameters are required'
        });
      }
      
      const versionNum = parseInt(version);
      if (isNaN(versionNum)) {
        return res.status(400).json({
          error: 'version must be a valid number'
        });
      }
      
      const entry = await entityAuditService.getEntityAtVersion(entityId, versionNum);
      
      if (!entry) {
        return res.status(404).json({
          error: 'Audit entry not found for specified version'
        });
      }
      
      return res.json({
        success: true,
        entityId,
        version: entry.version,
        entry
      });
    } catch (error: any) {
      logger.error('Failed to get entity at version', {
        entityId: req.params.entityId,
        version: req.params.version,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to retrieve entity at version',
        details: error.message
      });
    }
  }

  /**
   * GET /api/v1/entity-audit/as-of/:entityId
   * Get entity state as of a specific timestamp
   * Query param: timestamp (ISO 8601 date string)
   */
  async getEntityAsOf(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { timestamp } = req.query;
      
      if (!entityId) {
        return res.status(400).json({
          error: 'entityId parameter is required'
        });
      }
      
      if (!timestamp) {
        return res.status(400).json({
          error: 'timestamp query parameter is required (ISO 8601 format)'
        });
      }
      
      const timestampDate = new Date(timestamp as string);
      if (isNaN(timestampDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid timestamp format. Use ISO 8601 (e.g., 2026-01-01T00:00:00Z)'
        });
      }
      
      const entry = await entityAuditService.getEntityAsOf(entityId, timestampDate);
      
      if (!entry) {
        return res.status(404).json({
          error: 'No audit entry found for the specified timestamp'
        });
      }
      
      return res.json({
        success: true,
        entityId,
        timestamp: timestampDate.toISOString(),
        entry
      });
    } catch (error: any) {
      logger.error('Failed to get entity as of timestamp', {
        entityId: req.params.entityId,
        timestamp: req.query.timestamp,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to retrieve entity as of timestamp',
        details: error.message
      });
    }
  }

  /**
   * GET /api/v1/entity-audit/verify/:entityId
   * Verify the cryptographic chain for an entity
   */
  async verifyEntityChain(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      
      if (!entityId) {
        return res.status(400).json({
          error: 'entityId parameter is required'
        });
      }
      
      const isValid = await entityAuditService.verifyEntityChain(entityId);
      
      return res.json({
        success: true,
        entityId,
        chainValid: isValid,
        message: isValid 
          ? 'Cryptographic chain is valid - no tampering detected' 
          : 'CRITICAL: Cryptographic chain is invalid - possible tampering detected!'
      });
    } catch (error: any) {
      logger.error('Failed to verify entity chain', {
        entityId: req.params.entityId,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to verify entity chain',
        details: error.message
      });
    }
  }

  /**
   * GET /api/v1/entity-audit/latest/:entityId
   * Get the latest audit entry for an entity
   */
  async getLatestAuditEntry(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      
      if (!entityId) {
        return res.status(400).json({
          error: 'entityId parameter is required'
        });
      }
      
      const entry = await entityAuditService.getLatestAuditEntry(entityId);
      
      if (!entry) {
        return res.status(404).json({
          error: 'No audit entries found for this entity'
        });
      }
      
      return res.json({
        success: true,
        entityId,
        latestEntry: entry
      });
    } catch (error: any) {
      logger.error('Failed to get latest audit entry', {
        entityId: req.params.entityId,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to retrieve latest audit entry',
        details: error.message
      });
    }
  }

  /**
   * GET /api/v1/entity-audit/versions/:entityId
   * Get all version information for an entity (summary)
   */
  async getEntityVersions(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      
      if (!entityId) {
        return res.status(400).json({
          error: 'entityId parameter is required'
        });
      }
      
      const lineage = await entityAuditService.getEntityLineage(entityId);
      
      const versions = lineage.map(entry => ({
        version: entry.version,
        operation_type: entry.operation_type,
        timestamp: entry.timestamp,
        changed_by: entry.changed_by,
        snapshot_hash: entry.snapshot_hash,
        chain_hash: entry.chain_hash
      }));
      
      return res.json({
        success: true,
        entityId,
        versions,
        currentVersion: versions.length > 0 ? versions[versions.length - 1].version : null,
        chainValid: await entityAuditService.verifyEntityChain(entityId)
      });
    } catch (error: any) {
      logger.error('Failed to get entity versions', {
        entityId: req.params.entityId,
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Failed to retrieve entity versions',
        details: error.message
      });
    }
  }
}

export const entityAuditController = new EntityAuditController();

export default entityAuditController;
