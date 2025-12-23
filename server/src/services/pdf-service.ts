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
                breaks: false,
                headerIds: false,
                mangle: false
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
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 8px; margin-top: 25px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #3498db; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        pre code { background-color: transparent; padding: 0; }
        blockquote { border-left: 4px solid #3498db; margin: 20px 0; padding-left: 20px; color: #555; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${metadata?.project ? `<p><strong>Project:</strong> ${metadata.project}</p>` : ''}
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
                    top: '2cm',
                    bottom: '2cm',
                    left: '2cm',
                    right: '2cm'
                },
                displayHeaderFooter: false
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
