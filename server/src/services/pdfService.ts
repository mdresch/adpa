import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { marked } from 'marked';
import { logger } from '../utils/logger';
import { adobePdfService, AdobePDFServiceWrapper } from './adobePdfService';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface UnifiedPdfOptions extends PDFOptions {
    useAdobe?: boolean;
    adobeOptions?: any;
    filename?: string;
}

export class UnifiedPdfService {
    private static instance: UnifiedPdfService;
    private browser: Browser | null = null;
    private isInitializing = false;

    private constructor() {}

    public static getInstance(): UnifiedPdfService {
        if (!UnifiedPdfService.instance) {
            UnifiedPdfService.instance = new UnifiedPdfService();
        }
        return UnifiedPdfService.instance;
    }

    /**
     * Initialize the Puppeteer browser instance
     */
    private async getBrowser(): Promise<Browser> {
        if (this.browser) return this.browser;

        if (this.isInitializing) {
            // Wait for initialization to complete
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (this.browser) return this.browser;
        }

        this.isInitializing = true;
        try {
            logger.info('Initializing Puppeteer browser for UnifiedPdfService');
            
            const launchOptions: any = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            };

            // Use system Chrome if available (Railway/Production optimization)
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }

            this.browser = await puppeteer.launch(launchOptions);
            
            // Handle browser disconnection
            this.browser.on('disconnected', () => {
                logger.warn('Puppeteer browser disconnected');
                this.browser = null;
            });

            return this.browser;
        } catch (error: any) {
            logger.error('Failed to launch Puppeteer browser:', error);
            throw new Error(`PDF Engine initialization failed: ${error.message}`);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Generate PDF from HTML content
     */
    public async generateFromHtml(html: string, options: UnifiedPdfOptions = {}): Promise<Buffer> {
        const startTime = Date.now();

        // 1. Try Adobe PDF Services if requested and enabled
        if (options.useAdobe) {
            try {
                const status = await adobePdfService.getStatus();
                if (status.enabled && status.credentialsConfigured) {
                    const tempFilename = options.filename || `unified-${Date.now()}.pdf`;
                    const result = await adobePdfService.generatePremiumPDF(
                        html, 
                        tempFilename, 
                        options.adobeOptions
                    );

                    if (result.success && result.filePath) {
                        const buffer = await fs.readFile(result.filePath);
                        // Clean up temp file
                        await fs.unlink(result.filePath).catch(() => {});
                        return buffer;
                    }
                    logger.warn('Adobe PDF generation failed or was bypassed, falling back to Puppeteer', { error: result.error });
                }
            } catch (error: any) {
                logger.error('Adobe PDF fallback error:', error);
            }
        }

        // 2. Standard Puppeteer Generation
        let page = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();

            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

            const pdfOptions: PDFOptions = {
                format: options.format || 'A4',
                printBackground: options.printBackground ?? true,
                margin: options.margin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
                displayHeaderFooter: options.displayHeaderFooter,
                headerTemplate: options.headerTemplate,
                footerTemplate: options.footerTemplate || `
                    <div style="font-size: 9px; text-align: center; width: 100%; color: #888; padding-bottom: 10px;">
                        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                    </div>
                `
            };

            const pdfBuffer = await page.pdf(pdfOptions);
            
            logger.info('PDF generated successfully via Puppeteer', {
                duration: Date.now() - startTime,
                size: pdfBuffer.length
            });

            return Buffer.from(pdfBuffer);
        } catch (error: any) {
            logger.error('Puppeteer PDF generation failed:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            if (page) await page.close();
        }
    }

    /**
     * Generate PDF from Markdown content
     */
    public async generateFromMarkdown(markdown: string, options: UnifiedPdfOptions = {}): Promise<Buffer> {
        // Configure marked for professional output
        marked.setOptions({
            gfm: true,
            breaks: false
        });

        const htmlBody = await marked(markdown);
        
        // Wrap in a basic professional structure if not provided
        const styledHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        padding: 10px;
                    }
                    h1, h2, h3 { color: #2c3e50; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #dfe2e5; padding: 10px; text-align: left; }
                    th { background-color: #f6f8fa; }
                    code { background-color: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
                </style>
            </head>
            <body>
                ${htmlBody}
            </body>
            </html>
        `;

        return this.generateFromHtml(styledHtml, options);
    }

    /**
     * Gracefully close the browser instance
     */
    public async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export const unifiedPdfService = UnifiedPdfService.getInstance();
