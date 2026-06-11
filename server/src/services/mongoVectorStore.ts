
import { randomUUID } from 'node:crypto';
import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';
import {
    RAGDocument,
    RAGEntity,
    RAGPortfolio,
    RAGProgram,
    RAGProject,
    DocumentChunk,
} from '../types/rag';
import { buildMongoChunkDocument, type MongoChunkWriteInput } from '../lib/mongoChunkSchema';
import type { RagSourceType } from '../lib/mongoRagText';
import {
    findOneByRagDocumentId,
    ragChunkByDocumentIdFilter,
    ragDocumentIdReplaceFilter,
    toMongoEqualityId,
    toMongoIndexName,
} from '../lib/mongoQuerySafety';

const DOCUMENTS_COLLECTION = 'documents';
const PORTFOLIOS_COLLECTION = 'portfolios';
const PROGRAMS_COLLECTION = 'programs';
const PROJECTS_COLLECTION = 'projects';
const ENTITIES_COLLECTION = 'entities';
const CHUNKS_COLLECTION = 'chunks';
const METADATA_COLLECTION = 'rag_metadata';
const STATS_CACHE_DOC_ID = 'vector_store_stats';

/** In-memory freshness for repeated dashboard polls. */
const MEMORY_STATS_TTL_MS = 30_000;
/** Persisted stats older than this are marked stale (background refresh still runs). */
const PERSISTED_STATS_STALE_MS = 10 * 60 * 1000;

export type VectorStoreStats = {
    documents: number;
    portfolios: number;
    programs: number;
    projects: number;
    entities: number;
    chunks: number;
    embeddedChunks: number;
    embeddingPercentage: number;
    indexStatus: string;
    database: string;
    configured: boolean;
    updatedAt?: string;
    stale?: boolean;
    refreshing?: boolean;
};

/** Read at runtime — module may load before server dotenv.config(). */
function getMongoUri(): string | undefined {
    return process.env.MONGODB_URI;
}

function getMongoDbName(): string {
    return process.env.MONGODB_DB_NAME || 'adpa_rag';
}

export class MongoVectorStore {
    private client: MongoClient | null = null;
    private _db!: Db;
    private isConnected: boolean = false;
    /** Single in-flight connect; prevents concurrent callers from opening duplicate clients. */
    private connectPromise: Promise<void> | null = null;
    private memoryStatsCache: { data: VectorStoreStats; fetchedAt: number } | null = null;
    private statsRefreshPromise: Promise<VectorStoreStats> | null = null;

    get db(): Db {
        this.ensureConnected();
        return this._db;
    }

    /**
     * Establishes (or reuses) the MongoDB client. Safe to call concurrently — all callers
     * await the same connection attempt.
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        if (!this.connectPromise) {
            this.connectPromise = this.performConnect().finally(() => {
                this.connectPromise = null;
            });
        }

        await this.connectPromise;

        if (!this.isConnected) {
            throw new Error('MongoDB connection failed');
        }
    }

    private async performConnect(): Promise<void> {
        const uri = getMongoUri();
        const dbName = getMongoDbName();
        if (!uri) {
            throw new Error('MONGODB_URI not defined');
        }

        try {
            const client = new MongoClient(uri);
            await client.connect();
            this.client = client;
            this._db = client.db(dbName);
            this.isConnected = true;

            logger.info('Connected to MongoDB Atlas for Vector Store', {
                database: dbName,
            });
        } catch (error) {
            this.client = null;
            this.isConnected = false;
            logger.error('Failed to connect to MongoDB Atlas', {
                error: (error as Error).message,
            });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.connectPromise = null;
        if (!this.client) {
            this.isConnected = false;
            return;
        }
        try {
            await this.client.close();
            this.client = null;
            this.isConnected = false;
            logger.info('Disconnected from MongoDB Atlas');
        } catch (error) {
            logger.error('Failed to disconnect from MongoDB Atlas', {
                error: (error as Error).message,
            });
            throw error;
        }
    }

    isMongoConfigured(): boolean {
        return Boolean(getMongoUri());
    }

    /** True when a client is connected and ready for operations. */
    isConnectionReady(): boolean {
        return this.isConnected && this.client !== null;
    }

    private ensureConnected(): void {
        if (!this.isConnectionReady()) {
            throw new Error('Database not connected. Call connect() first.');
        }
    }

    get documentsCollection(): Collection<RAGDocument> {
        this.ensureConnected();
        return this._db.collection(DOCUMENTS_COLLECTION);
    }

    get chunksCollection(): Collection<DocumentChunk> {
        this.ensureConnected();
        return this._db.collection(CHUNKS_COLLECTION);
    }

    get portfoliosCollection(): Collection<RAGPortfolio> {
        this.ensureConnected();
        return this._db.collection(PORTFOLIOS_COLLECTION);
    }

    get programsCollection(): Collection<RAGProgram> {
        this.ensureConnected();
        return this._db.collection(PROGRAMS_COLLECTION);
    }

    get projectsCollection(): Collection<RAGProject> {
        this.ensureConnected();
        return this._db.collection(PROJECTS_COLLECTION);
    }

    get entitiesCollection(): Collection<RAGEntity> {
        this.ensureConnected();
        return this._db.collection(ENTITIES_COLLECTION);
    }

    async upsertDocument(
        document: Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();

        const { filter: idFilter, id: documentId } = ragDocumentIdReplaceFilter(document.id);
        const now = new Date();
        const existing = await findOneByRagDocumentId(this.documentsCollection, document.id);
        const docWithTimestamps: RAGDocument = {
            ...document,
            id: documentId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };

        await this.documentsCollection.replaceOne(
            idFilter,
            docWithTimestamps as RAGDocument,
            { upsert: true }
        );

        logger.info('RAG Document upserted', {
            documentId,
            title: document.title,
        });

        return documentId;
    }

    /** @deprecated Prefer upsertDocument */
    async createDocument(document: Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
        const id = document.id ? toMongoEqualityId(document.id, 'documentId') : this.generateId();
        await this.upsertDocument({ ...document, id } as Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id: string });
        return id;
    }

    async getDocument(id: string): Promise<RAGDocument | null> {
        this.ensureConnected();
        return (await findOneByRagDocumentId(this.documentsCollection, id)) as RAGDocument | null;
    }

    async upsertPortfolio(
        portfolio: Omit<RAGPortfolio, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();
        const { filter: idFilter, id: portfolioId } = ragDocumentIdReplaceFilter(portfolio.id);
        const now = new Date();
        const existing = (await findOneByRagDocumentId(
            this.portfoliosCollection,
            portfolio.id
        )) as RAGPortfolio | null;
        const record: RAGPortfolio = {
            ...portfolio,
            id: portfolioId,
            metadata: portfolio.metadata ?? {},
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        await this.portfoliosCollection.replaceOne(idFilter, record as RAGPortfolio, {
            upsert: true,
        });
        return portfolioId;
    }

    async upsertProgram(
        program: Omit<RAGProgram, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();
        const { filter: idFilter, id: programId } = ragDocumentIdReplaceFilter(program.id);
        const now = new Date();
        const existing = (await findOneByRagDocumentId(
            this.programsCollection,
            program.id
        )) as RAGProgram | null;
        const record: RAGProgram = {
            ...program,
            id: programId,
            metadata: program.metadata ?? {},
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        await this.programsCollection.replaceOne(idFilter, record as RAGProgram, { upsert: true });
        return programId;
    }

    async upsertProject(
        project: Omit<RAGProject, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();
        const { filter: idFilter, id: projectId } = ragDocumentIdReplaceFilter(project.id);
        const now = new Date();
        const existing = (await findOneByRagDocumentId(
            this.projectsCollection,
            project.id
        )) as RAGProject | null;
        const record: RAGProject = {
            ...project,
            id: projectId,
            metadata: project.metadata ?? {},
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        await this.projectsCollection.replaceOne(idFilter, record as RAGProject, { upsert: true });
        return projectId;
    }

    async upsertEntity(
        entity: Omit<RAGEntity, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();
        const { filter: idFilter, id: entityId } = ragDocumentIdReplaceFilter(entity.id);
        const now = new Date();
        const existing = (await findOneByRagDocumentId(
            this.entitiesCollection,
            entity.id
        )) as RAGEntity | null;
        const record: RAGEntity = {
            ...entity,
            id: entityId,
            metadata: entity.metadata ?? {},
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        await this.entitiesCollection.replaceOne(idFilter, record as RAGEntity, { upsert: true });
        return entityId;
    }

    async deleteChunksForSource(sourceId: string, sourceType: RagSourceType): Promise<void> {
        this.ensureConnected();
        const safeId = toMongoEqualityId(sourceId, 'sourceId');
        await this.chunksCollection.deleteMany({
            $and: [
                {
                    $or: [{ documentId: { $eq: safeId } }, { document_id: { $eq: safeId } }],
                },
                { source_type: { $eq: sourceType } },
            ],
        });
    }

    async createChunks(chunks: MongoChunkWriteInput[]): Promise<string[]> {
        this.ensureConnected();

        if (chunks.length === 0) {
            return [];
        }

        const chunksWithTimestamps = chunks.map((chunk) =>
            buildMongoChunkDocument(chunk, this.generateId())
        );

        await this.chunksCollection.insertMany(chunksWithTimestamps as DocumentChunk[]);
        return chunksWithTimestamps.map((c) => c.id);
    }

    async getChunks(documentId: string): Promise<DocumentChunk[]> {
        this.ensureConnected();
        return (await this.chunksCollection
            .find(ragChunkByDocumentIdFilter(documentId))
            .toArray()) as DocumentChunk[];
    }

    async vectorSearch(
        queryVector: number[],
        limit: number = 10,
        filters?: Record<string, unknown>,
        indexName: string = process.env.MONGODB_VECTOR_INDEX || 'vector_search_index',
        numCandidates?: number
    ): Promise<Array<DocumentChunk & { score?: number }>> {
        this.ensureConnected();

        const safeIndexName = toMongoIndexName(indexName);
        const pipeline: Record<string, unknown>[] = [];

        logger.info('Preparing vector search', {
            queryVectorDimensions: queryVector.length,
            limit,
            indexName: safeIndexName,
            numCandidates: numCandidates || limit * 20,
        });

        const vectorSearchStage: Record<string, unknown> = {
            index: safeIndexName,
            path: 'embedding',
            queryVector,
            numCandidates: numCandidates || limit * 20,
            limit,
        };

        if (filters && Object.keys(filters).length > 0) {
            vectorSearchStage.filter = filters;
        }

        pipeline.push({ $vectorSearch: vectorSearchStage });
        pipeline.push({
            $project: {
                content: 1,
                documentId: 1,
                document_id: 1,
                metadata: 1,
                project_id: 1,
                program_id: 1,
                portfolio_id: 1,
                source_type: 1,
                createdAt: 1,
                score: { $meta: 'vectorSearchScore' },
            },
        });

        try {
            const results = await this.chunksCollection.aggregate(pipeline).toArray();
            logger.info('Vector search completed', { resultCount: results.length });
            return results as Array<DocumentChunk & { score?: number }>;
        } catch (error) {
            logger.error('Vector search failed', {
                error: (error as Error).message,
                indexName: safeIndexName,
            });
            throw error;
        }
    }

    /**
     * Recomputes counts from Atlas (slow on large collections) and persists to rag_metadata.
     * Safe to call in the background after connect or sync.
     */
    async refreshStatsCache(): Promise<VectorStoreStats> {
        if (!this.isMongoConfigured()) {
            return this.notConfiguredStats();
        }

        await this.connect();
        const core = await this.fetchStatsFromMongo();
        await this.writePersistedStats(core);
        const stats: VectorStoreStats = { ...core, stale: false, refreshing: false };
        this.memoryStatsCache = { data: stats, fetchedAt: Date.now() };
        logger.info('MongoDB vector store stats refreshed', {
            documents: stats.documents,
            chunks: stats.chunks,
            embeddedChunks: stats.embeddedChunks,
            indexStatus: stats.indexStatus,
        });
        return stats;
    }

    scheduleStatsRefresh(): void {
        if (!this.isMongoConfigured() || this.statsRefreshPromise) {
            return;
        }
        this.statsRefreshPromise = this.refreshStatsCache()
            .catch((error) => {
                logger.warn('Background MongoDB stats refresh failed', {
                    error: (error as Error).message,
                });
                return this.memoryStatsCache?.data ?? this.notConfiguredStats();
            })
            .finally(() => {
                this.statsRefreshPromise = null;
            });
    }

    async getStats(): Promise<VectorStoreStats> {
        if (!this.isMongoConfigured()) {
            return this.notConfiguredStats();
        }

        await this.connect();

        const now = Date.now();
        if (
            this.memoryStatsCache &&
            now - this.memoryStatsCache.fetchedAt < MEMORY_STATS_TTL_MS
        ) {
            return this.memoryStatsCache.data;
        }

        const persisted = await this.readPersistedStats();
        if (persisted) {
            const updatedAtMs = persisted.updatedAt
                ? Date.parse(persisted.updatedAt)
                : 0;
            const ageMs = updatedAtMs > 0 ? now - updatedAtMs : Number.POSITIVE_INFINITY;
            const stats: VectorStoreStats = {
                ...persisted,
                stale: ageMs > PERSISTED_STATS_STALE_MS,
                refreshing: persisted.embeddedChunks === 0,
            };
            this.memoryStatsCache = { data: stats, fetchedAt: now };
            this.scheduleStatsRefresh();
            return stats;
        }

        const quick = await this.fetchQuickStats();
        const stats: VectorStoreStats = { ...quick, stale: true, refreshing: true };
        this.memoryStatsCache = { data: stats, fetchedAt: now };
        this.scheduleStatsRefresh();
        return stats;
    }

    private notConfiguredStats(): VectorStoreStats {
        return {
            documents: 0,
            portfolios: 0,
            programs: 0,
            projects: 0,
            entities: 0,
            chunks: 0,
            embeddedChunks: 0,
            embeddingPercentage: 0,
            indexStatus: 'not_configured',
            database: getMongoDbName(),
            configured: false,
        };
    }

    private async fetchQuickStats(): Promise<VectorStoreStats> {
        const [docCount, portfolioCount, programCount, chunkCount, projectCount, entityCount, indexStatus] =
            await Promise.all([
            this.documentsCollection.estimatedDocumentCount(),
            this.portfoliosCollection.estimatedDocumentCount(),
            this.programsCollection.estimatedDocumentCount(),
            this.chunksCollection.estimatedDocumentCount(),
            this.projectsCollection.estimatedDocumentCount(),
            this.entitiesCollection.estimatedDocumentCount(),
            this.resolveIndexStatus(),
        ]);

        return {
            documents: docCount,
            portfolios: portfolioCount,
            programs: programCount,
            projects: projectCount,
            entities: entityCount,
            chunks: chunkCount,
            embeddedChunks: 0,
            embeddingPercentage: 0,
            indexStatus,
            database: getMongoDbName(),
            configured: true,
        };
    }

    private async fetchStatsFromMongo(): Promise<VectorStoreStats> {
        const embeddedFilter = {
            embedding: { $exists: true, $not: { $size: 0 } },
        };

        const [
            docCount,
            portfolioCount,
            programCount,
            projectCount,
            entityCount,
            chunkCount,
            embeddedChunkCount,
            indexStatus,
        ] = await Promise.all([
                this.documentsCollection.estimatedDocumentCount(),
                this.portfoliosCollection.estimatedDocumentCount(),
                this.programsCollection.estimatedDocumentCount(),
                this.projectsCollection.estimatedDocumentCount(),
                this.entitiesCollection.estimatedDocumentCount(),
                this.chunksCollection.estimatedDocumentCount(),
                this.chunksCollection.countDocuments(embeddedFilter),
                this.resolveIndexStatus(),
            ]);

        return {
            documents: docCount,
            portfolios: portfolioCount,
            programs: programCount,
            projects: projectCount,
            entities: entityCount,
            chunks: chunkCount,
            embeddedChunks: embeddedChunkCount,
            embeddingPercentage:
                chunkCount > 0 ? Math.round((embeddedChunkCount / chunkCount) * 100) : 0,
            indexStatus,
            database: getMongoDbName(),
            configured: true,
            updatedAt: new Date().toISOString(),
        };
    }

    private async resolveIndexStatus(): Promise<string> {
        try {
            const listSearchIndexes = (this.chunksCollection as unknown as {
                listSearchIndexes: () => { toArray: () => Promise<Array<Record<string, unknown>>> };
            }).listSearchIndexes;
            const indexes = await listSearchIndexes.call(this.chunksCollection).toArray();
            const indexName = toMongoIndexName(
                process.env.MONGODB_VECTOR_INDEX || 'vector_search_index'
            );
            const vectorIndex = indexes.find(
                (idx) => typeof idx.name === 'string' && idx.name === indexName
            );
            if (vectorIndex) {
                return vectorIndex.queryable === true ? 'active' : 'building';
            }
            return 'missing';
        } catch (err) {
            logger.warn('Failed to list search indexes', { error: (err as Error).message });
            return 'unavailable';
        }
    }

    private async readPersistedStats(): Promise<VectorStoreStats | null> {
        const doc = await this._db.collection(METADATA_COLLECTION).findOne({
            _id: STATS_CACHE_DOC_ID,
        });
        if (!doc || typeof doc !== 'object') {
            return null;
        }
        const row = doc as Record<string, unknown>;
        if (
            typeof row.documents !== 'number' ||
            typeof row.chunks !== 'number' ||
            typeof row.embeddedChunks !== 'number'
        ) {
            return null;
        }
        const chunks = row.chunks as number;
        const embeddedChunks = row.embeddedChunks as number;
        return {
            documents: row.documents as number,
            portfolios: typeof row.portfolios === 'number' ? (row.portfolios as number) : 0,
            programs: typeof row.programs === 'number' ? (row.programs as number) : 0,
            projects: typeof row.projects === 'number' ? (row.projects as number) : 0,
            entities: typeof row.entities === 'number' ? (row.entities as number) : 0,
            chunks,
            embeddedChunks,
            embeddingPercentage:
                typeof row.embeddingPercentage === 'number'
                    ? (row.embeddingPercentage as number)
                    : chunks > 0
                      ? Math.round((embeddedChunks / chunks) * 100)
                      : 0,
            indexStatus: typeof row.indexStatus === 'string' ? row.indexStatus : 'unknown',
            database: typeof row.database === 'string' ? row.database : getMongoDbName(),
            configured: true,
            updatedAt:
                typeof row.updatedAt === 'string'
                    ? row.updatedAt
                    : row.updatedAt instanceof Date
                      ? row.updatedAt.toISOString()
                      : undefined,
        };
    }

    private async writePersistedStats(stats: VectorStoreStats): Promise<void> {
        await this._db.collection(METADATA_COLLECTION).updateOne(
            { _id: STATS_CACHE_DOC_ID },
            {
                $set: {
                    documents: stats.documents,
                    portfolios: stats.portfolios,
                    programs: stats.programs,
                    projects: stats.projects,
                    entities: stats.entities,
                    chunks: stats.chunks,
                    embeddedChunks: stats.embeddedChunks,
                    embeddingPercentage: stats.embeddingPercentage,
                    indexStatus: stats.indexStatus,
                    database: stats.database,
                    updatedAt: stats.updatedAt ?? new Date().toISOString(),
                },
            },
            { upsert: true }
        );
    }

    async ping(): Promise<boolean> {
        try {
            if (!this.isMongoConfigured()) {
                return false;
            }
            await this.connect();
            if (!this.client) {
                return false;
            }
            await this.client.db(getMongoDbName()).command({ ping: 1 });
            return true;
        } catch (error) {
            logger.error('MongoDB ping failed', { error: (error as Error).message });
            return false;
        }
    }

    private generateId(): string {
        return randomUUID();
    }
}

export const mongoVectorStore = new MongoVectorStore();
