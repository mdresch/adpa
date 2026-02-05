/**
 * Development Approach Routes
 * Purpose: REST API endpoints for development approach management
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import Joi from 'joi';
import * as developmentApproachService from './developmentApproachService';
import { validateDevelopmentApproach, validateDevelopmentApproachFilters } from './validation';

const router = Router();

/**
 * GET /api/development-approach/:projectId
 * Get development approach for a project
 */
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const approach = await developmentApproachService.getDevelopmentApproach(projectId);
    
    res.json({
      success: true,
      data: approach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/development-approach/:projectId
 * Create or update development approach for a project
 */
router.post('/:projectId', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user!.id;
    const approachData = req.body;
    
    // Validate input
    const validatedData = validateDevelopmentApproach(approachData);
    
    const approach = await developmentApproachService.upsertDevelopmentApproach(
      projectId,
      validatedData,
      userId
    );
    
    res.json({
      success: true,
      data: approach
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/development-approach/:projectId
 * Delete development approach for a project
 */
router.delete('/:projectId', authenticateToken, requirePermission('project_admin'), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    await developmentApproachService.deleteDevelopmentApproach(projectId);
    
    res.json({
      success: true,
      message: 'Development approach deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/development-approach
 * List development approaches (for analytics)
 */
router.get('/', authenticateToken, requirePermission('analytics_view'), async (req, res) => {
  try {
    // Validate filters
    const filters = validateDevelopmentApproachFilters(req.query);
    
    const approaches = await developmentApproachService.listDevelopmentApproaches(filters);
    
    res.json({
      success: true,
      data: approaches
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/development-approach/statistics
 * Get development approach statistics
 */
router.get('/statistics', authenticateToken, requirePermission('analytics_view'), async (req, res) => {
  try {
    const stats = await developmentApproachService.getDevelopmentApproachStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;