/**
 * PDF Generator Utility
 * Legacy shim for backward compatibility with existing rituals and controllers.
 * Routes all generation through the centralized UnifiedPdfService.
 */

import { unifiedPdfService } from '../services/pdfService';

/**
 * Convert HTML content to PDF Buffer
 * @param html The HTML string to convert
 * @param options Puppeteer PDF conversion options
 */
export async function htmlToPdf(html: string, options: any = {}): Promise<Buffer> {
    return unifiedPdfService.generateFromHtml(html, options);
}

/**
 * Convert Markdown content to PDF Buffer
 * @param markdown The Markdown string to convert
 * @param options PDF conversion options
 */
export async function markdownToPdf(markdown: string, options: any = {}): Promise<Buffer> {
    return unifiedPdfService.generateFromMarkdown(markdown, options);
}
