import { Request, Response } from 'express';
import { TaskCostRepository } from './TaskCostRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class TaskCostController {
  private repository = new TaskCostRepository(pool);
  private logger = childLogger({ component: 'TaskCostController' });

  getTaskBreakdown = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const breakdown = await this.calculateTaskBreakdown(taskId);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      this.logger.error("Get task cost breakdown error:", error);
      res.status(500).json({ success: false, error: "Failed to calculate task cost breakdown" });
    }
  };

  getResourceCost = async (req: Request, res: Response) => {
    try {
      const { assignmentId } = req.params;
      const assignment = await this.repository.findAssignmentById(assignmentId);
      if (!assignment) return res.status(404).json({ success: false, error: "Assignment not found" });

      const effectiveHours = (assignment.planned_hours * assignment.allocation_percentage) / 100;
      const plannedCost = effectiveHours * assignment.hourly_rate;

      res.json({
        success: true,
        data: {
          assignmentId: assignment.id,
          effectiveHours,
          plannedCost,
          actualHours: assignment.actual_hours,
          actualCost: assignment.actual_cost,
          costVariance: assignment.actual_cost - plannedCost
        }
      });
    } catch (error) {
      this.logger.error("Get resource cost error:", error);
      res.status(500).json({ success: false, error: "Failed to calculate resource cost" });
    }
  };

  getProjectTasksCosts = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const taskIds = await this.repository.findProjectTaskIds(projectId);
      const breakdowns = [];
      
      for (const id of taskIds) {
        try {
          const b = await this.calculateTaskBreakdown(id);
          breakdowns.push(b);
        } catch (e) {
          this.logger.warn(`Failed to get cost breakdown for task ${id}`, e);
        }
      }

      const totals = {
        taskCount: breakdowns.length,
        plannedTotalCost: breakdowns.reduce((sum, t) => sum + t.plannedTotalCost, 0),
        actualTotalCost: breakdowns.reduce((sum, t) => sum + t.actualTotalCost, 0),
        varianceCost: breakdowns.reduce((sum, t) => sum + t.costVariance, 0),
        plannedTotalHours: breakdowns.reduce((sum, t) => sum + t.plannedTotalHours, 0),
        actualTotalHours: breakdowns.reduce((sum, t) => sum + t.actualTotalHours, 0),
      };

      res.json({ success: true, data: { tasks: breakdowns, totals } });
    } catch (error) {
      this.logger.error("Get project tasks costs error:", error);
      res.status(500).json({ success: false, error: "Failed to calculate project task costs" });
    }
  };

  calculateImpact = async (req: Request, res: Response) => {
    try {
      const { assignmentId } = req.params;
      const { plannedHours, hourlyRate, allocationPercentage } = req.body;

      const current = await this.repository.findAssignmentById(assignmentId);
      if (!current) return res.status(404).json({ success: false, error: "Assignment not found" });

      const currentCost = parseFloat(current.planned_cost) || 0;
      const newHours = plannedHours !== undefined ? plannedHours : current.planned_hours;
      const newRate = hourlyRate !== undefined ? hourlyRate : current.hourly_rate;
      const newAllocation = allocationPercentage !== undefined ? allocationPercentage : current.allocation_percentage;

      const effectiveHours = (newHours * newAllocation) / 100;
      const newCost = effectiveHours * newRate;

      res.json({
        success: true,
        data: {
          currentCost,
          newCost,
          costDifference: newCost - currentCost,
          percentageChange: currentCost > 0 ? ((newCost - currentCost) / currentCost) * 100 : 0
        }
      });
    } catch (error) {
      this.logger.error("Calculate cost impact error:", error);
      res.status(500).json({ success: false, error: "Failed to calculate cost impact" });
    }
  };

  upsertAssignment = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { taskId } = req.params;
      const { resourceAssignmentId, userId, userName, roleId, roleName, plannedHours, hourlyRate, allocationPercentage = 100, scheduledStartDate, scheduledEndDate } = req.body;

      const effectiveHours = (plannedHours * allocationPercentage) / 100;
      const plannedCost = effectiveHours * hourlyRate;

      const result = await this.repository.upsertAssignment(taskId, {
        resourceAssignmentId, userId, userName, roleId, roleName,
        plannedHours, hourlyRate, plannedCost, allocationPercentage,
        scheduledStartDate, scheduledEndDate
      }, client);

      // Update task total cost
      const assignments = await this.repository.findTaskAssignments(taskId, client);
      const totalPlannedCost = assignments.reduce((sum: number, a: any) => sum + parseFloat(a.planned_cost), 0);
      await this.repository.updateTaskCost(taskId, totalPlannedCost, client);

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error("Upsert assignment error:", error);
      res.status(500).json({ success: false, error: "Failed to create/update task assignment" });
    } finally {
      client.release();
    }
  };

  private async calculateTaskBreakdown(taskId: string) {
    const task = await this.repository.findTaskById(taskId);
    if (!task) throw new Error("Task not found");

    const assignments = await this.repository.findTaskAssignments(taskId);
    
    const resourceCosts = [];
    let plannedTotalHours = 0;
    let plannedTotalCost = 0;
    let actualTotalHours = 0;
    let actualTotalCost = 0;
    let totalOvertimeHours = 0;
    let totalOvertimeCost = 0;
    const costByCategory = new Map();

    for (const row of assignments) {
      const effectiveHours = (row.planned_hours * row.allocation_percentage) / 100;
      const plannedCost = effectiveHours * row.hourly_rate;
      
      resourceCosts.push({
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
        hoursVariance: row.actual_hours - effectiveHours,
        costVariance: row.actual_cost - plannedCost,
      });

      plannedTotalHours += effectiveHours;
      plannedTotalCost += plannedCost;
      actualTotalHours += parseFloat(row.actual_hours);
      actualTotalCost += parseFloat(row.actual_cost);
      totalOvertimeHours += parseFloat(row.overtime_hours);
      totalOvertimeCost += parseFloat(row.overtime_cost);

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

    return {
      taskId: task.id,
      taskName: task.task_name,
      projectId: task.project_id,
      plannedTotalHours,
      plannedTotalCost,
      actualTotalHours,
      actualTotalCost,
      totalOvertimeHours,
      totalOvertimeCost,
      hoursVariance: actualTotalHours - plannedTotalHours,
      costVariance: actualTotalCost - plannedTotalCost,
      variancePercentage: plannedTotalCost > 0 ? ((actualTotalCost - plannedTotalCost) / plannedTotalCost) * 100 : 0,
      resourceCount: resourceCosts.length,
      resources: resourceCosts,
      costByCategory: Array.from(costByCategory.values()),
      status: task.status,
      percentComplete: task.percent_complete
    };
  }
}
