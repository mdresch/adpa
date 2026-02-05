export declare class MongoDBEmbeddingService {
    /**
     * Generate embeddings using MongoDB Atlas Vector Search
     * This uses MongoDB's built-in integration with VoyageAI models
     */
    generateEmbeddings(texts: string[], inputType: 'query' | 'document'): Promise<number[][]>;
    private generateSingleEmbedding;
    testConnection(): Promise<boolean>;
}
export declare const mongoDBEmbeddingService: MongoDBEmbeddingService;
//# sourceMappingURL=mongoDBEmbeddings.d.ts.map