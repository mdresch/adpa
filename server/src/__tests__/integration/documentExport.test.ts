
import request from 'supertest';
import express from 'express';
import { pool } from '../../database/connection';
import { DocxService } from '../../services/docxService';
import documentRoutes from '../../modules/documents/routes';

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', role: 'admin' };
        next();
    },
    requirePermission: () => (req: any, res: any, next: any) => next(),
}));

// Mock DocxService to avoid actual file generation overhead during integration test
jest.mock('../../services/docxService');
jest.mock('../../utils/pdfGenerator', () => ({
    markdownToPdf: jest.fn(),
    htmlToPdf: jest.fn()
}));

describe('Document Export API', () => {
    const app = express();

    app.use(express.json());
    app.use('/api/documents', documentRoutes[0].router);

    beforeEach(() => {
        jest.clearAllMocks();
        (DocxService.generateDocx as jest.Mock).mockResolvedValue(Buffer.from('fake-docx-content'));
    });

    beforeAll(async () => {
        // Mock database query to return a valid document
        const mockQuery = jest.spyOn(pool, 'query');
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'test-doc-id',
                name: 'Test Document',
                content: '# Markdown Content',
                metadata: { project: 'Test Project' },
                project_name: 'Test Project'
            }],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: []
        } as any);

        // Mock DocxService generation
        (DocxService.generateDocx as jest.Mock).mockResolvedValue(Buffer.from('fake-docx-content'));
    });

    afterAll(async () => {
        jest.restoreAllMocks();
    });

    it('GET /api/documents/:id/export/docx should return 200 and correct content type', async () => {
        const response = await request(app)
            .get('/api/documents/test-doc-id/export/docx')
            .expect(200);

        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(response.headers['content-disposition']).toContain('attachment; filename="Test_Document.docx"');
        expect(response.body).toBeDefined();
    });

    it('GET /api/documents/:id/export/docx should handle 404 if document not found', async () => {
        // Override mock for this test
        jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

        await request(app)
            .get('/api/documents/non-existent-id/export/docx')
            .expect(404);
    });

    it('POST /api/documents/bulk-export/docx should return one combined docx file', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [
                {
                    id: 'doc-1',
                    name: 'First Document',
                    content: '# First markdown',
                    metadata: { project: 'Test Project' },
                },
                {
                    id: 'doc-2',
                    name: 'Second Document',
                    content: '## Second markdown',
                    metadata: { project: 'Test Project' },
                }
            ],
            rowCount: 2,
            command: 'SELECT',
            oid: 0,
            fields: []
        } as any);

        const response = await request(app)
            .post('/api/documents/bulk-export/docx')
            .send({ document_ids: ['doc-1', 'doc-2'] })
            .expect(200);

        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(response.headers['content-disposition']).toContain('.docx"');
        expect(DocxService.generateDocx).toHaveBeenCalledTimes(1);
        expect(DocxService.generateDocx).toHaveBeenCalledWith(
            expect.stringContaining('# First Document'),
            expect.any(String),
            expect.objectContaining({ document_count: 2 })
        );
        expect(response.body).toBeDefined();
    });
});
