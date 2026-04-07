import { Router } from 'express';
import { ProjectCharterController } from './controller';
import { authenticateToken } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();

/**
 * @route   POST /api/v1/project-charter/initiate
 * @desc    Initialize a new Project Charter development workflow
 * @access  Private
 */
router.post('/initiate', authenticateToken, ProjectCharterController.initiate);

/**
 * @route   POST /api/v1/project-charter/extract
 * @desc    Execute AI entity extraction for the charter
 * @access  Private
 */
router.post('/extract', authenticateToken, ProjectCharterController.extract);

/**
 * @route   GET /api/v1/project-charter/:projectId/export/docx
 * @desc    Export a completed project charter to DOCX format
 * @access  Private
 */
router.get('/:projectId/export/docx', authenticateToken, ProjectCharterController.exportDocx);

/**
 * @route   GET /api/v1/project-charter/workflow/:id
 * @desc    Get current workflow state
 * @access  Private
 */
router.get('/workflow/:id', authenticateToken, ProjectCharterController.getWorkflow);

const projectCharterRoutes: RouteConfig[] = [
  {
    path: '/project-charter',
    router: router,
    version: '1',
    category: 'Project Charter'
  }
];

export default projectCharterRoutes;
