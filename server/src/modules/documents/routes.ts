import { Router } from 'express';
import { DocumentsController } from './DocumentsController';
import { authenticateToken } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();

// Document Retrieval
router.get('/project/:projectId', authenticateToken, DocumentsController.getProjectDocuments);
router.get('/project/:projectId/stats', authenticateToken, DocumentsController.getProjectStats);
router.get('/project/:projectId/deleted', authenticateToken, DocumentsController.getDeletedDocuments);
router.get('/:id', authenticateToken, DocumentsController.getById);
router.get('/:id/pdf-preview', authenticateToken, DocumentsController.getPdfPreview);
router.get('/:id/versions', authenticateToken, DocumentsController.getVersions);
router.get('/:id/quality-audit', authenticateToken, DocumentsController.getQualityAudit);

// Document Lifecycle
router.post('/project/:projectId', authenticateToken, DocumentsController.create);
router.put('/:id', authenticateToken, DocumentsController.update);
router.delete('/:id', authenticateToken, DocumentsController.delete);
router.post('/:id/restore', authenticateToken, DocumentsController.restore);

// Document Feedback
router.post('/:id/feedback', authenticateToken, DocumentsController.submitFeedback);

// Exports
router.get('/:id/export/pdf', authenticateToken, DocumentsController.exportPdf);
router.get('/:id/export/docx', authenticateToken, DocumentsController.exportDocx);
router.post('/bulk-export/pdf', authenticateToken, DocumentsController.bulkExportPdf);
router.post('/bulk-export/docx', authenticateToken, DocumentsController.bulkExportDocx);

const documentRoutes: RouteConfig[] = [
  {
    path: '/documents',
    router: router,
    version: '1',
    category: 'Documents'
  }
];

export default documentRoutes;
