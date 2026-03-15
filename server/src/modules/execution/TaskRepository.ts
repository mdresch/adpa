import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface TaskData {
  id?: string;
  projectId: string;
  taskName: string;
  description?: string;
  estimatedHours?: number;
  actualHours?: number;
  requiredRoleId?: string;
  plannedStartDate?: Date | string;
  plannedEndDate?: Date | string;
  priority?: string;
  phase?: string;
  status?: string;
  percentComplete?: number;
  parentTaskId?: string;
  createdBy: string;
}

export class TaskRepository {
  private logger = childLogger({ component: 'TaskRepository' });

  constructor(private pool: Pool) {}

  async findAllByProject(projectId: string, filters: any = {}, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [projectId];
    let query = `SELECT * FROM project_tasks WHERE project_id = $1`;

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    if (filters.assignedToUserId) {
      params.push(filters.assignedToUserId);
      query += ` AND assigned_to_user_id = $${params.length}`;
    }

    query += ` ORDER BY planned_start_date ASC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM project_tasks WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create(data: TaskData, client?: PoolClient) {
    const db = client || this.pool;
    const id = data.id || require('uuid').v4();
    const query = `
      INSERT INTO project_tasks (
        id, project_id, task_name, description, estimated_hours, 
        required_role_id, planned_start_date, planned_end_date, 
        priority, phase, parent_task_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      id, data.projectId, data.taskName, data.description, data.estimatedHours,
      data.requiredRoleId, data.plannedStartDate, data.plannedEndDate,
      data.priority || 'medium', data.phase, data.parentTaskId, data.createdBy
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<TaskData>, client?: PoolClient) {
    const db = client || this.pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      // Map JS camelCase to DB snake_case if necessary
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (value !== undefined) {
        fields.push(`${dbKey} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id, db as PoolClient);

    values.push(id);
    const query = `UPDATE project_tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query('DELETE FROM project_tasks WHERE id = $1', [id]);
  }
}
