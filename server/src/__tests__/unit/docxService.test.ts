import { DocxService } from '../../services/docxService';

// Mock marked
jest.mock('marked', () => ({
    marked: {
        lexer: jest.fn((markdown) => {
            // Basic mock implementation
            if (!markdown) return [];
            return [
                {
                    type: 'paragraph',
                    tokens: [{ type: 'text', text: markdown }]
                }
            ];
        })
    }
}));

describe('DocxService', () => {
    it('should generate a DOCX buffer from simple Markdown', async () => {
        const markdown = '# Hello World\nThis is a test paragraph.';
        const title = 'Test Document';

        const buffer = await DocxService.generateDocx(markdown, title);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should handle formatting elements', async () => {
        const markdown = '**Bold**';
        const buffer = await DocxService.generateDocx(markdown, 'Format Doc');
        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should handle metadata', async () => {
        const markdown = 'Text';
        const metadata = { Author: 'Me' };
        const buffer = await DocxService.generateDocx(markdown, 'Meta Doc', metadata);
        expect(buffer).toBeDefined();
    });
});
