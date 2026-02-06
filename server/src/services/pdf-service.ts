import puppeteer from 'puppeteer';
import { marked } from 'marked';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

export class PdfService {
    private static templatePath = path.join(process.cwd(), 'src', 'templates', 'pdf-base.html');

    /**
     * Generates a PDF buffer from Markdown content.
     */
    static async generatePdf(
        markdownContent: string,
        title: string,
        metadata?: Record<string, any>
    ): Promise<Buffer> {
        let browser = null;
        try {
            // 1. Configure marked with GFM (GitHub Flavored Markdown) for table support
            marked.setOptions({
                gfm: true,
                breaks: false
            });

            // 2. Convert Markdown to HTML
            const htmlContent = await marked.parse(markdownContent);

            // 3. Load and compile Handlebars template (with fallback if template doesn't exist)
            let finalHtml: string;
            try {
                const templateSource = await fs.readFile(this.templatePath, 'utf-8');
                const template = Handlebars.compile(templateSource);
                finalHtml = template({
                    title,
                    content: htmlContent,
                    date: format(new Date(), 'MMM d, yyyy'),
                    ...metadata
                });
            } catch (templateError: any) {
                // Fallback: Use inline HTML template if file doesn't exist
                console.warn('Template file not found, using inline template:', templateError.message);
                finalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 15px; font-size: 28px; margin-bottom: 20px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 10px; margin-top: 30px; font-size: 24px; }
        h3 { color: #444; margin-top: 25px; font-size: 20px; }
        p { margin-bottom: 15px; line-height: 1.8; }
        table { border-collapse: collapse; width: 100%; margin: 25px 0; font-size: 14px; }
        th, td { border: 1px solid #e1e4e8; padding: 12px 15px; text-align: left; }
        th { background-color: #f8f9fa; color: #333; font-weight: 600; border-bottom: 2px solid #ddd; }
        tr:nth-child(even) { background-color: #fcfcfc; }
        code { background-color: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.9em; color: #e83e8c; }
        pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 20px 0; border: 1px solid #e1e4e8; }
        blockquote { border-left: 4px solid #3498db; margin: 20px 0; padding: 10px 20px; color: #555; background-color: #f8f9fa; border-radius: 0 4px 4px 0; }
        ul, ol { padding-left: 20px; margin-bottom: 15px; }
        li { margin-bottom: 8px; }
        img { max-width: 100%; height: auto; border-radius: 4px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .metadata { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 30px; border: 1px solid #e1e4e8; }
        .metadata p { margin: 5px 0; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="metadata">
        ${metadata?.project ? `<p><strong>Project:</strong> ${metadata.project}</p>` : ''}
        <p><strong>Date:</strong> ${format(new Date(), 'MMM d, yyyy')}</p>
        ${metadata?.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
    </div>
    <h1>${title}</h1>
    ${htmlContent}
</body>
</html>`;
            }

            // 4. Launch Puppeteer with production-friendly options
            const launchOptions: any = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            };

            browser = await puppeteer.launch(launchOptions);
            const page = await browser.newPage();

            // 5. Set content and wait for fonts/images (with timeout)
            await page.setContent(finalHtml, {
                waitUntil: 'networkidle0',
                timeout: 30000 // 30 second timeout
            });

            // 6. Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '2.5cm',
                    bottom: '2.5cm',
                    left: '2cm',
                    right: '2cm'
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                    <div style="font-size: 9px; text-align: center; width: 100%; color: #888; padding-bottom: 10px;">
                        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                        <span style="margin-left: 10px;">${title}</span>
                    </div>
                `
            });

            return Buffer.from(pdfBuffer);
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            throw new Error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
