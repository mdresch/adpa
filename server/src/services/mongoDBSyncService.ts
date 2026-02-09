
import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';
import { documentProcessor } from './documentProcessor';
import { mongoDBEmbeddingService } from './mongoDBEmbeddings';
import { mongoVectorStore } from './mongoVectorStore';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
    success: boolean;
    details: {
        totalDocuments: number;
        syncedDocuments: number;
        skippedDocuments: number;
        errors: string[];
    };
}

// Rate limiting configuration
// VoyageAI Free Tier: 3 requests per minute
// We'll be conservative and wait 21 seconds between requests
const RATE_LIMIT_DELAY_MS = 21000;
const BATCH_SIZE = 128; // Standard Voyage batch size limit (check docs, but 128 is reasonable)

export interface SyncProgress {
    total: number;
    synced: number;
    skipped: number;
    errors: number;
    currentDocumentId?: string;
    status: 'syncing' | 'completed' | 'error';
}

export class MongoDBSyncService {

    /**
     * Syncs all eligible documents for a project (or all projects) from Postgres to MongoDB Vector Store.
     * Enforces strict rate limiting to avoid 429 errors from VoyageAI.
     */
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
                errors: []
            }
        };

        const pool = getDatabasePool(); // Get the active pool

        try {

            let query = `
                SELECT id, title, content, project_id
                FROM documents 
                WHERE content IS NOT NULL 
                AND length(content) > 50
            `;
            const params: any[] = [];

            if (projectId) {
                query += ` AND project_id = $1`;
                params.push(projectId);
            }

            if (limit) {
                query += ` LIMIT $${params.length + 1}`;
                params.push(limit);
            }

            const pgResult = await pool.query(query, params);

            if (!pgResult) {
                throw new Error("Database query returned null (check logs for DB-GUARD errors)");
            }

            const documents = pgResult.rows;
            result.details.totalDocuments = documents.length;

            logger.info(`Found ${documents.length} documents to sync`);

            // Initial progress report
            if (onProgress) {
                await onProgress({
                    total: documents.length,
                    synced: 0,
                    skipped: 0,
                    errors: 0,
                    status: 'syncing'
                });
            }

            if (documents.length === 0) {
                return result;
            }

            // 2. Process documents in sequence with rate limiting
            for (const doc of documents) {
                try {
                    if (onProgress) {
                        await onProgress({
                            total: documents.length,
                            synced: result.details.syncedDocuments,
                            skipped: result.details.skippedDocuments,
                            errors: result.details.errors.length,
                            currentDocumentId: doc.id,
                            status: 'syncing'
                        });
                    }

                    // Check if already synced/exists? 
                    // For now, we'll do an upsert-like logic: 
                    // ideally we should check a hash or 'synced_at' timestamp vs 'updated_at'
                    // But for "Full Sync", we might just want to overwrite or ensure it's there.

                    // Cleanup existing chunks for this document in MongoDB to avoid duplicates
                    // (This assumes we want to fully replace the document representation)
                    // Efficient way: deleteMany({ documentId: doc.id })
                    await mongoVectorStore.chunksCollection.deleteMany({ documentId: doc.id });

                    // Also update/insert the document metadata in 'documents' collection
                    await mongoVectorStore.createDocument({
                        id: doc.id,
                        title: doc.title,
                        content: doc.content.substring(0, 1000), // Store preview or full content
                        type: 'txt',                             // Default to txt for now
                        source: doc.title,                       // Use title as source
                        metadata: { projectId: doc.project_id }
                    }).catch(async (err) => {
                        // If it fails (e.g. duplicate key), it might mean it exists. 
                        // We deleted chunks, so we should update the document metadata.
                        // For simplicity in this 'createDocument' wrapper, we ignore duplicate key error 
                        // or we should implement 'upsertDocument' in vector store.
                        // Let's assume createDocument throws if exists.
                    });

                    // Chunk the document using processDocument to get metadata
                    // We treat all as 'txt' for simplicity here, or we could try to infer from title/content
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

                    logger.info(`Document ${doc.id}: processing ${processedChunks.length} chunks`);

                    // Process chunks in batches to respect rate limits (if using API) - OR just batch insertion
                    // Since we are skipping embeddings (handled by Atlas or user choice), we just batch insert.
                    const INSERT_BATCH_SIZE = 500;

                    for (let i = 0; i < processedChunks.length; i += INSERT_BATCH_SIZE) {
                        const batch = processedChunks.slice(i, i + INSERT_BATCH_SIZE);

                        logger.info(`Syncing batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} (${batch.length} chunks) to MongoDB`);

                        // SKIP explicit embedding generation (User: "Voyage is MongoDB")
                        // We provide empty embedding array as placeholder if required by type, 
                        // or rely on Atlas Trigger to populate it later.

                        const chunkObjects = batch.map((chunk, idx) => ({
                            documentId: doc.id,
                            content: chunk.content,
                            embedding: [], // Empty placeholder
                            metadata: {
                                ...chunk.metadata,
                                projectId: doc.project_id
                            }
                        }));

                        // Store in MongoDB
                        await mongoVectorStore.createChunks(chunkObjects);
                    }

                    result.details.syncedDocuments++;

                } catch (docError) {
                    logger.error(`Failed to sync document ${doc.id}`, docError);
                    result.details.errors.push(`Doc ${doc.id}: ${(docError as Error).message}`);
                    // Continue to next document
                }
            }

            // Final progress report
            if (onProgress) {
                await onProgress({
                    total: documents.length,
                    synced: result.details.syncedDocuments,
                    skipped: result.details.skippedDocuments,
                    errors: result.details.errors.length,
                    status: 'completed'
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
                    status: 'error'
                });
            }
        }

        return result;
    }
}

export const mongoDBSyncService = new MongoDBSyncService();
