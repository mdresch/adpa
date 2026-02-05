import { RAGRequest, RAGResponse, SearchResult } from '../types';
export declare class RAGService {
    private openai?;
    private anthropic?;
    private mistral?;
    private googleAI?;
    constructor();
    /**
     * Perform a complete RAG query
     */
    processRAGQuery(request: RAGRequest): Promise<RAGResponse>;
    /**
     * Perform simple vector search without LLM response
     */
    searchDocuments(query: string, maxResults?: number, filters?: any, includeReranking?: boolean): Promise<SearchResult[]>;
    /**
     * Generate LLM response based on query and context
     */
    private generateLLMResponse;
    /**
     * Format search results with document information
     */
    private formatSearchResults;
    /**
     * Get similar documents based on a document ID
     */
    getSimilarDocuments(documentId: string, limit?: number): Promise<SearchResult[]>;
    /**
     * Test the RAG pipeline
     */
    testRAGPipeline(): Promise<boolean>;
}
export declare const ragService: RAGService;
//# sourceMappingURL=rag.d.ts.map