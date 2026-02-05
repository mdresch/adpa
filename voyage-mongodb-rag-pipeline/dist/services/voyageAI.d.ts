import { EmbeddingResult, RerankResult } from '../types';
export declare class VoyageAIService {
    private client;
    constructor();
    /**
     * Generate embeddings for a batch of texts
     */
    generateEmbeddings(texts: string[], inputType?: 'document' | 'query'): Promise<EmbeddingResult>;
    /**
     * Generate embeddings for a single text
     */
    generateEmbedding(text: string, inputType?: 'document' | 'query'): Promise<number[]>;
    /**
     * Rerank documents based on query relevance
     */
    rerankDocuments(query: string, documents: string[], topK?: number): Promise<RerankResult[]>;
    /**
     * Batch process embeddings with retry logic
     */
    batchGenerateEmbeddings(texts: string[], batchSize?: number, inputType?: 'document' | 'query'): Promise<number[]>;
    /**
     * Test connection to VoyageAI API
     */
    testConnection(): Promise<boolean>;
    /**
     * Get model information
     */
    getModelInfo(): {
        embeddingModel: string;
        rerankModel: string;
        embeddingDimensions: number;
        maxRetries: number;
        timeout: number;
    };
}
export declare const voyageAIService: VoyageAIService;
//# sourceMappingURL=voyageAI.d.ts.map