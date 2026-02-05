"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const mongodb_1 = require("mongodb");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.client = new mongodb_1.MongoClient(config_1.config.database.uri);
    }
    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db(config_1.config.database.database);
            this.isConnected = true;
            logger_1.logger.info('Connected to MongoDB', {
                database: config_1.config.database.database,
                uri: config_1.config.database.uri.includes('mongodb+srv') ? 'mongodb+srv' : 'mongodb'
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to connect to MongoDB', {
                error: error.message
            });
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.client.close();
            this.isConnected = false;
            logger_1.logger.info('Disconnected from MongoDB');
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to disconnect from MongoDB', {
                error: error.message
            });
            throw error;
        }
    }
    ensureConnected() {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
    }
    // Document operations
    get documentsCollection() {
        this.ensureConnected();
        return this.db.collection(config_1.config.database.collections.documents);
    }
    get chunksCollection() {
        this.ensureConnected();
        return this.db.collection(config_1.config.database.collections.chunks);
    }
    // Document management
    async createDocument(document) {
        this.ensureConnected();
        const now = new Date();
        const docWithTimestamps = {
            ...document,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now
        };
        const result = await this.documentsCollection.insertOne(docWithTimestamps);
        logger_1.logger.info('Document created', {
            documentId: docWithTimestamps.id,
            title: document.title,
            type: document.type
        });
        return docWithTimestamps.id;
    }
    async getDocument(id) {
        this.ensureConnected();
        return await this.documentsCollection.findOne({ id });
    }
    async getDocuments(filters) {
        this.ensureConnected();
        return await this.documentsCollection.find(filters || {}).toArray();
    }
    async updateDocument(id, updates) {
        this.ensureConnected();
        const result = await this.documentsCollection.updateOne({ id }, {
            $set: {
                ...updates,
                updatedAt: new Date()
            }
        });
        if (result.modifiedCount > 0) {
            logger_1.logger.info('Document updated', { documentId: id, updates: Object.keys(updates) });
        }
        return result.modifiedCount > 0;
    }
    async deleteDocument(id) {
        this.ensureConnected();
        // Delete document and its chunks
        const [docResult, chunkResult] = await Promise.all([
            this.documentsCollection.deleteOne({ id }),
            this.chunksCollection.deleteMany({ documentId: id })
        ]);
        if (docResult.deletedCount > 0) {
            logger_1.logger.info('Document deleted', {
                documentId: id,
                chunksDeleted: chunkResult.deletedCount
            });
        }
        return docResult.deletedCount > 0;
    }
    // Chunk operations
    async createChunks(chunks) {
        this.ensureConnected();
        const now = new Date();
        const chunksWithTimestamps = chunks.map(chunk => ({
            ...chunk,
            id: this.generateId(),
            createdAt: now
        }));
        const result = await this.chunksCollection.insertMany(chunksWithTimestamps);
        logger_1.logger.info('Chunks created', {
            count: chunks.length,
            documentId: chunks[0]?.documentId
        });
        return Object.values(result.insertedIds).map(id => id.toString());
    }
    async getChunks(documentId) {
        this.ensureConnected();
        return await this.chunksCollection.find({ documentId }).toArray();
    }
    async deleteChunks(documentId) {
        this.ensureConnected();
        const result = await this.chunksCollection.deleteMany({ documentId });
        if (result.deletedCount > 0) {
            logger_1.logger.info('Chunks deleted', {
                documentId,
                count: result.deletedCount
            });
        }
        return result.deletedCount > 0;
    }
    // Vector search operations
    async initializeCollections() {
        this.ensureConnected();
        try {
            // Create collections if they don't exist
            const collections = await this.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            if (!collectionNames.includes(config_1.config.database.collections.documents)) {
                await this.db.createCollection(config_1.config.database.collections.documents);
                logger_1.logger.info('Created documents collection', {
                    collection: config_1.config.database.collections.documents
                });
            }
            if (!collectionNames.includes(config_1.config.database.collections.chunks)) {
                await this.db.createCollection(config_1.config.database.collections.chunks);
                logger_1.logger.info('Created chunks collection', {
                    collection: config_1.config.database.collections.chunks
                });
            }
            logger_1.logger.info('Collections initialized successfully');
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to initialize collections', {
                error: error.message
            });
            throw error;
        }
    }
    async createVectorSearchIndex() {
        this.ensureConnected();
        const indexDefinition = {
            name: 'vector_search_index',
            type: 'vectorSearch',
            definition: {
                fields: [
                    {
                        type: 'vector',
                        path: 'embedding',
                        numDimensions: 1024, // voyage-4-large dimensions
                        similarity: 'cosine'
                    },
                    {
                        type: 'filter',
                        path: 'documentId'
                    },
                    {
                        type: 'filter',
                        path: 'metadata.project'
                    },
                    {
                        type: 'filter',
                        path: 'metadata.tags'
                    }
                ]
            }
        };
        try {
            await this.db.command({
                createSearchIndexes: config_1.config.database.collections.chunks,
                indexes: [{
                        name: indexDefinition.name,
                        type: 'atlasSearch',
                        definition: indexDefinition
                    }]
            });
            logger_1.logger.info('Vector search index created', {
                collection: config_1.config.database.collections.chunks,
                indexName: indexDefinition.name
            });
        }
        catch (error) {
            // Index might already exist
            if (error.codeName === 'IndexAlreadyExists') {
                logger_1.logger.info('Vector search index already exists');
            }
            else {
                throw error;
            }
        }
    }
    async vectorSearch(queryVector, limit = 10, filters) {
        this.ensureConnected();
        const searchStage = {
            index: 'vector_search_index',
            knnBeta: {
                vector: queryVector,
                path: 'embedding',
                k: limit
            }
        };
        // Only add filter if it exists and is not empty
        if (filters && Object.keys(filters).length > 0) {
            searchStage.knnBeta.filter = filters;
        }
        const pipeline = [
            {
                $search: searchStage
            },
            {
                $project: {
                    score: { $meta: 'searchScore' },
                    content: 1,
                    documentId: 1,
                    metadata: 1,
                    createdAt: 1
                }
            }
        ];
        return await this.chunksCollection.aggregate(pipeline).toArray();
    }
    // Utility methods
    generateId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    async getStats() {
        this.ensureConnected();
        const [docCount, chunkCount] = await Promise.all([
            this.documentsCollection.countDocuments(),
            this.chunksCollection.countDocuments()
        ]);
        return {
            documents: docCount,
            chunks: chunkCount,
            collections: await this.db.listCollections().toArray()
        };
    }
}
exports.DatabaseService = DatabaseService;
// Singleton instance
exports.databaseService = new DatabaseService();
//# sourceMappingURL=database.js.map