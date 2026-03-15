import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export class PlaybookRepository {
  private logger = childLogger({ component: 'PlaybookRepository' });

  constructor(private pool: Pool) {}

  async findPlaybooks(filters: any, client?: PoolClient) {
    const db = client || this.pool;
    let query = `
      SELECT 
        p.*,
        u.name as created_by_name
      FROM operational_playbooks p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.project_id) {
      query += ` AND p.project_id = $${paramIndex++}`;
      params.push(filters.project_id);
    }

    if (filters.category && filters.category.length > 0) {
      query += ` AND p.category = ANY($${paramIndex++})`;
      params.push(filters.category);
    }

    if (filters.trigger_type && filters.trigger_type.length > 0) {
      query += ` AND p.trigger_type = ANY($${paramIndex++})`;
      params.push(filters.trigger_type);
    }

    if (filters.is_active !== undefined) {
      query += ` AND p.is_active = $${paramIndex++}`;
      params.push(filters.is_active);
    }

    if (filters.search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async findExecutions(filters: any, client?: PoolClient) {
    const db = client || this.pool;
    let query = `
      SELECT 
        e.*,
        p.title as playbook_title,
        p.category as playbook_category
      FROM playbook_executions e
      LEFT JOIN operational_playbooks p ON e.playbook_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.playbook_id) {
      query += ` AND e.playbook_id = $${paramIndex++}`;
      params.push(filters.playbook_id);
    }

    if (filters.project_id) {
      query += ` AND e.playbook_id IN (SELECT id FROM operational_playbooks WHERE project_id = $${paramIndex++})`;
      params.push(filters.project_id);
    }

    if (filters.status && filters.status.length > 0) {
      query += ` AND e.status = ANY($${paramIndex++})`;
      params.push(filters.status);
    }

    query += ` ORDER BY e.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }
}
