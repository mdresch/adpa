/**
 * Document Conversion Service
 * 
 * Converts various document formats (PDF, DOCX, TXT, RTF) to Markdown
 * for storage in ADPA database. Supports multiple conversion strategies
 * with automatic fallback.
 * 
 * @module documentConversionService
 */

import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import TurndownService from 'turndown';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Initialize Turndown for HTML → Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**'
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ConversionResult {
  markdown: string;
  metadata: {
    originalFormat: string;
    conversionMethod: string;
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    conversionDuration: number; // milliseconds
    quality: 'high' | 'medium' | 'low';
    warnings: string[];
  };
}

export interface ConversionOptions {
  format: 'pdf' | 'docx' | 'txt' | 'md' | 'rtf' | 'html' | 'odt';
  filename?: string;
  preserveFormatting?: boolean;
  extractImages?: boolean;
  maxFileSize?: number; // bytes
}

export interface PDFConversionOptions extends ConversionOptions {
  format: 'pdf';
  useOCR?: boolean; // For scanned PDFs
  pdfExtractor?: 'adobe' | 'pdf-parse' | 'pdfjs';
}

// ============================================================================
// MAIN CONVERSION FUNCTION
// ============================================================================

/**
 * Convert document buffer to Markdown
 * Auto-detects format and uses appropriate converter
 */
export async function convertToMarkdown(
  buffer: Buffer,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting document conversion', {
      format: options.format,
      size: buffer.length,
      filename: options.filename
    });

    // Validate file size
    const maxSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    if (buffer.length > maxSize) {
      throw new Error(`File size ${buffer.length} exceeds maximum ${maxSize}`);
    }

    let result: ConversionResult;

    switch (options.format.toLowerCase()) {
      case 'pdf':
        result = await convertPDFToMarkdown(buffer, options as PDFConversionOptions);
        break;
      
      case 'docx':
        result = await convertDOCXToMarkdown(buffer, options);
        break;
      
      case 'txt':
        result = await convertTXTToMarkdown(buffer, options);
        break;
      
      case 'md':
      case 'markdown':
        result = {
          markdown: buffer.toString('utf-8'),
          metadata: {
            originalFormat: 'markdown',
            conversionMethod: 'none',
            wordCount: countWords(buffer.toString('utf-8')),
            characterCount: buffer.length,
            conversionDuration: Date.now() - startTime,
            quality: 'high',
            warnings: []
          }
        };
        break;
      
      case 'html':
        result = await convertHTMLToMarkdown(buffer, options);
        break;
      
      case 'rtf':
        result = await convertRTFToMarkdown(buffer, options);
        break;
      
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    logger.info('Document conversion completed', {
      format: options.format,
      duration: result.metadata.conversionDuration,
      quality: result.metadata.quality,
      wordCount: result.metadata.wordCount
    });

    return result;

  } catch (error: any) {
    logger.error('Document conversion failed', {
      format: options.format,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Failed to convert ${options.format}: ${error.message}`);
  }
}

// ============================================================================
// PDF CONVERSION
// ============================================================================

/**
 * Convert PDF to Markdown
 * Primary: Adobe PDF Services (if available)
 * Fallback: pdf-parse library
 */
async function convertPDFToMarkdown(
  buffer: Buffer,
  options: PDFConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // Try Adobe PDF Services first (best quality)
    if (process.env.ADOBE_CLIENT_ID && options.pdfExtractor !== 'pdf-parse') {
      try {
        return await convertPDFWithAdobe(buffer, options);
      } catch (adobeError: any) {
        warnings.push(`Adobe PDF Services failed: ${adobeError.message}`);
        logger.warn('Adobe PDF conversion failed, falling back to pdf-parse', {
          error: adobeError.message
        });
      }
    }

    // Fallback: pdf-parse
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    // Convert extracted text to structured Markdown
    const markdown = formatPDFTextToMarkdown(data.text, data.info);

    // CRITICAL: Ensure markdown is always a string, never an object
    const markdownString = typeof markdown === 'string' 
      ? markdown 
      : (markdown?.text || markdown?.content || markdown?.markdown || String(markdown || ''));

    if (!markdownString || markdownString.trim() === '') {
      throw new Error('PDF conversion resulted in empty Markdown content');
    }

    return {
      markdown: markdownString, // Always a string
      metadata: {
        originalFormat: 'pdf',
        conversionMethod: 'pdf-parse',
        pageCount: data.numpages,
        wordCount: countWords(markdownString),
        characterCount: markdownString.length,
        conversionDuration: Date.now() - startTime,
        quality: 'medium',
        warnings
      }
    };

  } catch (error: any) {
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF using Adobe PDF Services (premium quality)
 */
async function convertPDFWithAdobe(
  buffer: Buffer,
  options: PDFConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  // Adobe PDF Services implementation
  // Note: This requires Adobe credentials to be configured
  const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
  
  const credentials = PDFServicesSdk.Credentials
    .servicePrincipalCredentialsBuilder()
    .withClientId(process.env.ADOBE_CLIENT_ID)
    .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
    .build();

  const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
  const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

  // Write buffer to temp file
  const tempDir = path.join(__dirname, '../../temp/pdf-conversion');
  await fs.mkdir(tempDir, { recursive: true });
  const tempInputPath = path.join(tempDir, `input-${Date.now()}.pdf`);
  await fs.writeFile(tempInputPath, buffer);

  const input = PDFServicesSdk.FileRef.createFromLocalFile(tempInputPath);
  extractPDFOperation.setInput(input);

  const options_adobe = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
    .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
    .build();
  
  extractPDFOperation.setOptions(options_adobe);

  try {
    const result = await extractPDFOperation.execute(executionContext);
    const resultPath = path.join(tempDir, `output-${Date.now()}.zip`);
    await result.saveAsFile(resultPath);

    // Extract and parse JSON result
    const resultData = await extractAdobeResult(resultPath);
    const markdown = convertAdobeResultToMarkdown(resultData);

    // CRITICAL: Ensure markdown is always a string, never an object
    const markdownString = typeof markdown === 'string' 
      ? markdown 
      : (markdown?.text || markdown?.content || markdown?.markdown || String(markdown || ''));

    if (!markdownString || markdownString.trim() === '') {
      throw new Error('Adobe PDF conversion resulted in empty Markdown content');
    }

    // Cleanup temp files
    await fs.unlink(tempInputPath);
    await fs.unlink(resultPath);

    return {
      markdown: markdownString, // Always a string
      metadata: {
        originalFormat: 'pdf',
        conversionMethod: 'adobe-pdf-services',
        pageCount: resultData.pages?.length || 0,
        wordCount: countWords(markdownString),
        characterCount: markdownString.length,
        conversionDuration: Date.now() - startTime,
        quality: 'high',
        warnings: []
      }
    };

  } catch (error: any) {
    // Cleanup on error
    try {
      await fs.unlink(tempInputPath);
    } catch {}
    
    throw error;
  }
}

/**
 * Format extracted PDF text into structured Markdown
 */
function formatPDFTextToMarkdown(text: string, info?: any): string {
  // Clean up common PDF extraction artifacts
  let cleaned = text
    .replace(/\f/g, '\n\n---\n\n') // Form feeds become page breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  // Try to detect headings (lines with all caps, or short lines followed by content)
  const lines = cleaned.split('\n');
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      formatted.push('');
      continue;
    }

    // Detect potential headings
    if (line.length < 60 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line)) {
      // All caps short line = likely heading
      formatted.push(`## ${line}`);
    } else if (i > 0 && lines[i - 1].trim() === '' && line.length < 50 && i < lines.length - 1 && lines[i + 1].trim() !== '') {
      // Short line surrounded by content = potential heading
      formatted.push(`### ${line}`);
    } else {
      formatted.push(line);
    }
  }

  return formatted.join('\n');
}

// ============================================================================
// DOCX CONVERSION
// ============================================================================

/**
 * Convert DOCX to Markdown using Mammoth
 */
async function convertDOCXToMarkdown(
  buffer: Buffer,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh"
      ]
    });

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(result.value);

    // Collect warnings from Mammoth
    if (result.messages && result.messages.length > 0) {
      result.messages.forEach((msg: any) => {
        if (msg.type === 'warning') {
          warnings.push(msg.message);
        }
      });
    }

    return {
      markdown,
      metadata: {
        originalFormat: 'docx',
        conversionMethod: 'mammoth',
        wordCount: countWords(markdown),
        characterCount: markdown.length,
        conversionDuration: Date.now() - startTime,
        quality: warnings.length > 5 ? 'medium' : 'high',
        warnings
      }
    };

  } catch (error: any) {
    throw new Error(`DOCX conversion failed: ${error.message}`);
  }
}

// ============================================================================
// TXT CONVERSION
// ============================================================================

/**
 * Convert plain text to Markdown
 */
async function convertTXTToMarkdown(
  buffer: Buffer,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  // Detect encoding (UTF-8, UTF-16, etc.)
  const text = buffer.toString('utf-8');
  
  // Clean up and format
  const formatted = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    markdown: formatted,
    metadata: {
      originalFormat: 'txt',
      conversionMethod: 'utf8-decode',
      wordCount: countWords(formatted),
      characterCount: formatted.length,
      conversionDuration: Date.now() - startTime,
      quality: 'high',
      warnings: []
    }
  };
}

// ============================================================================
// HTML CONVERSION
// ============================================================================

/**
 * Convert HTML to Markdown
 */
async function convertHTMLToMarkdown(
  buffer: Buffer,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  const html = buffer.toString('utf-8');
  const markdown = turndownService.turndown(html);

  return {
    markdown,
    metadata: {
      originalFormat: 'html',
      conversionMethod: 'turndown',
      wordCount: countWords(markdown),
      characterCount: markdown.length,
      conversionDuration: Date.now() - startTime,
      quality: 'high',
      warnings: []
    }
  };
}

// ============================================================================
// RTF CONVERSION
// ============================================================================

/**
 * Convert RTF to Markdown
 */
async function convertRTFToMarkdown(
  buffer: Buffer,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  // RTF conversion requires external library or tool
  // Using rtf-to-html converter (install: npm install rtf-parser)
  try {
    const rtfParser = require('rtf-parser');
    
    const rtfText = buffer.toString('utf-8');
    const parsed = await rtfParser.parseRtf(rtfText);
    
    // Convert parsed RTF to HTML, then to Markdown
    const html = convertRTFNodeToHTML(parsed);
    const markdown = turndownService.turndown(html);

    return {
      markdown,
      metadata: {
        originalFormat: 'rtf',
        conversionMethod: 'rtf-parser',
        wordCount: countWords(markdown),
        characterCount: markdown.length,
        conversionDuration: Date.now() - startTime,
        quality: 'medium',
        warnings: ['RTF conversion may lose some formatting']
      }
    };

  } catch (error: any) {
    // Fallback: treat as plain text
    return convertTXTToMarkdown(buffer, options);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Extract Adobe PDF Services result from ZIP
 */
async function extractAdobeResult(zipPath: string): Promise<any> {
  // Extract ZIP and read JSON result
  // Implementation depends on zip library (e.g., adm-zip, unzipper)
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  for (const entry of entries) {
    if (entry.entryName === 'structuredData.json') {
      const content = entry.getData().toString('utf8');
      return JSON.parse(content);
    }
  }
  
  throw new Error('Could not find structuredData.json in Adobe result');
}

/**
 * Convert Adobe result JSON to Markdown
 */
function convertAdobeResultToMarkdown(data: any): string {
  const lines: string[] = [];
  
  if (data.elements) {
    for (const element of data.elements) {
      if (element.Path?.includes('H1')) {
        lines.push(`# ${element.Text}`);
      } else if (element.Path?.includes('H2')) {
        lines.push(`## ${element.Text}`);
      } else if (element.Path?.includes('H3')) {
        lines.push(`### ${element.Text}`);
      } else if (element.Text) {
        lines.push(element.Text);
      }
      lines.push('');
    }
  }
  
  return lines.join('\n').trim();
}

/**
 * Convert RTF node to HTML (simplified)
 */
function convertRTFNodeToHTML(node: any): string {
  if (typeof node === 'string') return node;
  
  let html = '';
  if (node.content) {
    for (const child of node.content) {
      html += convertRTFNodeToHTML(child);
    }
  }
  return html;
}

/**
 * Validate Markdown quality
 */
export function validateMarkdownQuality(markdown: string): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check for minimum content
  if (markdown.length < 100) {
    issues.push('Content too short (< 100 characters)');
    score -= 30;
  }

  // Check for headings
  if (!markdown.match(/^#{1,6}\s/m)) {
    issues.push('No headings detected');
    score -= 20;
  }

  // Check for excessive whitespace
  if (markdown.match(/\n{5,}/)) {
    issues.push('Excessive whitespace detected');
    score -= 10;
  }

  // Check for HTML artifacts (should be converted)
  if (markdown.match(/<[^>]+>/)) {
    issues.push('HTML tags found in Markdown');
    score -= 15;
  }

  // Check for common conversion errors
  if (markdown.includes('�')) {
    issues.push('Encoding errors detected');
    score -= 25;
  }

  return {
    isValid: score >= 60,
    score: Math.max(0, score),
    issues
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const documentConversionService = {
  convertToMarkdown,
  validateMarkdownQuality,
  convertPDFToMarkdown,
  convertDOCXToMarkdown,
  convertTXTToMarkdown,
  convertHTMLToMarkdown
};
