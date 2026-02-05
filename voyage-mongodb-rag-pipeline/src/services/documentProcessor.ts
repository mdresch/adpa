import { Document, DocumentChunk, DocumentType, DocumentMetadata, ChunkMetadata } from '../types';
import { logger, logDocumentProcessing } from '../utils/logger';

export class DocumentProcessor {
  /**
   * Extract text content from various file types
   */
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
      logger.log('error', 'Failed to extract text from document', {
        type,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(file: Buffer): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file);
      return data.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text from DOCX
   */
  private async extractFromDOCX(file: Buffer): Promise<string> {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text from HTML
   */
  private async extractFromHTML(file: Buffer): Promise<string> {
    try {
      const html = file.toString('utf-8');
      // Simple HTML tag removal - for production, consider using a proper HTML parser
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (error) {
      throw new Error(`HTML extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Split document into chunks for embedding
   */
  chunkDocument(
    content: string, 
    chunkSize: number = 1000, 
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph exceeds chunk size, save current chunk and start new one
      if (currentChunk && (currentChunk + '\n\n' + paragraph).length > chunkSize) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap from previous chunk
        if (overlap > 0 && currentChunk.length > overlap) {
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlap / 5));
          currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      } else {
        if (currentChunk) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
  }

  /**
   * Extract metadata from document content
   */
  extractMetadata(content: string, type: DocumentType): DocumentMetadata {
    const metadata: DocumentMetadata = {
      wordCount: content.split(/\s+/).length,
      language: this.detectLanguage(content)
    };

    // Extract title from first line or content
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 200 && !firstLine.includes('.')) {
        // Likely a title
        metadata.title = firstLine;
      }
    }

    // Extract potential author from content patterns
    const authorPatterns = [
      /(?:author|by|written by)\s*:?\s*([^\n]+)/i,
      /(?:created by|prepared by)\s*:?\s*([^\n]+)/i
    ];

    for (const pattern of authorPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        metadata.author = match[1].trim();
        break;
      }
    }

    // Extract potential project names
    const projectPatterns = [
      /(?:project|initiative)\s*:?\s*([^\n]+)/i,
      /(?:for|client)\s*:?\s*([^\n]+)/i
    ];

    for (const pattern of projectPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        metadata.project = match[1].trim();
        break;
      }
    }

    // Extract tags from hashtags or keywords
    const tagPatterns = [
      /#(\w+)/g,
      /(?:tags?|keywords?)\s*:?\s*([^\n]+)/i
    ];

    const tags: string[] = [];
    
    // Extract hashtags
    const hashtagMatches = content.match(/#(\w+)/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1)));
    }

    // Extract tag lists
    for (const pattern of tagPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const tagList = match[1].split(/[,;]/).map(tag => tag.trim());
        tags.push(...tagList);
      }
    }

    if (tags.length > 0) {
      metadata.tags = [...new Set(tags)]; // Remove duplicates
    }

    // Page count for PDFs (rough estimate)
    if (type === 'pdf') {
      const pageBreaks = content.match(/\f/g);
      metadata.pageCount = (pageBreaks ? pageBreaks.length : 1) + 1;
    }

    return metadata;
  }

  /**
   * Detect document language (simple implementation)
   */
  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'y', 'o', 'pero', 'en', 'de', 'para', 'con', 'por', 'según'];
    const frenchWords = ['le', 'la', 'et', 'ou', 'mais', 'dans', 'de', 'pour', 'avec', 'par', 'selon'];

    const words = content.toLowerCase().split(/\s+/).slice(0, 100); // Sample first 100 words
    
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    const spanishCount = words.filter(word => spanishWords.includes(word)).length;
    const frenchCount = words.filter(word => frenchWords.includes(word)).length;

    if (englishCount > spanishCount && englishCount > frenchCount) {
      return 'en';
    } else if (spanishCount > frenchCount) {
      return 'es';
    } else if (frenchCount > 0) {
      return 'fr';
    }

    return 'en'; // Default to English
  }

  /**
   * Process document into chunks with metadata
   */
  async processDocument(
    content: string,
    documentId: string,
    type: DocumentType,
    chunkSize: number = 1000,
    overlap: number = 200
  ): Promise<Omit<DocumentChunk, 'id' | 'createdAt' | 'embedding'>[]> {
    logDocumentProcessing(documentId, 'chunking', {
      contentLength: content.length,
      chunkSize,
      overlap
    });

    const chunks = this.chunkDocument(content, chunkSize, overlap);
    const metadata = this.extractMetadata(content, type);

    const processedChunks: Omit<DocumentChunk, 'id' | 'createdAt' | 'embedding'>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Find position of this chunk in original content
      const startPosition = content.indexOf(chunk);
      const endPosition = startPosition + chunk.length;

      const chunkMetadata: ChunkMetadata = {
        chunkIndex: i,
        startPosition,
        endPosition,
        tokenCount: Math.round(chunk.length / 4), // Rough token estimation
        heading: this.extractHeading(chunk),
        section: this.extractSection(chunk)
      };

      processedChunks.push({
        documentId,
        content: chunk,
        metadata: chunkMetadata
      });
    }

    logDocumentProcessing(documentId, 'chunking_completed', {
      totalChunks: processedChunks.length,
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length
    });

    return processedChunks;
  }

  /**
   * Extract heading from chunk
   */
  private extractHeading(chunk: string): string | undefined {
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#+\s*/, '');
      }
      if (trimmed.length < 100 && trimmed.length > 10 && !trimmed.includes('.')) {
        return trimmed;
      }
    }
    
    return undefined;
  }

  /**
   * Extract section name from chunk
   */
  private extractSection(chunk: string): string | undefined {
    const sectionPatterns = [
      /^(chapter|section|part)\s+\d+/i,
      /^\d+\.\s*[A-Z][^.]*$/i,
      /^[A-Z][A-Z\s]+$/
    ];

    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      for (const pattern of sectionPatterns) {
        if (pattern.test(trimmed)) {
          return trimmed;
        }
      }
    }

    return undefined;
  }
}

// Singleton instance
export const documentProcessor = new DocumentProcessor();
