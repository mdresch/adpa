/**
 * Document Parser Service
 * Extracts text and metadata from multiple document formats
 * Supports: PDF, DOCX, XLSX, TXT
 */

import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import { Document, Packer } from 'docx';
import { logger } from '../utils/logger';

export interface ParsedDocument {
  id: string;
  filename: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'txt';
  content: string;
  metadata: DocumentMetadata;
  sections: DocumentSection[];
  parsing_confidence: number;
  parsing_errors: string[];
  raw_text_length: number;
}

export interface DocumentMetadata {
  author?: string;
  created_date?: Date;
  modified_date?: Date;
  title?: string;
  version?: string;
  word_count: number;
  character_count: number;
  pages?: number;
  tables?: number;
  images?: number;
}

export interface DocumentSection {
  id: string;
  heading?: string;
  content: string;
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'code' | 'other';
  order: number;
  confidence: number;
}

export class DocumentParserService {
  private static readonly SUPPORTED_FORMATS = ['pdf', 'docx', 'xlsx', 'txt'];
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Parse a document from a buffer
   */
  async parseDocument(
    buffer: Buffer,
    filename: string,
    format?: string
  ): Promise<ParsedDocument> {
    try {
      // Validate file size
      if (buffer.length > DocumentParserService.MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds maximum of ${DocumentParserService.MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }

      // Detect format
      const detectedFormat = format || this.detectFormat(filename);
      if (!DocumentParserService.SUPPORTED_FORMATS.includes(detectedFormat)) {
        throw new Error(`Unsupported document format: ${detectedFormat}`);
      }

      // Route to appropriate parser
      let result: ParsedDocument;
      switch (detectedFormat) {
        case 'pdf':
          result = await this.parsePDF(buffer, filename);
          break;
        case 'docx':
          result = await this.parseDocx(buffer, filename);
          break;
        case 'xlsx':
          result = await this.parseXlsx(buffer, filename);
          break;
        case 'txt':
          result = await this.parseTxt(buffer, filename);
          break;
        default:
          throw new Error(`Unsupported format: ${detectedFormat}`);
      }

      return result;
    } catch (error) {
      logger.error('Document parsing failed', {
        filename,
        format,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse PDF document
   */
  private async parsePDF(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      const pdfData = await pdfParse(buffer);

      const content = pdfData.text || '';
      const sections = this.extractSections(content, 'pdf');

      const metadata: DocumentMetadata = {
        title: filename.replace(/\.pdf$/, ''),
        pages: pdfData.numpages,
        word_count: this.countWords(content),
        character_count: content.length,
        author: pdfData.info?.Author,
        created_date: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
        modified_date: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
      };

      const confidence = this.calculateConfidence(content, sections);

      return {
        id: this.generateId(),
        filename,
        format: 'pdf',
        content,
        metadata,
        sections,
        parsing_confidence: confidence,
        parsing_errors: [],
        raw_text_length: content.length,
      };
    } catch (error) {
      logger.error('PDF parsing failed', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse DOCX document
   */
  private async parseDocx(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      // Use a simple approach: convert DOCX metadata manually
      // For full DOCX parsing, you'd typically use mammoth or similar
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(buffer);

      // Extract main document XML
      const documentXml = await zip.file('word/document.xml')?.async('string');
      if (!documentXml) {
        throw new Error('Invalid DOCX: missing document.xml');
      }

      // Extract text from XML (simplified)
      const content = this.extractTextFromDocxXml(documentXml);
      const sections = this.extractSections(content, 'docx');

      // Extract metadata from docProps
      let metadata: DocumentMetadata = {
        title: filename.replace(/\.docx$/, ''),
        word_count: this.countWords(content),
        character_count: content.length,
      };

      try {
        const corePropsXml = await zip.file('docProps/core.xml')?.async('string');
        if (corePropsXml) {
          const titleMatch = corePropsXml.match(/<dc:title>([^<]+)<\/dc:title>/);
          const creatorMatch = corePropsXml.match(/<dc:creator>([^<]+)<\/dc:creator>/);
          const createdMatch = corePropsXml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/);

          if (titleMatch) metadata.title = titleMatch[1];
          if (creatorMatch) metadata.author = creatorMatch[1];
          if (createdMatch) metadata.created_date = new Date(createdMatch[1]);
        }
      } catch (err) {
        logger.warn('Failed to extract DOCX metadata', { filename });
      }

      const confidence = this.calculateConfidence(content, sections);

      return {
        id: this.generateId(),
        filename,
        format: 'docx',
        content,
        metadata,
        sections,
        parsing_confidence: confidence,
        parsing_errors: [],
        raw_text_length: content.length,
      };
    } catch (error) {
      logger.error('DOCX parsing failed', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse XLSX document
   */
  private async parseXlsx(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sections: DocumentSection[] = [];
      let totalContent = '';
      let tableCount = 0;

      // Extract data from all sheets
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        totalContent += `\n## Sheet: ${sheetName}\n`;
        totalContent += csvData;

        sections.push({
          id: this.generateId(),
          heading: `Sheet: ${sheetName}`,
          content: csvData,
          type: 'table',
          order: sheetIndex,
          confidence: 0.95,
        });

        tableCount++;
      });

      const metadata: DocumentMetadata = {
        title: filename.replace(/\.xlsx$/, ''),
        word_count: this.countWords(totalContent),
        character_count: totalContent.length,
        tables: tableCount,
      };

      const confidence = this.calculateConfidence(totalContent, sections);

      return {
        id: this.generateId(),
        filename,
        format: 'xlsx',
        content: totalContent,
        metadata,
        sections,
        parsing_confidence: confidence,
        parsing_errors: [],
        raw_text_length: totalContent.length,
      };
    } catch (error) {
      logger.error('XLSX parsing failed', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse plain text document
   */
  private async parseTxt(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      // Try multiple encodings
      let content: string;
      try {
        content = buffer.toString('utf-8');
      } catch {
        content = buffer.toString('latin1');
      }

      const sections = this.extractSections(content, 'txt');

      const metadata: DocumentMetadata = {
        title: filename.replace(/\.txt$/, ''),
        word_count: this.countWords(content),
        character_count: content.length,
      };

      const confidence = this.calculateConfidence(content, sections);

      return {
        id: this.generateId(),
        filename,
        format: 'txt',
        content,
        metadata,
        sections,
        parsing_confidence: confidence,
        parsing_errors: [],
        raw_text_length: content.length,
      };
    } catch (error) {
      logger.error('TXT parsing failed', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Detect document format from filename
   */
  private detectFormat(filename: string): string {
    const ext = path.extname(filename).toLowerCase().substring(1);
    const formatMap: Record<string, string> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'docx',
      xlsx: 'xlsx',
      xls: 'xlsx',
      csv: 'xlsx',
      txt: 'txt',
      text: 'txt',
    };
    return formatMap[ext] || 'txt';
  }

  /**
   * Extract sections from content
   */
  private extractSections(content: string, format: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let currentSection = '';
    let sectionOrder = 0;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect headings (heuristic)
      const isHeading =
        trimmed.length > 0 &&
        (trimmed.match(/^#+\s/) || // Markdown-style
          trimmed === trimmed.toUpperCase() && trimmed.length < 100 || // ALL CAPS
          (i < lines.length - 1 && lines[i + 1].match(/^[=\-]{3,}/))); // Underline style

      if (isHeading && currentSection.trim()) {
        sections.push({
          id: this.generateId(),
          heading: lines[i - 1]?.trim(),
          content: currentSection.trim(),
          type: 'paragraph',
          order: sectionOrder++,
          confidence: 0.8,
        });
        currentSection = '';
      }

      currentSection += line + '\n';
    }

    // Add final section
    if (currentSection.trim()) {
      sections.push({
        id: this.generateId(),
        content: currentSection.trim(),
        type: 'paragraph',
        order: sectionOrder,
        confidence: 0.8,
      });
    }

    return sections;
  }

  /**
   * Extract text from DOCX XML
   */
  private extractTextFromDocxXml(xml: string): string {
    let text = '';
    // Simple regex-based extraction for paragraph text
    const paragraphMatches = xml.match(/<w:p>(.*?)<\/w:p>/gs) || [];
    for (const para of paragraphMatches) {
      const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const parText = textMatches.map((t) => t.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
      if (parText) text += parText + '\n';
    }
    return text;
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Calculate parsing confidence score (0-1)
   */
  private calculateConfidence(content: string, sections: DocumentSection[]): number {
    if (!content || content.length === 0) return 0;
    if (sections.length === 0) return 0.5;

    // Base confidence on content quality metrics
    const avgSectionLength = content.length / sections.length;
    const hasStructure = sections.some((s) => s.heading);
    const hasContent = content.length > 100;

    let confidence = 0.7;
    if (avgSectionLength > 500) confidence += 0.1;
    if (hasStructure) confidence += 0.1;
    if (hasContent) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Export singleton instance
export const documentParserService = new DocumentParserService();
