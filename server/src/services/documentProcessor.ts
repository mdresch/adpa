
import { logger } from '../utils/logger';

// We just use simple string type for metadata for now, or could import from types/rag
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md' | 'html';

export interface ChunkMetadata {
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    tokenCount: number;
    heading?: string;
    section?: string;
}

export class DocumentProcessor {

    async extractText(file: Buffer, type: DocumentType): Promise<string> {
        try {
            switch (type) {
                case 'pdf':
                    return await this.extractFromPDF(file);
                case 'docx':
                    return await this.extractFromDOCX(file);
                case 'txt':
                    return file.toString('utf-8');
                case 'md':
                    return file.toString('utf-8');
                case 'html':
                    return await this.extractFromHTML(file);
                default:
                    throw new Error(`Unsupported document type: ${type}`);
            }
        } catch (error) {
            logger.error('Failed to extract text from document', { type, error: (error as Error).message });
            throw error;
        }
    }

    private async extractFromPDF(file: Buffer): Promise<string> {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(file);
            return data.text;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${(error as Error).message}`);
        }
    }

    private async extractFromDOCX(file: Buffer): Promise<string> {
        try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer: file });
            return result.value;
        } catch (error) {
            throw new Error(`DOCX extraction failed: ${(error as Error).message}`);
        }
    }

    private async extractFromHTML(file: Buffer): Promise<string> {
        const html = file.toString('utf-8');
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    chunkDocument(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
        const chunks: string[] = [];
        const paragraphs = content.split(/\n\s*\n/);
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            if (currentChunk && (currentChunk + '\n\n' + paragraph).length > chunkSize) {
                chunks.push(currentChunk.trim());

                if (overlap > 0 && currentChunk.length > overlap) {
                    const words = currentChunk.split(' ');
                    const overlapWords = words.slice(-Math.floor(overlap / 5));
                    currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
                } else {
                    currentChunk = paragraph;
                }
            } else {
                if (currentChunk) currentChunk += '\n\n' + paragraph;
                else currentChunk = paragraph;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks.filter(chunk => chunk.length > 50);
    }

    extractMetadata(content: string, type: DocumentType): any {
        const metadata: any = {
            wordCount: content.split(/\s+/).length,
            // Simple language detection skipped for brevity, can add later
        };

        // Simple title extraction
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0 && lines[0].length < 200) {
            metadata.title = lines[0].trim();
        }

        return metadata;
    }

    async processDocument(
        content: string,
        documentId: string,
        type: DocumentType,
        chunkSize: number = 1000,
        overlap: number = 200
    ): Promise<any[]> {
        const chunks = this.chunkDocument(content, chunkSize, overlap);
        // const metadata = this.extractMetadata(content, type); // unused locally

        const processedChunks = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const startPosition = content.indexOf(chunk); // Approximate

            const chunkMetadata: ChunkMetadata = {
                chunkIndex: i,
                startPosition: startPosition > -1 ? startPosition : 0,
                endPosition: startPosition > -1 ? startPosition + chunk.length : 0,
                tokenCount: Math.round(chunk.length / 4)
            };

            processedChunks.push({
                documentId,
                content: chunk,
                metadata: chunkMetadata
            });
        }

        return processedChunks;
    }
}

export const documentProcessor = new DocumentProcessor();
