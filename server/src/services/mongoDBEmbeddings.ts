
import { logger } from '../utils/logger';
import { voyageAIService } from './voyageAIService';

// Orchestrator for generating embeddings for MongoDB
// In this implementation, we use VoyageAI directly to generate embeddings BEFORE insertion/query
// This gives us more control than relying on Atlas Triggers, and simplifies the architecture
export class MongoDBEmbeddingService {

    async generateEmbeddings(texts: string[], inputType: 'query' | 'document'): Promise<number[][]> {
        try {
            const result = await voyageAIService.generateEmbeddings(texts, inputType);
            return result.embeddings;
        } catch (error) {
            logger.error('Failed to generate embeddings for MongoDB', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            // Test by generating a simple query embedding
            const embeddings = await this.generateEmbeddings(["test"], 'query');
            return embeddings.length > 0 && embeddings[0].length > 0;
        } catch (error) {
            logger.error('MongoDB Embedding Service test failed', { error });
            return false;
        }
    }
}

export const mongoDBEmbeddingService = new MongoDBEmbeddingService();
