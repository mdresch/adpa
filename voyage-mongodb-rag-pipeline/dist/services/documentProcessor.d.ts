import { DocumentChunk, DocumentType, DocumentMetadata } from '../types';
export declare class DocumentProcessor {
    /**
     * Extract text content from various file types
     */
    extractText(file: Buffer, type: DocumentType): Promise<string>;
    /**
     * Extract text from PDF
     */
    private extractFromPDF;
    /**
     * Extract text from DOCX
     */
    private extractFromDOCX;
    /**
     * Extract text from HTML
     */
    private extractFromHTML;
    /**
     * Split document into chunks for embedding
     */
    chunkDocument(content: string, chunkSize?: number, overlap?: number): string[];
    /**
     * Extract metadata from document content
     */
    extractMetadata(content: string, type: DocumentType): DocumentMetadata;
    /**
     * Detect document language (simple implementation)
     */
    private detectLanguage;
    /**
     * Process document into chunks with metadata
     */
    processDocument(content: string, documentId: string, type: DocumentType, chunkSize?: number, overlap?: number): Promise<Omit<DocumentChunk, 'id' | 'createdAt' | 'embedding'>[]>;
    /**
     * Extract heading from chunk
     */
    private extractHeading;
    /**
     * Extract section name from chunk
     */
    private extractSection;
}
export declare const documentProcessor: DocumentProcessor;
//# sourceMappingURL=documentProcessor.d.ts.map