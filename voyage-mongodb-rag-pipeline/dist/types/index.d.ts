export interface Document {
    id: string;
    title: string;
    content: string;
    type: DocumentType;
    source: string;
    metadata: DocumentMetadata;
    createdAt: Date;
    updatedAt: Date;
}
export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding: number[];
    metadata: ChunkMetadata;
    createdAt: Date;
}
export interface DocumentMetadata {
    title?: string;
    author?: string;
    project?: string;
    tags?: string[];
    language?: string;
    pageCount?: number;
    wordCount?: number;
}
export interface ChunkMetadata {
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    tokenCount: number;
    heading?: string;
    section?: string;
}
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md' | 'html';
export interface EmbeddingResult {
    embeddings: number[][];
    usage?: {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
    };
}
export interface SearchResult {
    chunk: DocumentChunk;
    document: Document;
    score: number;
    relevanceScore?: number;
}
export interface RerankResult {
    document: string;
    relevanceScore: number;
    index: number;
}
export interface RAGRequest {
    query: string;
    maxResults?: number;
    filters?: SearchFilters;
    includeReranking?: boolean;
    llmProvider?: 'openai' | 'anthropic';
}
export interface RAGResponse {
    query: string;
    answer: string;
    sources: SearchResult[];
    metadata: {
        totalResults: number;
        processingTime: number;
        embeddingTime: number;
        searchTime: number;
        rerankingTime?: number;
        llmTime?: number;
    };
}
export interface SearchFilters {
    documentType?: DocumentType[];
    author?: string;
    project?: string;
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
}
export interface ProcessingStats {
    documentsProcessed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    errors: number;
    processingTime: number;
}
export interface VectorSearchIndex {
    name: string;
    type: 'vector';
    fields: {
        embedding: {
            type: 'vector';
            dimensions: number;
            similarity: 'cosine' | 'euclidean' | 'dotProduct';
        };
        [key: string]: any;
    };
}
export interface DatabaseConfig {
    uri: string;
    database: string;
    collections: {
        documents: string;
        chunks: string;
        embeddings: string;
    };
}
export interface VoyageAIConfig {
    apiKey: string;
    embeddingModel: string;
    rerankModel: string;
    maxRetries: number;
    timeout: number;
}
export interface LLMConfig {
    provider: 'openai' | 'anthropic' | 'mistral' | 'google';
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
}
export interface AppConfig {
    voyageAI: VoyageAIConfig;
    database: DatabaseConfig;
    llm: LLMConfig;
    server: {
        port: number;
        environment: string;
    };
    processing: {
        batchSize: number;
        chunkSize: number;
        chunkOverlap: number;
        maxConcurrentRequests: number;
    };
}
//# sourceMappingURL=index.d.ts.map