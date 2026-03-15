import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface ProgramData {
  id?: string;
  name: string;
  description?: string;
  budget?: number;
  currency?: string;
  start_date: Date | string;
  end_date: Date | string;
  status?: 'green' | 'amber' | 'red';
  owner_id: string;
  created_by: string;
}

export class ProgramRepository {
  private logger = childLogger({ component: 'ProgramRepository' });

  constructor(private pool: Pool) {}

  async findAll(options: {
    limit?: number;
    offset?: number;
    ownerId?: string;
    status?: string;
    search?: string;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let query = `SELECT * FROM programs WHERE 1=1`;

    if (options.ownerId) {
      params.push(options.ownerId);
      query += ` AND owner_id = $${params.length}`;
    }

    if (options.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }

    if (options.search) {
      params.push(`%${options.search}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;

    if (options.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM programs WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create(data: ProgramData, client?: PoolClient) {
    const db = client || this.pool;
    const id = data.id || require('uuid').v4();
    const query = `
      INSERT INTO programs (id, name, description, budget, currency, start_date, end_date, status, owner_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      id, data.name, data.description, data.budget, data.currency || 'USD',
      data.start_date, data.end_date, data.status || 'green',
      data.owner_id, data.created_by
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<ProgramData>, client?: PoolClient) {
    const db = client || this.pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id, db as PoolClient);

    values.push(id);
    const query = `UPDATE programs SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query('DELETE FROM programs WHERE id = $1', [id]);
  }
}
