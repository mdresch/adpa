import { Collection } from 'mongodb';
import { Document, DocumentChunk } from '../types';
export declare class DatabaseService {
    private client;
    private db;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private ensureConnected;
    get documentsCollection(): Collection<Document>;
    get chunksCollection(): Collection<DocumentChunk>;
    createDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
    getDocument(id: string): Promise<Document | null>;
    getDocuments(filters?: any): Promise<Document[]>;
    updateDocument(id: string, updates: Partial<Document>): Promise<boolean>;
    deleteDocument(id: string): Promise<boolean>;
    createChunks(chunks: Omit<DocumentChunk, 'id' | 'createdAt'>[]): Promise<string[]>;
    getChunks(documentId: string): Promise<DocumentChunk[]>;
    deleteChunks(documentId: string): Promise<boolean>;
    initializeCollections(): Promise<void>;
    createVectorSearchIndex(): Promise<void>;
    vectorSearch(queryVector: number[], limit?: number, filters?: any): Promise<any[]>;
    private generateId;
    getStats(): Promise<any>;
}
export declare const databaseService: DatabaseService;
//# sourceMappingURL=database.d.ts.map