
import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';
import { RAGDocument, DocumentChunk } from '../types/rag';

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
            this.isConnected = false;
            logger.info('Disconnected from MongoDB Atlas');
        } catch (error) {
            logger.error('Failed to disconnect from MongoDB Atlas', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    private ensureConnected(): void {
        if (!this.isConnected) {
            // Auto-connect attempt could go here, but for now throw
            throw new Error('Database not connected. Call connect() first.');
        }
    }

    // Collections
    get documentsCollection(): Collection<RAGDocument> {
        this.ensureConnected();
        return this._db.collection(DOCUMENTS_COLLECTION);
    }

    get chunksCollection(): Collection<DocumentChunk> {
        this.ensureConnected();
        return this._db.collection(CHUNKS_COLLECTION);
    }

    // Document Operations
    async createDocument(document: Omit<RAGDocument, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
        this.ensureConnected();

        const now = new Date();
        const docWithTimestamps: RAGDocument = {
            ...document,
            id: document.id || this.generateId(),
            createdAt: now,
            updatedAt: now
        };

        await this.documentsCollection.insertOne(docWithTimestamps as any);

        logger.info('RAG Document created', {
            documentId: docWithTimestamps.id,
            title: document.title
        });

        return docWithTimestamps.id;
    }

    async getDocument(id: string): Promise<RAGDocument | null> {
        this.ensureConnected();
        return await this.documentsCollection.findOne({ id }) as RAGDocument | null;
    }

    // Chunk Operations
    async createChunks(chunks: Omit<DocumentChunk, 'id' | 'createdAt'>[]): Promise<string[]> {
        this.ensureConnected();

        const now = new Date();
        const chunksWithTimestamps = chunks.map(chunk => ({
            ...chunk,
            id: this.generateId(),
            createdAt: now
        }));

        if (chunksWithTimestamps.length > 0) {
            const result = await this.chunksCollection.insertMany(chunksWithTimestamps as any);
            return Object.values(result.insertedIds).map(id => id.toString());
        }
        return [];
    }

    async getChunks(documentId: string): Promise<DocumentChunk[]> {
        this.ensureConnected();
        return await this.chunksCollection.find({ documentId }).toArray() as DocumentChunk[];
    }

    // Vector Search
    async vectorSearch(
        queryVector: number[],
        limit: number = 10,
        filters?: any,
        indexName: string = 'vector_search_index',
        numCandidates?: number
    ): Promise<DocumentChunk[]> {
        this.ensureConnected();

        const pipeline: any[] = [];

        logger.info('Preparing vector search', {
            queryVectorDimensions: queryVector.length,
            limit,
            indexName,
            numCandidates: numCandidates || limit * 20
        });

        // Build $vectorSearch stage
        const vectorSearchStage: any = {
            index: indexName,
            path: 'embedding',
            queryVector: queryVector,
            numCandidates: numCandidates || limit * 20, // Recommended to be 10-20x the limit
            limit: limit
        };

        if (filters && Object.keys(filters).length > 0) {
            vectorSearchStage.filter = filters;
        }

        pipeline.push({ $vectorSearch: vectorSearchStage });

        // Project fields
        // Note: In MongoDB, you can't mix inclusion and exclusion (except for _id).
        // Since we are including specific fields, 'embedding' will be excluded by default.
        pipeline.push({
            $project: {
                content: 1,
                documentId: 1,
                metadata: 1,
                createdAt: 1,
                score: { $meta: 'vectorSearchScore' } // Standard score field for $vectorSearch
            }
        });

        logger.info('Executing vector search', {
            limit,
            filterCount: filters ? Object.keys(filters).length : 0
        });

        try {
            const results = await this.chunksCollection.aggregate(pipeline).toArray();
            logger.info('Vector search completed', { resultCount: results.length });
            return results as DocumentChunk[];
        } catch (error) {
            logger.error('Vector search failed', {
                error: (error as Error).message,
                pipeline: JSON.stringify(pipeline)
            });
            return [];
        }
    }

    async getStats(): Promise<any> {
        this.ensureConnected();

        const docCount = await this.documentsCollection.countDocuments();
        const chunkCount = await this.chunksCollection.countDocuments();

        // Count chunks with embeddings (non-empty array)
        const embeddedChunkCount = await this.chunksCollection.countDocuments({
            embedding: { $exists: true, $not: { $size: 0 } }
        });

        // Try to check index health (simple check if it exists in listSearchIndexes)
        let indexStatus = 'unknown';
        try {
            // listSearchIndexes is available in Atlas
            const indexes = await (this.chunksCollection as any).listSearchIndexes().toArray();
            const vectorIndex = indexes.find((idx: any) => idx.name === 'vector_search_index');
            if (vectorIndex) {
                indexStatus = vectorIndex.queryable ? 'active' : 'building';
            } else {
                indexStatus = 'missing';
            }
        } catch (err) {
            logger.warn('Failed to list search indexes (might not be Atlas or insufficient permissions)', { error: (err as Error).message });
            indexStatus = 'unavailable';
        }

        return {
            documents: docCount,
            chunks: chunkCount,
            embeddedChunks: embeddedChunkCount,
            embeddingPercentage: chunkCount > 0 ? Math.round((embeddedChunkCount / chunkCount) * 100) : 0,
            indexStatus,
            database: getMongoDbName()
        };
    }

    async ping(): Promise<boolean> {
        try {
            this.ensureConnected();
            if (!this.client) return false;
            await this.client.db(getMongoDbName()).command({ ping: 1 });
            return true;
        } catch (error) {
            logger.error('MongoDB ping failed', { error: (error as Error).message });
            return false;
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

export const mongoVectorStore = new MongoVectorStore();
