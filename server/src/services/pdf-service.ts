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
        try {
            // 1. Convert Markdown to HTML
            const htmlContent = await marked.parse(markdownContent);

            // 2. Load and compile Handlebars template
            const templateSource = await fs.readFile(this.templatePath, 'utf-8');
            const template = Handlebars.compile(templateSource);

            // 3. Render HTML with data
            const finalHtml = template({
                title,
                content: htmlContent,
                date: format(new Date(), 'MMM d, yyyy'),
                ...metadata
            });

            // 4. Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // 5. Set content and wait for fonts/images
            await page.setContent(finalHtml, {
                waitUntil: 'networkidle0'
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

            await browser.close();

            return Buffer.from(pdfBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw new Error('Failed to generate PDF');
        }
    }
}
