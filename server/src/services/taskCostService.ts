/**
 * Task-Level Resource Cost Service
 * 
 * Calculates hourly and total resource costs at the task level
 * 
 * Data Flow:
 * Task → Task Assignments (scheduled resources with rates) → Cost Calculations
 * 
 * Calculates:
 * - Hourly cost per resource (hourly_rate)
 * - Total planned cost per resource (planned_hours × hourly_rate)
 * - Total cost per task (sum of all assigned resources)
 * - Overtime costs (hours × overtime_rate)
 * - Cost breakdown by resource type/role
 * - Actual vs planned cost variance
 */

import { pool } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Cost breakdown for a single resource assignment to a task
 */
export interface TaskResourceCost {
  // Assignment Info
  assignmentId: string;
  taskId: string;
  userId: string;
  userName: string;
  roleId: string;
  roleName: string;

  // Planned Costs
  plannedHours: number;
  hourlyRate: number;
  allocationPercentage: number; // % of time dedicated to this task
  
  // Calculated Planned Costs
  effectiveHours: number; // planned_hours × (allocation_percentage / 100)
  plannedCost: number; // effective_hours × hourly_rate
  
  // Actual Costs (from time entries)
  actualHours: number;
  actualCost: number;
  
  // Overtime
  overtimeHours: number;
  overtimeRate: number;
  overtimeCost: number;
  
  // Variance
  hoursVariance: number; // actual - planned
  costVariance: number; // actual - planned
  
  // Dates
  scheduledStartDate?: string;
  scheduledEndDate?: string;
}

/**
 * Complete cost breakdown for a task
 */
export interface TaskCostBreakdown {
  taskId: string;
  taskName: string;
  projectId: string;
  
  // Planned Costs
  plannedTotalHours: number;
  plannedTotalCost: number;
  
  // Actual Costs
  actualTotalHours: number;
  actualTotalCost: number;
  
  // Overtime
  totalOvertimeHours: number;
  totalOvertimeCost: number;
  
  // Variance
  hoursVariance: number;
  costVariance: number;
  variancePercentage: number; // (variance / planned) × 100
  
  // Resource Breakdown
  resourceCount: number;
  resources: TaskResourceCost[];
  
  // Cost by Category (Internal Labor, External Labor, etc.)
  costByCategory: {
    categoryName: string;
    categoryCode: string;
    amount: number;
    hoursCount: number;
  }[];
  
  // Dates
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  status: string;
  percentComplete: number;
}

/**
 * Calculate planned cost for a single task assignment
 */
export async function calculateTaskResourceCost(
  taskAssignmentId: string
): Promise<TaskResourceCost> {
  try {
    const result = await pool.query(
      `
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.user_name,
        ta.role_id,
        ta.role_name,
        ta.planned_hours,
        ta.hourly_rate,
        ta.allocation_percentage,
        COALESCE(ta.actual_hours, 0) as actual_hours,
        COALESCE(ta.actual_cost, 0) as actual_cost,
        COALESCE(ta.overtime_hours, 0) as overtime_hours,
        COALESCE(ta.overtime_rate, 0) as overtime_rate,
        COALESCE(ta.overtime_cost, 0) as overtime_cost,
        ta.scheduled_start_date,
        ta.scheduled_end_date
      FROM task_assignments ta
      WHERE ta.id = $1
      `,
      [taskAssignmentId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task assignment not found: ${taskAssignmentId}`);
    }

    const row = result.rows[0];

    // Calculate effective hours (planned hours × allocation percentage)
    const effectiveHours = (row.planned_hours * row.allocation_percentage) / 100;
    const plannedCost = effectiveHours * row.hourly_rate;
    
    // Calculate variance
    const hoursVariance = row.actual_hours - effectiveHours;
    const costVariance = row.actual_cost - plannedCost;

    return {
      assignmentId: row.assignment_id,
      taskId: row.task_id,
      userId: row.user_id,
      userName: row.user_name,
      roleId: row.role_id,
      roleName: row.role_name,
      plannedHours: row.planned_hours,
      hourlyRate: row.hourly_rate,
      allocationPercentage: row.allocation_percentage,
      effectiveHours,
      plannedCost,
      actualHours: row.actual_hours,
      actualCost: row.actual_cost,
      overtimeHours: row.overtime_hours,
      overtimeRate: row.overtime_rate,
      overtimeCost: row.overtime_cost,
      hoursVariance,
      costVariance,
      scheduledStartDate: row.scheduled_start_date,
      scheduledEndDate: row.scheduled_end_date,
    };
  } catch (err) {
    logger.error('calculateTaskResourceCost error:', err);
    throw err;
  }
}

/**
 * Get complete cost breakdown for a task
 */
export async function getTaskCostBreakdown(taskId: string): Promise<TaskCostBreakdown> {
  try {
    // Get task details
    const taskResult = await pool.query(
      `
      SELECT
        id,
        task_name,
        project_id,
        status,
        percent_complete,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        estimated_hours,
        estimated_cost,
        actual_hours,
        actual_cost
      FROM project_tasks
      WHERE id = $1
      `,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const taskData = taskResult.rows[0];

    // Get all resource assignments for this task
    const assignmentsResult = await pool.query(
      `
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.user_name,
        ta.role_id,
        ta.role_name,
        ta.planned_hours,
        ta.hourly_rate,
        ta.allocation_percentage,
        ta.planned_cost,
        COALESCE(ta.actual_hours, 0) as actual_hours,
        COALESCE(ta.actual_cost, 0) as actual_cost,
        COALESCE(ta.overtime_hours, 0) as overtime_hours,
        COALESCE(ta.overtime_rate, 0) as overtime_rate,
        COALESCE(ta.overtime_cost, 0) as overtime_cost,
        ta.scheduled_start_date,
        ta.scheduled_end_date,
        pr.cost_category_id,
        cc.name as category_name,
        cc.category_code
      FROM task_assignments ta
      LEFT JOIN project_roles pr ON ta.role_id = pr.id
      LEFT JOIN cost_categories cc ON pr.cost_category_id = cc.id
      WHERE ta.task_id = $1
      ORDER BY ta.user_name
      `,
      [taskId]
    );

    // Calculate costs for each resource
    const resourceCosts: TaskResourceCost[] = [];
    let plannedTotalHours = 0;
    let plannedTotalCost = 0;
    let actualTotalHours = 0;
    let actualTotalCost = 0;
    let totalOvertimeHours = 0;
    let totalOvertimeCost = 0;

    // Cost by category tracking
    const costByCategory: Map<string, any> = new Map();

    for (const row of assignmentsResult.rows) {
      // Calculate effective hours
      const effectiveHours = (row.planned_hours * row.allocation_percentage) / 100;
      const plannedCost = effectiveHours * row.hourly_rate;
      const hoursVariance = row.actual_hours - effectiveHours;
      const costVariance = row.actual_cost - plannedCost;

      const resourceCost: TaskResourceCost = {
        assignmentId: row.assignment_id,
        taskId: row.task_id,
        userId: row.user_id,
        userName: row.user_name,
        roleId: row.role_id,
        roleName: row.role_name,
        plannedHours: row.planned_hours,
        hourlyRate: row.hourly_rate,
        allocationPercentage: row.allocation_percentage,
        effectiveHours,
        plannedCost,
        actualHours: row.actual_hours,
        actualCost: row.actual_cost,
        overtimeHours: row.overtime_hours,
        overtimeRate: row.overtime_rate,
        overtimeCost: row.overtime_cost,
        hoursVariance,
        costVariance,
        scheduledStartDate: row.scheduled_start_date,
        scheduledEndDate: row.scheduled_end_date,
      };

      resourceCosts.push(resourceCost);

      // Aggregate totals
      plannedTotalHours += effectiveHours;
      plannedTotalCost += plannedCost;
      actualTotalHours += row.actual_hours;
      actualTotalCost += row.actual_cost;
      totalOvertimeHours += row.overtime_hours;
      totalOvertimeCost += row.overtime_cost;

      // Track by category
      const categoryKey = row.category_code || 'UNCATEGORIZED';
      if (!costByCategory.has(categoryKey)) {
        costByCategory.set(categoryKey, {
          categoryName: row.category_name || 'Uncategorized',
          categoryCode: categoryKey,
          amount: 0,
          hoursCount: 0,
        });
      }
      const category = costByCategory.get(categoryKey);
      category.amount += plannedCost;
      category.hoursCount += effectiveHours;
    }

    // Calculate variance
    const hoursVariance = actualTotalHours - plannedTotalHours;
    const costVariance = actualTotalCost - plannedTotalCost;
    const variancePercentage =
      plannedTotalCost > 0 ? (costVariance / plannedTotalCost) * 100 : 0;

    return {
      taskId: taskData.id,
      taskName: taskData.task_name,
      projectId: taskData.project_id,
      plannedTotalHours,
      plannedTotalCost,
      actualTotalHours,
      actualTotalCost,
      totalOvertimeHours,
      totalOvertimeCost,
      hoursVariance,
      costVariance,
      variancePercentage,
      resourceCount: resourceCosts.length,
      resources: resourceCosts,
      costByCategory: Array.from(costByCategory.values()),
      plannedStartDate: taskData.planned_start_date,
      plannedEndDate: taskData.planned_end_date,
      actualStartDate: taskData.actual_start_date,
      actualEndDate: taskData.actual_end_date,
      status: taskData.status,
      percentComplete: taskData.percent_complete,
    };
  } catch (err) {
    logger.error('getTaskCostBreakdown error:', err);
    throw err;
  }
}

/**
 * Get cost breakdown for multiple tasks (e.g., all tasks in a project)
 */
export async function getProjectTasksCostBreakdown(
  projectId: string
): Promise<TaskCostBreakdown[]> {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT pt.id
      FROM project_tasks pt
      WHERE pt.project_id = $1 AND pt.status != 'cancelled'
      ORDER BY pt.planned_start_date, pt.task_name
      `,
      [projectId]
    );

    const taskBreakdowns: TaskCostBreakdown[] = [];

    for (const row of result.rows) {
      try {
        const breakdown = await getTaskCostBreakdown(row.id);
        taskBreakdowns.push(breakdown);
      } catch (err) {
        logger.warn(`Failed to get cost breakdown for task ${row.id}:`, err);
      }
    }

    return taskBreakdowns;
  } catch (err) {
    logger.error('getProjectTasksCostBreakdown error:', err);
    throw err;
  }
}

/**
 * Update task estimated cost based on assignments
 * Called when task assignments change
 */
export async function updateTaskEstimatedCost(taskId: string): Promise<number> {
  try {
    // Calculate total planned cost from all assignments
    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM((ta.planned_hours * ta.allocation_percentage / 100) * ta.hourly_rate), 0) as total_planned_cost
      FROM task_assignments ta
      WHERE ta.task_id = $1
      `,
      [taskId]
    );

    const totalCost = parseFloat(result.rows[0].total_planned_cost) || 0;

    // Update task with calculated cost
    await pool.query(
      `
      UPDATE project_tasks
      SET estimated_cost = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [totalCost, taskId]
    );

    logger.debug(`Updated task ${taskId} estimated cost: $${totalCost.toFixed(2)}`);

    return totalCost;
  } catch (err) {
    logger.error('updateTaskEstimatedCost error:', err);
    throw err;
  }
}

/**
 * Create or update a task assignment with cost calculation
 */
export async function upsertTaskAssignmentWithCost(
  taskId: string,
  assignmentInput: {
    resourceAssignmentId: string;
    userId: string;
    userName: string;
    roleId?: string;
    roleName?: string;
    plannedHours: number;
    hourlyRate: number;
    allocationPercentage?: number;
    scheduledStartDate?: Date;
    scheduledEndDate?: Date;
  }
): Promise<TaskResourceCost> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const allocationPercentage = assignmentInput.allocationPercentage || 100;

    // Calculate planned cost
    const effectiveHours = (assignmentInput.plannedHours * allocationPercentage) / 100;
    const plannedCost = effectiveHours * assignmentInput.hourlyRate;

    // Upsert task assignment
    const upsertResult = await client.query(
      `
      INSERT INTO task_assignments (
        task_id,
        resource_assignment_id,
        user_id,
        user_name,
        role_id,
        role_name,
        planned_hours,
        hourly_rate,
        planned_cost,
        allocation_percentage,
        scheduled_start_date,
        scheduled_end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (task_id, resource_assignment_id) 
      DO UPDATE SET
        planned_hours = $7,
        hourly_rate = $8,
        planned_cost = $9,
        allocation_percentage = $10,
        scheduled_start_date = $11,
        scheduled_end_date = $12,
        updated_at = NOW()
      RETURNING id, task_id, user_id, user_name, role_id, role_name
      `,
      [
        taskId,
        assignmentInput.resourceAssignmentId,
        assignmentInput.userId,
        assignmentInput.userName,
        assignmentInput.roleId,
        assignmentInput.roleName,
        assignmentInput.plannedHours,
        assignmentInput.hourlyRate,
        plannedCost,
        allocationPercentage,
        assignmentInput.scheduledStartDate || null,
        assignmentInput.scheduledEndDate || null,
      ]
    );

    // Update task estimated cost
    await updateTaskEstimatedCost(taskId);

    await client.query('COMMIT');

    // Return calculated cost
    return {
      assignmentId: upsertResult.rows[0].id,
      taskId,
      userId: assignmentInput.userId,
      userName: assignmentInput.userName,
      roleId: assignmentInput.roleId || '',
      roleName: assignmentInput.roleName || '',
      plannedHours: assignmentInput.plannedHours,
      hourlyRate: assignmentInput.hourlyRate,
      allocationPercentage,
      effectiveHours,
      plannedCost,
      actualHours: 0,
      actualCost: 0,
      overtimeHours: 0,
      overtimeRate: 0,
      overtimeCost: 0,
      hoursVariance: 0,
      costVariance: 0,
      scheduledStartDate: assignmentInput.scheduledStartDate?.toISOString(),
      scheduledEndDate: assignmentInput.scheduledEndDate?.toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('upsertTaskAssignmentWithCost error:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Calculate cost impact of changing an assignment
 */
export async function calculateAssignmentCostImpact(
  assignmentId: string,
  changes: {
    plannedHours?: number;
    hourlyRate?: number;
    allocationPercentage?: number;
  }
): Promise<{
  currentCost: number;
  newCost: number;
  costDifference: number;
  percentageChange: number;
}> {
  try {
    // Get current assignment
    const current = await pool.query(
      `
      SELECT
        planned_hours,
        hourly_rate,
        allocation_percentage,
        planned_cost
      FROM task_assignments
      WHERE id = $1
      `,
      [assignmentId]
    );

    if (current.rows.length === 0) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    const row = current.rows[0];

    const currentCost = parseFloat(row.planned_cost) || 0;

    // Calculate new cost
    const newHours = changes.plannedHours !== undefined ? changes.plannedHours : row.planned_hours;
    const newRate = changes.hourlyRate !== undefined ? changes.hourlyRate : row.hourly_rate;
    const newAllocation = changes.allocationPercentage !== undefined ? changes.allocationPercentage : row.allocation_percentage;

    const effectiveHours = (newHours * newAllocation) / 100;
    const newCost = effectiveHours * newRate;

    const costDifference = newCost - currentCost;
    const percentageChange = currentCost > 0 ? (costDifference / currentCost) * 100 : 0;

    return {
      currentCost,
      newCost,
      costDifference,
      percentageChange,
    };
  } catch (err) {
    logger.error('calculateAssignmentCostImpact error:', err);
    throw err;
  }
}
