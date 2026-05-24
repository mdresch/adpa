import express, { Request, Response } from 'express';
import Joi from 'joi';
import { pool } from '../database/connection';
import { authenticateToken, requireIntegrationReadAccess, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { childLogger } from '../utils/logger';
import { mongoVectorStore } from '../services/mongoVectorStore';
import {
    mongoDBSyncService,
    persistMongoSyncProgress,
    readMongoSyncProgress,
} from '../services/mongoDBSyncService';
import { searchMongoChunks } from '../services/mongoRagService';

const router = express.Router();
const log = childLogger({ component: 'mongodbIntegrationRoutes' });

const searchSchema = Joi.object({
    query: Joi.string().min(2).max(2000).required(),
    topK: Joi.number().integer().min(1).max(50).default(5),
    projectId: Joi.string().uuid().optional(),
});

const syncSchema = Joi.object({
    projectId: Joi.string().uuid().allow(null).optional(),
    limit: Joi.number().integer().min(1).max(5000).optional(),
});

async function getIntegrationType(integrationId: string): Promise<string | null> {
    const result = await pool.query(
        `SELECT type FROM integrations WHERE id = $1`,
        [integrationId]
    );
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0].type as string;
}

function buildMongoCapabilityFlags(stats: {
    configured: boolean;
    embeddedChunks: number;
    indexStatus: string;
}) {
    const voyageConfigured = Boolean(process.env.VOYAGE_API_KEY);
    const embeddingMode = (process.env.MONGODB_EMBEDDING_MODE || 'atlas').toLowerCase();
    const searchReady =
        stats.configured &&
        voyageConfigured &&
        stats.embeddedChunks > 0 &&
        (stats.indexStatus === 'active' || stats.indexStatus === 'building');

    let setupHint: string | undefined;
    if (!stats.configured) {
        setupHint = 'Set MONGODB_URI on the API server, then restart the backend.';
    } else if (!voyageConfigured) {
        setupHint = 'Set VOYAGE_API_KEY on the API server for semantic search embeddings.';
    } else if (stats.embeddedChunks === 0) {
        setupHint =
            embeddingMode === 'server'
                ? 'Run a MongoDB sync from the Integrations overview (embeddings are generated during sync).'
                : 'Run a MongoDB sync, then wait for Atlas to finish embedding chunks (MONGODB_EMBEDDING_MODE=atlas).';
    } else if (stats.indexStatus === 'missing') {
        setupHint = 'Create the Atlas Vector Search index on the chunks collection.';
    }

    return { voyageConfigured, embeddingMode, searchReady, setupHint };
}

async function handleStats(_req: Request, res: Response) {
    try {
        if (!mongoVectorStore.isMongoConfigured()) {
            const payload = {
                documents: 0,
                chunks: 0,
                embeddedChunks: 0,
                embeddingPercentage: 0,
                indexStatus: 'not_configured',
                database: process.env.MONGODB_DB_NAME || 'adpa_rag',
                configured: false,
            };
            return res.json({
                ...payload,
                ...buildMongoCapabilityFlags(payload),
            });
        }

        const stats = await mongoVectorStore.getStats();
        return res.json({
            ...stats,
            ...buildMongoCapabilityFlags(stats),
        });
    } catch (error) {
        log.error('MongoDB stats failed', error);
        return res.status(503).json({
            error: 'MongoDB unavailable',
            message: (error as Error).message,
        });
    }
}

router.get(
    '/mongodb/stats',
    authenticateToken,
    requireIntegrationReadAccess,
    handleStats
);

router.get(
    '/:integrationId/mongodb/stats',
    authenticateToken,
    requireIntegrationReadAccess,
    handleStats
);

router.get(
    '/:integrationId/pinecone/stats',
    authenticateToken,
    requireIntegrationReadAccess,
    async (_req: Request, res: Response) => {
        try {
            const { pineconeService } = await import('../services/pineconeService');
            const stats = await pineconeService.getIndexStats();
            if (!stats) {
                return res.status(503).json({ error: 'Pinecone unavailable' });
            }
            return res.json(stats);
        } catch (error) {
            log.error('Pinecone stats failed', error);
            return res.status(503).json({
                error: 'Pinecone unavailable',
                message: (error as Error).message,
            });
        }
    }
);

router.post(
    '/mongodb/search',
    authenticateToken,
    requireIntegrationReadAccess,
    validate(searchSchema),
    async (req: Request, res: Response) => {
        try {
            const { query, topK, projectId } = req.body;
            const matches = await searchMongoChunks(query, topK, projectId);
            return res.json({ success: true, matches });
        } catch (error) {
            log.error('MongoDB search failed', error);
            return res.status(503).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }
);

router.post(
    '/:integrationId/mongodb/search',
    authenticateToken,
    requireIntegrationReadAccess,
    validate(searchSchema),
    async (req: Request, res: Response) => {
        try {
            const { query, topK, projectId } = req.body;
            const matches = await searchMongoChunks(query, topK, projectId);
            return res.json({ success: true, matches });
        } catch (error) {
            log.error('MongoDB search failed', error);
            return res.status(503).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }
);

router.post(
    '/:integrationId/sync',
    authenticateToken,
    requirePermission('integrations.sync'),
    validate(syncSchema),
    async (req: Request, res: Response) => {
        const { integrationId } = req.params;

        try {
            const integrationType = await getIntegrationType(integrationId);
            if (!integrationType) {
                return res.status(404).json({ success: false, message: 'Integration not found' });
            }

            const projectId =
                req.body.projectId === undefined || req.body.projectId === 'all'
                    ? null
                    : req.body.projectId;
            const limit = req.body.limit as number | undefined;

            if (integrationType === 'pinecone') {
                const { pineconeService } = await import('../services/pineconeService');
                void (async () => {
                    try {
                        await pool.query(
                            `UPDATE integrations SET sync_status = 'syncing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                            [integrationId]
                        );
                        await pineconeService.syncAll(projectId ?? undefined);
                        await pool.query(
                            `UPDATE integrations SET sync_status = 'completed', last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                            [integrationId]
                        );
                    } catch (err) {
                        log.error('Background Pinecone sync failed', err);
                        await pool.query(
                            `UPDATE integrations SET sync_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                            [integrationId]
                        );
                    }
                })();
                return res.json({ success: true, message: 'Pinecone sync started' });
            }

            if (integrationType !== 'mongodb') {
                return res.status(400).json({
                    success: false,
                    message: `Sync not supported for integration type: ${integrationType}`,
                });
            }

            await persistMongoSyncProgress(integrationId, {
                total: 0,
                synced: 0,
                skipped: 0,
                errors: 0,
                status: 'syncing',
            });

            void (async () => {
                try {
                    await mongoDBSyncService.syncProjectDocuments(projectId, limit, async (progress) => {
                        await persistMongoSyncProgress(integrationId, progress);
                    });
                } catch (err) {
                    log.error('Background MongoDB sync failed', err);
                    await persistMongoSyncProgress(integrationId, {
                        total: 0,
                        synced: 0,
                        skipped: 0,
                        errors: 1,
                        status: 'error',
                    });
                }
            })();

            return res.json({ success: true, message: 'MongoDB sync started' });
        } catch (error) {
            log.error('Failed to start vector sync', error);
            return res.status(500).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }
);

router.get(
    '/:integrationId/sync/status',
    authenticateToken,
    requireIntegrationReadAccess,
    async (req: Request, res: Response) => {
        try {
            const { integrationId } = req.params;
            const progress = await readMongoSyncProgress(integrationId);
            if (!progress) {
                return res.json({
                    total: 0,
                    synced: 0,
                    skipped: 0,
                    errors: 0,
                    status: 'idle',
                });
            }
            return res.json(progress);
        } catch (error) {
            log.error('Failed to read MongoDB sync status', error);
            return res.status(500).json({
                error: 'Failed to read sync status',
                message: (error as Error).message,
            });
        }
    }
);

export default router;
