
import { randomUUID } from 'node:crypto';
import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';
import { RAGDocument, DocumentChunk } from '../types/rag';
import { buildMongoChunkDocument, type MongoChunkWriteInput } from '../lib/mongoChunkSchema';
import { toMongoEqualityId, toMongoIndexName } from '../lib/mongoQuerySafety';

const DOCUMENTS_COLLECTION = 'documents';
const CHUNKS_COLLECTION = 'chunks';

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

    async upsertDocument(
        document: Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id: string }
    ): Promise<string> {
        this.ensureConnected();

        const documentId = toMongoEqualityId(document.id, 'documentId');
        const now = new Date();
        const existing = await this.documentsCollection.findOne({ id: documentId });
        const docWithTimestamps: RAGDocument = {
            ...document,
            id: documentId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };

        await this.documentsCollection.replaceOne(
            { id: documentId },
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
        const documentId = toMongoEqualityId(id, 'documentId');
        return await this.documentsCollection.findOne({ id: documentId }) as RAGDocument | null;
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
        const safeDocumentId = toMongoEqualityId(documentId, 'documentId');
        return await this.chunksCollection
            .find({
                $or: [{ documentId: safeDocumentId }, { document_id: safeDocumentId }],
            })
            .toArray() as DocumentChunk[];
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

    async getStats(): Promise<{
        documents: number;
        chunks: number;
        embeddedChunks: number;
        embeddingPercentage: number;
        indexStatus: string;
        database: string;
        configured: boolean;
    }> {
        if (!this.isMongoConfigured()) {
            return {
                documents: 0,
                chunks: 0,
                embeddedChunks: 0,
                embeddingPercentage: 0,
                indexStatus: 'not_configured',
                database: getMongoDbName(),
                configured: false,
            };
        }

        await this.connect();

        const docCount = await this.documentsCollection.countDocuments();
        const chunkCount = await this.chunksCollection.countDocuments();

        const embeddedChunkCount = await this.chunksCollection.countDocuments({
            embedding: { $exists: true, $not: { $size: 0 } },
        });

        let indexStatus = 'unknown';
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
                indexStatus = vectorIndex.queryable === true ? 'active' : 'building';
            } else {
                indexStatus = 'missing';
            }
        } catch (err) {
            logger.warn('Failed to list search indexes', { error: (err as Error).message });
            indexStatus = 'unavailable';
        }

        return {
            documents: docCount,
            chunks: chunkCount,
            embeddedChunks: embeddedChunkCount,
            embeddingPercentage: chunkCount > 0 ? Math.round((embeddedChunkCount / chunkCount) * 100) : 0,
            indexStatus,
            database: getMongoDbName(),
            configured: true,
        };
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
