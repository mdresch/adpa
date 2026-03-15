import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface CompanyData {
  id?: string;
  name: string;
  domain?: string;
  logo_url?: string;
  metadata?: any;
  is_active?: boolean;
}

export class CompanyRepository {
  private logger = childLogger({ component: 'CompanyRepository' });

  constructor(private pool: Pool) {}

  async findAll(options: {
    limit: number;
    offset: number;
    search?: string;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let query = `SELECT * FROM companies WHERE 1=1`;
    let paramCount = 0;

    if (options.search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${options.search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(options.limit, options.offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async count(options: { search?: string }, client?: PoolClient) {
    const db = client || this.pool;
    let query = `SELECT COUNT(*) FROM companies WHERE 1=1`;
    const params: any[] = [];
    if (options.search) {
      query += ` AND name ILIKE $1`;
      params.push(`%${options.search}%`);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create(data: CompanyData, client?: PoolClient) {
    const db = client || this.pool;
    const id = data.id || require('uuid').v4();
    const query = `
      INSERT INTO companies (id, name, domain, logo_url, metadata, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      id, data.name, data.domain, data.logo_url, 
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.is_active ?? true
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<CompanyData>, client?: PoolClient) {
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
      UPDATE companies 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query('DELETE FROM companies WHERE id = $1', [id]);
  }
}
