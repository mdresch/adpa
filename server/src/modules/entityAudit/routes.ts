/**
 * Entity Audit Routes
 * API routes for querying the immutable entity audit trail
 * Phase 1-3: Full crypto signing for immutable temporal tracking
 */

import express from 'express';
import { entityAuditController } from './EntityAuditController';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

/**
 * Entity Audit Routes
 * All routes are authenticated by default
 */

// Get complete lineage/audit trail for an entity
router.get('/lineage/:entityId', authenticate, entityAuditController.getEntityLineage);

// Get entity state at a specific version
router.get('/version/:entityId/:version', authenticate, entityAuditController.getEntityAtVersion);

// Get entity state as of a specific timestamp
router.get('/as-of/:entityId', authenticate, entityAuditController.getEntityAsOf);

// Verify cryptographic chain for an entity
router.get('/verify/:entityId', authenticate, entityAuditController.verifyEntityChain);

// Get latest audit entry for an entity
router.get('/latest/:entityId', authenticate, entityAuditController.getLatestAuditEntry);

// Get all versions summary for an entity
router.get('/versions/:entityId', authenticate, entityAuditController.getEntityVersions);

export default router;
