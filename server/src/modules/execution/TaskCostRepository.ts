import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface TaskResourceCost {
  assignmentId: string;
  taskId: string;
  userId: string;
  userName: string;
  roleId: string;
  roleName: string;
  plannedHours: number;
  hourlyRate: number;
  allocationPercentage: number;
  effectiveHours: number;
  plannedCost: number;
  actualHours: number;
  actualCost: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeCost: number;
  hoursVariance: number;
  costVariance: number;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
}

export interface TaskCostBreakdown {
  taskId: string;
  taskName: string;
  projectId: string;
  plannedTotalHours: number;
  plannedTotalCost: number;
  actualTotalHours: number;
  actualTotalCost: number;
  totalOvertimeHours: number;
  totalOvertimeCost: number;
  hoursVariance: number;
  costVariance: number;
  variancePercentage: number;
  resourceCount: number;
  resources: TaskResourceCost[];
  costByCategory: {
    categoryName: string;
    categoryCode: string;
    amount: number;
    hoursCount: number;
  }[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string;
  percentComplete: number;
}

export class TaskCostRepository {
  private logger = childLogger({ component: 'TaskCostRepository' });

  constructor(private pool: Pool) {}

  async findTaskAssignments(taskId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
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
    `;
    const result = await db.query(query, [taskId]);
    return result.rows;
  }

  async findTaskById(taskId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT id, task_name, project_id, status, percent_complete,
             planned_start_date, planned_end_date, actual_start_date, actual_end_date
      FROM project_tasks
      WHERE id = $1
    `;
    const result = await db.query(query, [taskId]);
    return result.rows[0];
  }

  async findProjectTaskIds(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT id FROM project_tasks 
      WHERE project_id = $1 AND status != 'cancelled'
      ORDER BY planned_start_date, task_name
    `;
    const result = await db.query(query, [projectId]);
    return result.rows.map(r => r.id);
  }

  async upsertAssignment(taskId: string, data: any, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      INSERT INTO task_assignments (
        task_id, resource_assignment_id, user_id, user_name, role_id, role_name,
        planned_hours, hourly_rate, planned_cost, allocation_percentage,
        scheduled_start_date, scheduled_end_date
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
      RETURNING *
    `;
    const values = [
      taskId, data.resourceAssignmentId, data.userId, data.userName, data.roleId, data.roleName,
      data.plannedHours, data.hourlyRate, data.plannedCost, data.allocationPercentage,
      data.scheduledStartDate, data.scheduledEndDate
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async updateTaskCost(taskId: string, cost: number, client?: PoolClient) {
    const db = client || this.pool;
    await db.query(`UPDATE project_tasks SET estimated_cost = $1, updated_at = NOW() WHERE id = $2`, [cost, taskId]);
  }

  async findAssignmentById(assignmentId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `SELECT * FROM task_assignments WHERE id = $1`;
    const result = await db.query(query, [assignmentId]);
    return result.rows[0];
  }
}
