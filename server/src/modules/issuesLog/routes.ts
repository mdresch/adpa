/**
 * Issues Log Routes
 * Purpose: REST API endpoints for issues tracking and management
 * Domain: Project Work Performance Domain, Uncertainty Domain
 * Created: February 4, 2026
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requirePermission } from '../../middleware/auth';
import * as issuesService from './issuesService';
import { validateIssue, validateIssueUpdate, validateIssueFilters } from './validation';

const router = Router();

/**
 * POST /api/issues
 * Create a new issue
 */
router.post('/', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const issueData = req.body;
    
    // Validate input
    const validatedData = validateIssue(issueData);
    
    const issue = await issuesService.createIssue(validatedData, userId);
    
    res.status(201).json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/issues/:issueId
 * Get issue by ID
 */
router.get('/:issueId', authenticateToken, async (req, res) => {
  try {
    const issueId = req.params.issueId;
    
    const issue = await issuesService.getIssueById(issueId);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/issues/:issueId
 * Update an issue
 */
router.put('/:issueId', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const issueId = req.params.issueId;
    const userId = req.user!.id;
    const updateData = req.body;
    
    // Validate update data
    const validatedData = validateIssueUpdate(updateData);
    
    const issue = await issuesService.updateIssue(issueId, validatedData, userId);
    
    res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Issue not found') {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/issues/:issueId
 * Delete an issue
 */
router.delete('/:issueId', authenticateToken, requirePermission('project_admin'), async (req, res) => {
  try {
    const issueId = req.params.issueId;
    
    await issuesService.deleteIssue(issueId);
    
    res.json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Issue not found') {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/issues
 * List issues with filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Validate filters
    const filters = validateIssueFilters(req.query);
    
    const issues = await issuesService.listIssues(filters);
    
    res.json({
      success: true,
      data: issues
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/issues/:issueId/history
 * Get issue status history
 */
router.get('/:issueId/history', authenticateToken, async (req, res) => {
  try {
    const issueId = req.params.issueId;
    
    const history = await issuesService.getIssueStatusHistory(issueId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/issues/statistics
 * Get issue statistics
 */
router.get('/statistics', authenticateToken, requirePermission('analytics_view'), async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    
    const stats = await issuesService.getIssueStatistics(projectId);
    
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

/**
 * POST /api/issues/from-risk/:riskId
 * Create issue from materialized risk
 */
router.post('/from-risk/:riskId', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const riskId = req.params.riskId;
    const userId = req.user!.id;
    
    const issue = await issuesService.createIssueFromRisk(riskId, userId);
    
    res.status(201).json({
      success: true,
      data: issue,
      message: 'Issue created from materialized risk'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Risk not found') {
      return res.status(404).json({
        success: false,
        error: 'Risk not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/issues/from-drift
 * Create issue from baseline drift
 */
router.post('/from-drift', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const driftData = req.body;
    
    const issue = await issuesService.createIssueFromDrift(driftData, driftData.projectId, userId);
    
    res.status(201).json({
      success: true,
      data: issue,
      message: 'Issue created from baseline drift'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/issues/from-variance
 * Create issue from performance variance
 */
router.post('/from-variance', authenticateToken, requirePermission('project_edit'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const varianceData = req.body;
    
    const issue = await issuesService.createIssueFromPerformanceVariance(
      varianceData,
      varianceData.projectId,
      userId
    );
    
    if (!issue) {
      return res.json({
        success: true,
        message: 'No issue created - variance within acceptable threshold'
      });
    }
    
    res.status(201).json({
      success: true,
      data: issue,
      message: 'Issue created from performance variance'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;