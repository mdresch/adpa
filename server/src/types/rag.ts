
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

export interface RAGPortfolio {
    id: string;
    name: string;
    description?: string;
    status?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface RAGProgram {
    id: string;
    name: string;
    description?: string;
    status?: string;
    portfolioId?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface RAGProject {
    id: string;
    name: string;
    description?: string;
    framework?: string;
    status?: string;
    programId?: string | null;
    portfolioId?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface RAGEntity {
    id: string;
    projectId: string;
    entityType: string;
    entityName: string;
    documentId?: string | null;
    metadata: Record<string, unknown>;
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
