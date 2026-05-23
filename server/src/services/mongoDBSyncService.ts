
import { getDatabasePool } from '../database/connection';
import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { documentProcessor } from './documentProcessor';
import { mongoDBEmbeddingService } from './mongoDBEmbeddings';
import { mongoVectorStore } from './mongoVectorStore';
import type { MongoChunkWriteInput } from '../lib/mongoChunkSchema';

export interface SyncResult {
    success: boolean;
    details: {
        totalDocuments: number;
        syncedDocuments: number;
        skippedDocuments: number;
        errors: string[];
    };
}

export interface SyncProgress {
    total: number;
    synced: number;
    skipped: number;
    errors: number;
    currentDocumentId?: string;
    status: 'syncing' | 'completed' | 'error';
}

const RATE_LIMIT_DELAY_MS = 21000;
const INSERT_BATCH_SIZE = 500;
const EMBEDDING_BATCH_SIZE = 32;

function getEmbeddingMode(): 'atlas' | 'server' {
    const mode = (process.env.MONGODB_EMBEDDING_MODE || 'atlas').toLowerCase();
    return mode === 'server' ? 'server' : 'atlas';
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function persistMongoSyncProgress(
    integrationId: string,
    progress: SyncProgress
): Promise<void> {
    const syncStatus =
        progress.status === 'syncing'
            ? 'syncing'
            : progress.status === 'completed'
              ? 'completed'
              : 'failed';

    await pool.query(
        `UPDATE integrations
         SET sync_status = $2,
             configuration = COALESCE(configuration, '{}'::jsonb) || jsonb_build_object('mongodb_sync_progress', $3::jsonb),
             last_sync = CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE last_sync END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [integrationId, syncStatus, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() })]
    );
}

export async function readMongoSyncProgress(integrationId: string): Promise<SyncProgress | null> {
    const result = await pool.query(
        `SELECT sync_status, configuration FROM integrations WHERE id = $1`,
        [integrationId]
    );
    if (result.rows.length === 0) {
        return null;
    }
    const row = result.rows[0];
    const stored = row.configuration?.mongodb_sync_progress;
    if (stored && typeof stored === 'object') {
        return stored as SyncProgress;
    }
    if (row.sync_status === 'syncing') {
        return { total: 0, synced: 0, skipped: 0, errors: 0, status: 'syncing' };
    }
    return null;
}

export class MongoDBSyncService {
    async syncProjectDocuments(
        projectId: string | null,
        limit?: number,
        onProgress?: (progress: SyncProgress) => Promise<void>
    ): Promise<SyncResult> {
        logger.info(`Starting MongoDB sync for ${projectId ? `project: ${projectId}` : 'ALL projects'} (limit: ${limit || 'all'})`);

        const result: SyncResult = {
            success: true,
            details: {
                totalDocuments: 0,
                syncedDocuments: 0,
                skippedDocuments: 0,
                errors: [],
            },
        };

        const dbPool = getDatabasePool();
        const embeddingMode = getEmbeddingMode();

        try {
            if (!mongoVectorStore.isMongoConfigured()) {
                throw new Error('MONGODB_URI is not configured');
            }

            await mongoVectorStore.connect();

            let query = `
                SELECT id, COALESCE(NULLIF(TRIM(title), ''), name) AS title, content, project_id
                FROM documents
                WHERE content IS NOT NULL
                AND length(content) > 50
                AND deleted_at IS NULL
            `;
            const params: Array<string | number> = [];

            if (projectId) {
                params.push(projectId);
                query += ` AND project_id = $${params.length}`;
            }

            if (limit) {
                params.push(limit);
                query += ` LIMIT $${params.length}`;
            }

            const pgResult = await dbPool.query(query, params);
            if (!pgResult) {
                throw new Error('Database query returned null (check logs for DB-GUARD errors)');
            }

            const documents = pgResult.rows;
            result.details.totalDocuments = documents.length;

            if (onProgress) {
                await onProgress({
                    total: documents.length,
                    synced: 0,
                    skipped: 0,
                    errors: 0,
                    status: 'syncing',
                });
            }

            if (documents.length === 0) {
                return result;
            }

            for (const doc of documents) {
                try {
                    if (onProgress) {
                        await onProgress({
                            total: documents.length,
                            synced: result.details.syncedDocuments,
                            skipped: result.details.skippedDocuments,
                            errors: result.details.errors.length,
                            currentDocumentId: doc.id,
                            status: 'syncing',
                        });
                    }

                    await mongoVectorStore.chunksCollection.deleteMany({
                        $or: [{ documentId: doc.id }, { document_id: doc.id }],
                    });

                    const preview =
                        typeof doc.content === 'string'
                            ? doc.content.substring(0, 1000)
                            : JSON.stringify(doc.content).substring(0, 1000);

                    await mongoVectorStore.upsertDocument({
                        id: doc.id,
                        title: doc.title || 'Untitled',
                        content: preview,
                        type: 'markdown',
                        source: doc.title || doc.id,
                        metadata: { projectId: doc.project_id },
                    });

                    const processedChunks = await documentProcessor.processDocument(
                        doc.content,
                        doc.id,
                        'txt'
                    );

                    if (processedChunks.length === 0) {
                        logger.warn(`Document ${doc.id} produced 0 chunks`);
                        result.details.skippedDocuments++;
                        continue;
                    }

                    if (embeddingMode === 'server') {
                        for (let i = 0; i < processedChunks.length; i += EMBEDDING_BATCH_SIZE) {
                            const batch = processedChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
                            const texts = batch.map((c) => c.content);
                            const embeddings = await mongoDBEmbeddingService.generateEmbeddings(
                                texts,
                                'document'
                            );

                            const chunkObjects: MongoChunkWriteInput[] = batch.map((chunk, idx) => ({
                                documentId: doc.id,
                                content: chunk.content,
                                embedding: embeddings[idx] ?? [],
                                projectId: doc.project_id,
                                chunkIndex: chunk.metadata?.chunkIndex ?? i + idx,
                                metadata: {
                                    ...chunk.metadata,
                                    projectId: doc.project_id,
                                },
                            }));

                            await mongoVectorStore.createChunks(chunkObjects);

                            if (i + EMBEDDING_BATCH_SIZE < processedChunks.length) {
                                await sleep(RATE_LIMIT_DELAY_MS);
                            }
                        }
                    } else {
                        for (let i = 0; i < processedChunks.length; i += INSERT_BATCH_SIZE) {
                            const batch = processedChunks.slice(i, i + INSERT_BATCH_SIZE);
                            const chunkObjects: MongoChunkWriteInput[] = batch.map((chunk, idx) => ({
                                documentId: doc.id,
                                content: chunk.content,
                                embedding: [],
                                projectId: doc.project_id,
                                chunkIndex: chunk.metadata?.chunkIndex ?? i + idx,
                                metadata: {
                                    ...chunk.metadata,
                                    projectId: doc.project_id,
                                },
                            }));
                            await mongoVectorStore.createChunks(chunkObjects);
                        }
                    }

                    result.details.syncedDocuments++;
                } catch (docError) {
                    logger.error(`Failed to sync document ${doc.id}`, docError);
                    result.details.errors.push(`Doc ${doc.id}: ${(docError as Error).message}`);
                }
            }

            if (onProgress) {
                await onProgress({
                    total: documents.length,
                    synced: result.details.syncedDocuments,
                    skipped: result.details.skippedDocuments,
                    errors: result.details.errors.length,
                    status: 'completed',
                });
            }
        } catch (error) {
            logger.error('Full sync failed', error);
            result.success = false;
            result.details.errors.push((error as Error).message);

            if (onProgress) {
                await onProgress({
                    total: 0,
                    synced: 0,
                    skipped: 0,
                    errors: 1,
                    status: 'error',
                });
            }
        }

        return result;
    }
}

export const mongoDBSyncService = new MongoDBSyncService();
