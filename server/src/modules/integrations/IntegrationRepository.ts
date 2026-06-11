import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface IntegrationData {
  id?: string;
  name: string;
  type: string;
  configuration: any;
  credentials_encrypted: string;
  is_active?: boolean;
  created_by?: string;
}

export class IntegrationRepository {
  private logger = childLogger({ component: 'IntegrationRepository' });

  constructor(private pool: Pool) {}

  async findAll(options: {
    limit: number;
    offset: number;
    type?: string;
    is_active?: boolean;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let paramCount = 0;

    let query = `
      SELECT i.*, u.name as created_by_name
      FROM integrations i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;

    if (options.type) {
      paramCount++;
      query += ` AND i.type = $${paramCount}`;
      params.push(options.type);
    }

    if (options.is_active !== undefined) {
      paramCount++;
      query += ` AND i.is_active = $${paramCount}`;
      params.push(options.is_active);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(options.limit, options.offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async count(options: {
    type?: string;
    is_active?: boolean;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let paramCount = 0;

    let query = "SELECT COUNT(*) FROM integrations i WHERE 1=1";

    if (options.type) {
      paramCount++;
      query += ` AND i.type = $${paramCount}`;
      params.push(options.type);
    }

    if (options.is_active !== undefined) {
      paramCount++;
      query += ` AND i.is_active = $${paramCount}`;
      params.push(options.is_active);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async findByType(type: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT i.*, u.name as created_by_name
      FROM integrations i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.type = $1
      ORDER BY i.is_active DESC, i.last_sync DESC NULLS LAST, i.updated_at DESC
    `;
    const result = await db.query(query, [type]);
    return result.rows;
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT i.*, u.name as created_by_name
      FROM integrations i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async create(data: IntegrationData, client?: PoolClient) {
    const db = client || this.pool;
    const id = data.id || require('uuid').v4();
    const query = `
      INSERT INTO integrations (id, name, type, configuration, credentials_encrypted, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, type, is_active, created_at, updated_at
    `;
    const values = [
      id, data.name, data.type, 
      JSON.stringify(data.configuration), 
      data.credentials_encrypted, 
      data.is_active ?? true, 
      data.created_by
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<IntegrationData>, client?: PoolClient) {
    const db = client || this.pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) return this.findById(id, db as PoolClient);

    values.push(id);
    const query = `
      UPDATE integrations 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id, name, type, is_active, last_sync, sync_status, created_at, updated_at
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query('DELETE FROM integrations WHERE id = $1', [id]);
  }
}
