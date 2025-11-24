/**
 * Task Cost Calculation API Routes
 * 
 * Endpoints for calculating task-level resource costs
 * 
 * GET /api/tasks/:taskId/cost - Get complete cost breakdown for a task
 * GET /api/tasks/:taskId/resources/:assignmentId/cost - Get cost for single resource
 * GET /api/projects/:projectId/tasks/costs - Get costs for all project tasks
 * POST /api/tasks/:taskId/resources/:assignmentId/cost-impact - Calculate cost change impact
 * POST /api/tasks/:taskId/resources - Create/update task assignment with cost
 */

import { Router, Request, Response } from 'express';
import {
  getTaskCostBreakdown,
  calculateTaskResourceCost,
  getProjectTasksCostBreakdown,
  calculateAssignmentCostImpact,
  upsertTaskAssignmentWithCost,
} from '../services/taskCostService';
import { logger } from '../utils/logger';

const router = Router({ mergeParams: true });

/**
 * GET /api/tasks/:taskId/cost
 * Get complete cost breakdown for a task including all resource assignments
 */
router.get('/:taskId/cost', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing taskId parameter',
      });
    }

    const breakdown = await getTaskCostBreakdown(taskId);

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (err) {
    logger.error(`GET /tasks/:taskId/cost error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate task cost breakdown',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tasks/:taskId/resources/:assignmentId/cost
 * Get cost details for a single resource assignment
 */
router.get('/:taskId/resources/:assignmentId/cost', async (req: Request, res: Response) => {
  try {
    const { taskId, assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assignmentId parameter',
      });
    }

    const cost = await calculateTaskResourceCost(assignmentId);

    res.json({
      success: true,
      data: cost,
    });
  } catch (err) {
    logger.error(`GET /tasks/:taskId/resources/:assignmentId/cost error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate resource cost',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:projectId/tasks/costs
 * Get cost breakdown for all tasks in a project
 */
router.get('/projects/:projectId/tasks/costs', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Missing projectId parameter',
      });
    }

    const breakdown = await getProjectTasksCostBreakdown(projectId);

    // Calculate totals
    const totals = {
      taskCount: breakdown.length,
      plannedTotalCost: breakdown.reduce((sum, t) => sum + t.plannedTotalCost, 0),
      actualTotalCost: breakdown.reduce((sum, t) => sum + t.actualTotalCost, 0),
      varianceCost: breakdown.reduce((sum, t) => sum + t.costVariance, 0),
      plannedTotalHours: breakdown.reduce((sum, t) => sum + t.plannedTotalHours, 0),
      actualTotalHours: breakdown.reduce((sum, t) => sum + t.actualTotalHours, 0),
    };

    res.json({
      success: true,
      data: {
        tasks: breakdown,
        totals,
      },
    });
  } catch (err) {
    logger.error(`GET /projects/:projectId/tasks/costs error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate project task costs',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tasks/:taskId/resources/:assignmentId/cost-impact
 * Calculate the cost impact of proposed changes to an assignment
 * 
 * Body:
 * {
 *   plannedHours?: number,
 *   hourlyRate?: number,
 *   allocationPercentage?: number
 * }
 */
router.post('/:taskId/resources/:assignmentId/cost-impact', async (req: Request, res: Response) => {
  try {
    const { taskId, assignmentId } = req.params;
    const { plannedHours, hourlyRate, allocationPercentage } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assignmentId parameter',
      });
    }

    const impact = await calculateAssignmentCostImpact(assignmentId, {
      plannedHours,
      hourlyRate,
      allocationPercentage,
    });

    res.json({
      success: true,
      data: impact,
    });
  } catch (err) {
    logger.error(`POST /tasks/:taskId/resources/:assignmentId/cost-impact error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cost impact',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tasks/:taskId/resources
 * Create or update a task assignment with cost calculation
 * 
 * Body:
 * {
 *   resourceAssignmentId: string (UUID),
 *   userId: string (UUID),
 *   userName: string,
 *   roleId?: string (UUID),
 *   roleName?: string,
 *   plannedHours: number,
 *   hourlyRate: number,
 *   allocationPercentage?: number (default 100),
 *   scheduledStartDate?: ISO date,
 *   scheduledEndDate?: ISO date
 * }
 */
router.post('/:taskId/resources', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      resourceAssignmentId,
      userId,
      userName,
      roleId,
      roleName,
      plannedHours,
      hourlyRate,
      allocationPercentage,
      scheduledStartDate,
      scheduledEndDate,
    } = req.body;

    // Validate required fields
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing taskId parameter',
      });
    }

    if (!resourceAssignmentId || !userId || !plannedHours || hourlyRate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resourceAssignmentId, userId, plannedHours, hourlyRate',
      });
    }

    if (plannedHours <= 0) {
      return res.status(400).json({
        success: false,
        error: 'plannedHours must be greater than 0',
      });
    }

    if (hourlyRate < 0) {
      return res.status(400).json({
        success: false,
        error: 'hourlyRate cannot be negative',
      });
    }

    const result = await upsertTaskAssignmentWithCost(taskId, {
      resourceAssignmentId,
      userId,
      userName,
      roleId,
      roleName,
      plannedHours,
      hourlyRate,
      allocationPercentage,
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : undefined,
      scheduledEndDate: scheduledEndDate ? new Date(scheduledEndDate) : undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Task assignment created/updated with cost calculated',
    });
  } catch (err) {
    logger.error(`POST /tasks/:taskId/resources error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update task assignment',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
