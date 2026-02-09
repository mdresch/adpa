
export interface RAGDocument {
    id: string;
    title: string;
    content: string;
    type: string;
    source: string;
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding: number[];
    metadata: {
        chunkIndex: number;
        startPosition: number;
        endPosition: number;
        tokenCount: number;
        heading?: string;
        section?: string;
        [key: string]: any;
    };
    createdAt: Date;
}

export interface SearchResult {
    chunk: DocumentChunk;
    document: RAGDocument;
    score: number;
    relevanceScore?: number;
}
