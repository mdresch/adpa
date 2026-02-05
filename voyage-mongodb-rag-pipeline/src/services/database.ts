import { MongoClient, Db, Collection } from 'mongodb';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Document, DocumentChunk, VectorSearchIndex } from '../types';

export class DatabaseService {
  private client: MongoClient;
  private db!: Db;
  private isConnected: boolean = false;

  constructor() {
    this.client = new MongoClient(config.database.uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(config.database.database);
      this.isConnected = true;
      
      logger.info('Connected to MongoDB', {
        database: config.database.database,
        uri: config.database.uri.includes('mongodb+srv') ? 'mongodb+srv' : 'mongodb'
      });
    } catch (error) {
      logger.log('error', 'Failed to connect to MongoDB', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.log('error', 'Failed to disconnect from MongoDB', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  // Document operations
  get documentsCollection(): Collection<Document> {
    this.ensureConnected();
    return this.db.collection(config.database.collections.documents);
  }

  get chunksCollection(): Collection<DocumentChunk> {
    this.ensureConnected();
    return this.db.collection(config.database.collections.chunks);
  }

  // Document management
  async createDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.ensureConnected();
    
    const now = new Date();
    const docWithTimestamps: Document = {
      ...document,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    const result = await this.documentsCollection.insertOne(docWithTimestamps as any);
    
    logger.info('Document created', {
      documentId: docWithTimestamps.id,
      title: document.title,
      type: document.type
    });

    return docWithTimestamps.id;
  }

  async getDocument(id: string): Promise<Document | null> {
    this.ensureConnected();
    return await this.documentsCollection.findOne({ id }) as Document | null;
  }

  async getDocuments(filters?: any): Promise<Document[]> {
    this.ensureConnected();
    return await this.documentsCollection.find(filters || {}).toArray() as Document[];
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<boolean> {
    this.ensureConnected();
    
    const result = await this.documentsCollection.updateOne(
      { id },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Document updated', { documentId: id, updates: Object.keys(updates) });
    }

    return result.modifiedCount > 0;
  }

  async deleteDocument(id: string): Promise<boolean> {
    this.ensureConnected();
    
    // Delete document and its chunks
    const [docResult, chunkResult] = await Promise.all([
      this.documentsCollection.deleteOne({ id }),
      this.chunksCollection.deleteMany({ documentId: id })
    ]);

    if (docResult.deletedCount > 0) {
      logger.info('Document deleted', {
        documentId: id,
        chunksDeleted: chunkResult.deletedCount
      });
    }

    return docResult.deletedCount > 0;
  }

  // Chunk operations
  async createChunks(chunks: Omit<DocumentChunk, 'id' | 'createdAt'>[]): Promise<string[]> {
    this.ensureConnected();
    
    const now = new Date();
    const chunksWithTimestamps = chunks.map(chunk => ({
      ...chunk,
      id: this.generateId(),
      createdAt: now
    }));

    const result = await this.chunksCollection.insertMany(chunksWithTimestamps as any);
    
    logger.info('Chunks created', {
      count: chunks.length,
      documentId: chunks[0]?.documentId
    });

    return Object.values(result.insertedIds).map(id => id.toString());
  }

  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    this.ensureConnected();
    return await this.chunksCollection.find({ documentId }).toArray() as DocumentChunk[];
  }

  async deleteChunks(documentId: string): Promise<boolean> {
    this.ensureConnected();
    
    const result = await this.chunksCollection.deleteMany({ documentId });
    
    if (result.deletedCount > 0) {
      logger.info('Chunks deleted', {
        documentId,
        count: result.deletedCount
      });
    }

    return result.deletedCount > 0;
  }

  // Vector search operations
  async initializeCollections(): Promise<void> {
    this.ensureConnected();
    
    try {
      // Create collections if they don't exist
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      if (!collectionNames.includes(config.database.collections.documents)) {
        await this.db.createCollection(config.database.collections.documents);
        logger.info('Created documents collection', { 
          collection: config.database.collections.documents 
        });
      }
      
      if (!collectionNames.includes(config.database.collections.chunks)) {
        await this.db.createCollection(config.database.collections.chunks);
        logger.info('Created chunks collection', { 
          collection: config.database.collections.chunks 
        });
      }
      
      logger.info('Collections initialized successfully');
    } catch (error) {
      logger.log('error', 'Failed to initialize collections', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createVectorSearchIndex(): Promise<void> {
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
        createSearchIndexes: config.database.collections.chunks,
        indexes: [{
          name: indexDefinition.name,
          type: 'atlasSearch',
          definition: indexDefinition
        }]
      });

      logger.info('Vector search index created', {
        collection: config.database.collections.chunks,
        indexName: indexDefinition.name
      });
    } catch (error: any) {
      // Index might already exist
      if (error.codeName === 'IndexAlreadyExists') {
        logger.info('Vector search index already exists');
      } else {
        throw error;
      }
    }
  }

  async vectorSearch(queryVector: number[], limit: number = 10, filters?: any): Promise<any[]> {
    this.ensureConnected();
    
    const searchStage: any = {
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
    
    const pipeline: any[] = [
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
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async getStats(): Promise<any> {
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

// Singleton instance
export const databaseService = new DatabaseService();
