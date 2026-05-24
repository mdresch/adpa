import { logger } from '../utils/logger';
import { mongoDBEmbeddingService } from './mongoDBEmbeddings';
import { mongoVectorStore } from './mongoVectorStore';
import { mongoProjectFilter } from '../lib/mongoChunkSchema';
import type { SearchResult } from './searchService';

export function isMongoRagEnabled(): boolean {
    return (
        process.env.MONGODB_RAG_ENABLED === 'true' &&
        Boolean(process.env.MONGODB_URI) &&
        Boolean(process.env.VOYAGE_API_KEY)
    );
}

export interface MongoSearchMatch {
    content: string;
    documentId?: string;
    score?: number;
    metadata?: Record<string, unknown>;
}

export async function searchMongoChunks(
    query: string,
    topK: number = 5,
    projectId?: string
): Promise<MongoSearchMatch[]> {
    if (!mongoVectorStore.isMongoConfigured()) {
        throw new Error('MongoDB is not configured (set MONGODB_URI on the API server)');
    }

    if (!process.env.VOYAGE_API_KEY) {
        throw new Error('Semantic search requires VOYAGE_API_KEY on the API server');
    }

    await mongoVectorStore.connect();

    const [queryVector] = await mongoDBEmbeddingService.generateEmbeddings([query], 'query');
    if (!queryVector?.length) {
        throw new Error('Failed to generate query embedding for MongoDB search');
    }

    const filters = projectId ? mongoProjectFilter(projectId) : undefined;

    const results = await mongoVectorStore.vectorSearch(
        queryVector,
        topK,
        filters
    );

    if (results.length === 0) {
        const stats = await mongoVectorStore.getStats();
        if (stats.chunks === 0) {
            throw new Error(
                'No vectors in MongoDB yet. Enable the integration on Overview, run Sync, then refresh stats.'
            );
        }
        if (stats.embeddedChunks === 0) {
            const mode = (process.env.MONGODB_EMBEDDING_MODE || 'atlas').toLowerCase();
            throw new Error(
                mode === 'server'
                    ? 'Chunks exist but none have embeddings. Re-run sync with MONGODB_EMBEDDING_MODE=server.'
                    : 'Chunks exist but none are embedded yet. Wait for Atlas triggers or switch to MONGODB_EMBEDDING_MODE=server.'
            );
        }
    }

    return results.map((row) => ({
        content: row.content,
        documentId: row.documentId ?? (row as { document_id?: string }).document_id,
        score: (row as { score?: number }).score,
        metadata: row.metadata as Record<string, unknown>,
    }));
}

/** Map Mongo vector hits into universal search results for assisted search. */
export async function searchDocumentsViaMongo(
    query: string,
    userId: string,
    limit: number = 10
): Promise<SearchResult[]> {
    const { pool } = await import('../database/connection');

    const projects = await pool.query(
        `SELECT id, name FROM projects
         WHERE owner_id = $1 OR $1::text = ANY(
           SELECT jsonb_array_elements_text(COALESCE(team_members, '[]'::jsonb))
         )
         LIMIT 20`,
        [userId]
    );

    const allMatches: SearchResult[] = [];
    const perProjectLimit = Math.max(1, Math.ceil(limit / Math.max(projects.rows.length, 1)));

    for (const project of projects.rows) {
        try {
            const hits = await searchMongoChunks(query, perProjectLimit, project.id);
            for (const hit of hits) {
                const documentId = hit.documentId;
                if (!documentId) continue;

                const docMeta = await pool.query(
                    `SELECT id, COALESCE(NULLIF(TRIM(title), ''), name) AS title, updated_at, created_at, project_id
                     FROM documents WHERE id = $1`,
                    [documentId]
                );
                if (docMeta.rows.length === 0) continue;
                const doc = docMeta.rows[0];

                allMatches.push({
                    id: doc.id,
                    type: 'document',
                    title: doc.title || 'Document',
                    description: hit.content.substring(0, 240),
                    content_preview: hit.content.substring(0, 500),
                    author: '',
                    author_id: '',
                    created_at: doc.created_at,
                    updated_at: doc.updated_at,
                    tags: [],
                    relevance_score: hit.score ?? 0.5,
                    project_id: doc.project_id,
                    project_name: project.name,
                });
            }
        } catch (err) {
            logger.warn('[mongoRagService] Project search failed', {
                projectId: project.id,
                error: (err as Error).message,
            });
        }
    }

    const byId = new Map<string, SearchResult>();
    for (const item of allMatches) {
        const existing = byId.get(item.id);
        if (!existing || item.relevance_score > existing.relevance_score) {
            byId.set(item.id, item);
        }
    }

    return [...byId.values()]
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, limit);
}

export async function queryMongoForRag(
    queryText: string,
    topK: number = 5,
    filter: Record<string, unknown> = {}
): Promise<Array<Record<string, unknown>>> {
    const projectId = typeof filter.project_id === 'string' ? filter.project_id : undefined;
    const hits = await searchMongoChunks(queryText, topK, projectId);

    return hits.map((hit) => ({
        document_id: hit.documentId,
        content: hit.content,
        similarity: hit.score ?? 0,
        metadata: hit.metadata ?? {},
        source: 'mongodb_atlas',
    }));
}
