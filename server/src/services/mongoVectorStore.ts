
import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';
import { RAGDocument, DocumentChunk } from '../types/rag';
import { buildMongoChunkDocument, type MongoChunkWriteInput } from '../lib/mongoChunkSchema';

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

    get db(): Db {
        this.ensureConnected();
        return this._db;
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;
        const uri = getMongoUri();
        const dbName = getMongoDbName();
        if (!uri) {
            throw new Error('MONGODB_URI not defined');
        }

        try {
            this.client = new MongoClient(uri);
            await this.client.connect();
            this._db = this.client.db(dbName);
            this.isConnected = true;

            logger.info('Connected to MongoDB Atlas for Vector Store', {
                database: dbName
            });
        } catch (error) {
            logger.error('Failed to connect to MongoDB Atlas', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.close();
            this.client = null;
            this.isConnected = false;
            logger.info('Disconnected from MongoDB Atlas');
        } catch (error) {
            logger.error('Failed to disconnect from MongoDB Atlas', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    isMongoConfigured(): boolean {
        return Boolean(getMongoUri());
    }

    private ensureConnected(): void {
        if (!this.isConnected) {
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

        const now = new Date();
        const existing = await this.documentsCollection.findOne({ id: document.id });
        const docWithTimestamps: RAGDocument = {
            ...document,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };

        await this.documentsCollection.replaceOne(
            { id: document.id },
            docWithTimestamps as RAGDocument,
            { upsert: true }
        );

        logger.info('RAG Document upserted', {
            documentId: document.id,
            title: document.title,
        });

        return document.id;
    }

    /** @deprecated Prefer upsertDocument */
    async createDocument(document: Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
        const id = document.id || this.generateId();
        await this.upsertDocument({ ...document, id } as Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id: string });
        return id;
    }

    async getDocument(id: string): Promise<RAGDocument | null> {
        this.ensureConnected();
        return await this.documentsCollection.findOne({ id }) as RAGDocument | null;
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
        return await this.chunksCollection
            .find({
                $or: [{ documentId }, { document_id: documentId }],
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

        const pipeline: Record<string, unknown>[] = [];

        logger.info('Preparing vector search', {
            queryVectorDimensions: queryVector.length,
            limit,
            indexName,
            numCandidates: numCandidates || limit * 20,
        });

        const vectorSearchStage: Record<string, unknown> = {
            index: indexName,
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
                indexName,
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

        this.ensureConnected();

        const docCount = await this.documentsCollection.countDocuments();
        const chunkCount = await this.chunksCollection.countDocuments();

        const embeddedChunkCount = await this.chunksCollection.countDocuments({
            embedding: { $exists: true, $not: { $size: 0 } },
        });

        let indexStatus = 'unknown';
        try {
            const indexes = await (this.chunksCollection as Collection & {
                listSearchIndexes: () => { toArray: () => Promise<Array<{ name: string; queryable?: boolean }>> };
            }).listSearchIndexes().toArray();
            const indexName = process.env.MONGODB_VECTOR_INDEX || 'vector_search_index';
            const vectorIndex = indexes.find((idx) => idx.name === indexName);
            if (vectorIndex) {
                indexStatus = vectorIndex.queryable ? 'active' : 'building';
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
            if (!this.isConnected || !this.client) {
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
        return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
    }
}

export const mongoVectorStore = new MongoVectorStore();
