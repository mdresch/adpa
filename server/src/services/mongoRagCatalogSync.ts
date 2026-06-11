import { getDatabasePool } from '../database/connection';
import { withRagLineage } from '../lib/mongoRagHierarchy';
import type { MongoChunkWriteInput } from '../lib/mongoChunkSchema';
import {
    buildEntityRagText,
    buildPortfolioRagText,
    buildProgramRagText,
    buildProjectRagText,
} from '../lib/mongoRagText';
import { logger } from '../utils/logger';
import { mongoDBEmbeddingService } from './mongoDBEmbeddings';
import { mongoVectorStore } from './mongoVectorStore';

const RATE_LIMIT_DELAY_MS = 21000;
const ENTITY_BATCH_SIZE = 32;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedChunkTexts(
    texts: string[],
    embeddingMode: 'atlas' | 'server'
): Promise<number[][]> {
    if (embeddingMode !== 'server' || texts.length === 0) {
        return texts.map(() => []);
    }

    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += ENTITY_BATCH_SIZE) {
        const batch = texts.slice(i, i + ENTITY_BATCH_SIZE);
        const batchEmbeddings = await mongoDBEmbeddingService.generateEmbeddings(batch, 'document');
        embeddings.push(...batchEmbeddings);
        if (i + ENTITY_BATCH_SIZE < texts.length) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }
    return embeddings;
}

async function writeCatalogChunks(
    chunks: MongoChunkWriteInput[],
    embeddingMode: 'atlas' | 'server'
): Promise<void> {
    if (chunks.length === 0) {
        return;
    }

    if (embeddingMode === 'server') {
        const texts = chunks.map((c) => c.content);
        const embeddings = await embedChunkTexts(texts, embeddingMode);
        const withEmbeddings = chunks.map((chunk, index) => ({
            ...chunk,
            embedding: embeddings[index] ?? [],
        }));
        await mongoVectorStore.createChunks(withEmbeddings);
        return;
    }

    await mongoVectorStore.createChunks(chunks.map((c) => ({ ...c, embedding: [] })));
}

export async function syncPortfoliosToMongo(
    projectId: string | null,
    embeddingMode: 'atlas' | 'server'
): Promise<{ synced: number; errors: string[] }> {
    const dbPool = getDatabasePool();
    const errors: string[] = [];
    let synced = 0;

    let query = `
        SELECT DISTINCT pg.id, pg.portfolio_name, pg.description, pg.status
        FROM portfolio_governance pg
    `;
    const params: string[] = [];

    if (projectId) {
        params.push(projectId);
        query += `
        INNER JOIN programs pr ON pr.portfolio_id = pg.id
        INNER JOIN projects p ON p.program_id = pr.id
        WHERE p.id = $${params.length}
        `;
    }

    const result = await dbPool.query(query, params);
    await mongoVectorStore.connect();

    for (const row of result.rows) {
        try {
            const content = buildPortfolioRagText(row);
            await mongoVectorStore.upsertPortfolio({
                id: row.id,
                name: row.portfolio_name,
                description: row.description,
                status: row.status,
                metadata: { source: 'mongo-rag-catalog-sync' },
            });
            await mongoVectorStore.deleteChunksForSource(row.id, 'portfolio');

            const chunk = withRagLineage(
                {
                    documentId: row.id,
                    content,
                    embedding: [],
                    portfolioId: row.id,
                    sourceType: 'portfolio',
                    chunkIndex: 0,
                    metadata: { sourceType: 'portfolio', portfolioId: row.id },
                },
                { portfolioId: row.id }
            );

            await writeCatalogChunks([chunk], embeddingMode);
            synced++;
        } catch (err) {
            const message = `Portfolio ${row.id}: ${(err as Error).message}`;
            errors.push(message);
            logger.error('Mongo portfolio catalog sync failed', { portfolioId: row.id, error: message });
        }
    }

    return { synced, errors };
}

export async function syncProgramsToMongo(
    projectId: string | null,
    embeddingMode: 'atlas' | 'server'
): Promise<{ synced: number; errors: string[] }> {
    const dbPool = getDatabasePool();
    const errors: string[] = [];
    let synced = 0;

    let query = `
        SELECT DISTINCT pr.id, pr.name, pr.description, pr.status, pr.portfolio_id
        FROM programs pr
    `;
    const params: string[] = [];

    if (projectId) {
        params.push(projectId);
        query += `
        INNER JOIN projects p ON p.program_id = pr.id
        WHERE p.id = $${params.length}
        `;
    } else {
        query += ` WHERE COALESCE(pr.archived, false) = false`;
    }

    const result = await dbPool.query(query, params);
    await mongoVectorStore.connect();

    for (const row of result.rows) {
        try {
            const content = buildProgramRagText(row);
            await mongoVectorStore.upsertProgram({
                id: row.id,
                name: row.name,
                description: row.description,
                status: row.status,
                portfolioId: row.portfolio_id,
                metadata: { source: 'mongo-rag-catalog-sync' },
            });
            await mongoVectorStore.deleteChunksForSource(row.id, 'program');

            const chunk = withRagLineage(
                {
                    documentId: row.id,
                    content,
                    embedding: [],
                    programId: row.id,
                    portfolioId: row.portfolio_id,
                    sourceType: 'program',
                    chunkIndex: 0,
                    metadata: {
                        sourceType: 'program',
                        programId: row.id,
                        portfolioId: row.portfolio_id,
                    },
                },
                { portfolioId: row.portfolio_id, programId: row.id }
            );

            await writeCatalogChunks([chunk], embeddingMode);
            synced++;
        } catch (err) {
            const message = `Program ${row.id}: ${(err as Error).message}`;
            errors.push(message);
            logger.error('Mongo program catalog sync failed', { programId: row.id, error: message });
        }
    }

    return { synced, errors };
}

export async function syncProjectsToMongo(
    projectId: string | null,
    embeddingMode: 'atlas' | 'server'
): Promise<{ synced: number; errors: string[] }> {
    const dbPool = getDatabasePool();
    const errors: string[] = [];
    let synced = 0;

    let query = `
        SELECT p.id, p.name, p.description, p.framework, p.status,
               p.program_id, pr.portfolio_id
        FROM projects p
        LEFT JOIN programs pr ON p.program_id = pr.id
        WHERE 1=1
    `;
    const params: string[] = [];
    if (projectId) {
        params.push(projectId);
        query += ` AND p.id = $${params.length}`;
    }

    const result = await dbPool.query(query, params);
    await mongoVectorStore.connect();

    for (const row of result.rows) {
        try {
            const content = buildProjectRagText(row);
            await mongoVectorStore.upsertProject({
                id: row.id,
                name: row.name,
                description: row.description,
                framework: row.framework,
                status: row.status,
                programId: row.program_id,
                portfolioId: row.portfolio_id,
                metadata: { source: 'mongo-rag-catalog-sync' },
            });
            await mongoVectorStore.deleteChunksForSource(row.id, 'project');

            const chunk = withRagLineage(
                {
                    documentId: row.id,
                    content,
                    embedding: [],
                    projectId: row.id,
                    programId: row.program_id,
                    portfolioId: row.portfolio_id,
                    sourceType: 'project',
                    chunkIndex: 0,
                    metadata: { sourceType: 'project', projectId: row.id },
                },
                {
                    portfolioId: row.portfolio_id,
                    programId: row.program_id,
                    projectId: row.id,
                }
            );

            await writeCatalogChunks([chunk], embeddingMode);
            synced++;
        } catch (err) {
            const message = `Project ${row.id}: ${(err as Error).message}`;
            errors.push(message);
            logger.error('Mongo project catalog sync failed', { projectId: row.id, error: message });
        }
    }

    return { synced, errors };
}

export async function syncEntitiesToMongo(
    projectId: string | null,
    embeddingMode: 'atlas' | 'server'
): Promise<{ synced: number; errors: string[] }> {
    const dbPool = getDatabasePool();
    const errors: string[] = [];
    let synced = 0;

    let query = `
        SELECT ee.id, ee.project_id, ee.document_id, ee.entity_type, ee.entity_name, ee.entity_data,
               p.program_id, pr.portfolio_id
        FROM entity_extractions ee
        LEFT JOIN projects p ON ee.project_id = p.id
        LEFT JOIN programs pr ON p.program_id = pr.id
        WHERE ee.status = 'active'
        AND (ee.is_verified = true OR ee.extraction_confidence >= 80)
    `;
    const params: string[] = [];
    if (projectId) {
        params.push(projectId);
        query += ` AND ee.project_id = $${params.length}`;
    }

    const result = await dbPool.query(query, params);
    await mongoVectorStore.connect();

    const pendingChunks: MongoChunkWriteInput[] = [];
    const pendingEntityIds: string[] = [];

    for (const row of result.rows) {
        try {
            const entityData =
                row.entity_data && typeof row.entity_data === 'object'
                    ? (row.entity_data as Record<string, unknown>)
                    : null;

            const content = buildEntityRagText({
                entity_name: row.entity_name,
                entity_type: row.entity_type,
                entity_data: entityData,
            });

            await mongoVectorStore.upsertEntity({
                id: row.id,
                projectId: row.project_id,
                entityType: row.entity_type,
                entityName: row.entity_name || row.entity_type,
                documentId: row.document_id,
                metadata: {
                    source: 'mongo-rag-catalog-sync',
                    programId: row.program_id,
                    portfolioId: row.portfolio_id,
                },
            });
            await mongoVectorStore.deleteChunksForSource(row.id, 'entity');

            pendingChunks.push(
                withRagLineage(
                    {
                        documentId: row.id,
                        content,
                        embedding: [],
                        projectId: row.project_id,
                        programId: row.program_id,
                        portfolioId: row.portfolio_id,
                        sourceType: 'entity',
                        entityId: row.id,
                        chunkIndex: 0,
                        metadata: {
                            sourceType: 'entity',
                            entityId: row.id,
                            projectId: row.project_id,
                            documentId: row.document_id,
                            entityType: row.entity_type,
                        },
                    },
                    {
                        portfolioId: row.portfolio_id,
                        programId: row.program_id,
                        projectId: row.project_id,
                        documentId: row.document_id,
                    }
                )
            );
            pendingEntityIds.push(row.id);
        } catch (err) {
            const message = `Entity ${row.id}: ${(err as Error).message}`;
            errors.push(message);
            logger.error('Mongo entity catalog sync failed', { entityId: row.id, error: message });
        }
    }

    for (let i = 0; i < pendingChunks.length; i += ENTITY_BATCH_SIZE) {
        const batch = pendingChunks.slice(i, i + ENTITY_BATCH_SIZE);
        try {
            await writeCatalogChunks(batch, embeddingMode);
            synced += batch.length;
        } catch (err) {
            const message = `Entity chunk batch: ${(err as Error).message}`;
            errors.push(message);
            logger.error('Mongo entity chunk batch failed', {
                entityIds: pendingEntityIds.slice(i, i + ENTITY_BATCH_SIZE),
                error: message,
            });
        }
    }

    return { synced, errors };
}

export async function syncRagCatalogToMongo(
    projectId: string | null,
    embeddingMode: 'atlas' | 'server'
): Promise<{
    portfolios: number;
    programs: number;
    projects: number;
    entities: number;
    errors: string[];
}> {
    const [portfolios, programs, projects, entities] = await Promise.all([
        syncPortfoliosToMongo(projectId, embeddingMode),
        syncProgramsToMongo(projectId, embeddingMode),
        syncProjectsToMongo(projectId, embeddingMode),
        syncEntitiesToMongo(projectId, embeddingMode),
    ]);

    return {
        portfolios: portfolios.synced,
        programs: programs.synced,
        projects: projects.synced,
        entities: entities.synced,
        errors: [
            ...portfolios.errors,
            ...programs.errors,
            ...projects.errors,
            ...entities.errors,
        ],
    };
}
