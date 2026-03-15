import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface UserData {
  id?: string;
  email: string;
  password_hash?: string;
  name: string;
  role: string;
  is_active?: boolean;
  avatar_url?: string;
  timezone?: string;
  date_format?: string;
  metadata?: any;
  company_id?: string | null;
  permissions?: any;
}

export class UserRepository {
  private logger = childLogger({ component: 'UserRepository' });

  constructor(private pool: Pool) {}

  async findAll(options: {
    limit: number;
    offset: number;
    role?: string;
    search?: string;
    is_active?: boolean;
    company_id?: string | null;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let paramCount = 0;

    let query = `
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.avatar_url, u.last_login, u.timezone, u.date_format, u.created_at, u.updated_at, u.metadata, u.company_id, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;

    if (options.company_id) {
      paramCount++;
      query += ` AND u.company_id = $${paramCount}`;
      params.push(options.company_id);
    }

    if (options.role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(options.role);
    }

    if (options.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(options.is_active);
    }

    if (options.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${options.search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(options.limit, options.offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async count(options: {
    role?: string;
    search?: string;
    is_active?: boolean;
    company_id?: string | null;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const params: any[] = [];
    let paramCount = 0;

    let query = `SELECT COUNT(*) FROM users u WHERE 1=1`;

    if (options.company_id) {
      paramCount++;
      query += ` AND u.company_id = $${paramCount}`;
      params.push(options.company_id);
    }

    if (options.role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(options.role);
    }

    if (options.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(options.is_active);
    }

    if (options.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${options.search}%`);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async findByEmail(email: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async create(data: UserData, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      INSERT INTO users (id, email, password_hash, name, role, is_active, metadata, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, name, role, is_active, created_at, metadata, company_id
    `;
    const id = data.id || require('uuid').v4();
    const values = [
      id, data.email, data.password_hash, data.name, data.role || 'user', 
      data.is_active ?? true, data.metadata ? JSON.stringify(data.metadata) : null,
      data.company_id || null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<UserData>, client?: PoolClient) {
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
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
