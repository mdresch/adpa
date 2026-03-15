import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface PortfolioData {
  id?: string;
  company_id?: string | null;
  portfolio_name: string;
  description?: string | null;
  owner_id?: string | null;
  portfolio_lead?: string | null;
  status: 'active' | 'archived' | 'paused';
  budget?: number | null;
  budget_currency?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  last_risk_review_at?: Date | string | null;
  next_risk_review_due?: Date | string | null;
  risk_review_notes?: string | null;
  created_by?: string | null;
}

export class PortfolioRepository {
  private logger = childLogger({ component: 'PortfolioRepository' });

  constructor(private pool: Pool) {}

  async findAll(options: {
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, client?: PoolClient) {
    const db = client || this.pool;
    const {
      status,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    let query = `
      SELECT 
        p.*,
        c.name as company_name,
        u1.name as owner_name,
        u2.name as lead_name,
        u3.name as created_by_name,
        COUNT(DISTINCT pr.id) as risk_count
      FROM portfolio_governance p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.portfolio_lead = u2.id
      LEFT JOIN users u3 ON p.created_by = u3.id
      LEFT JOIN portfolio_risks pr ON pr.portfolio_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    query += ` GROUP BY p.id, c.name, u1.name, u2.name, u3.name`;

    // Sorting
    const allowedSortColumns = ['portfolio_name', 'status', 'budget', 'created_at', 'start_date', 'end_date'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY p.${sortColumn} ${order}`;

    // Pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);
    
    // Total count
    let countQuery = 'SELECT COUNT(*) as total FROM portfolio_governance WHERE 1=1';
    const countParams: any[] = [];
    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $1`;
    }
    const countResult = await db.query(countQuery, countParams);

    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async findById(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT 
        p.*,
        u1.name as owner_name,
        u2.name as lead_name,
        u3.name as created_by_name,
        COUNT(DISTINCT pr.id) as risk_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.severity = 'critical') as critical_risk_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.severity = 'high') as high_risk_count
      FROM portfolio_governance p
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.portfolio_lead = u2.id
      LEFT JOIN users u3 ON p.created_by = u3.id
      LEFT JOIN portfolio_risks pr ON pr.portfolio_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u1.name, u2.name, u3.name
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async create(data: PortfolioData, client?: PoolClient) {
    const db = client || this.pool;
    const id = data.id || require('uuid').v4();
    const query = `
      INSERT INTO portfolio_governance (
        id, portfolio_name, description, company_id, owner_id, portfolio_lead,
        status, budget, budget_currency, start_date, end_date,
        last_risk_review_at, next_risk_review_due, risk_review_notes,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING *
    `;
    const values = [
      id, data.portfolio_name, data.description, data.company_id, data.owner_id, data.portfolio_lead,
      data.status || 'active', data.budget, data.budget_currency, data.start_date, data.end_date,
      data.last_risk_review_at, data.next_risk_review_due, data.risk_review_notes,
      data.created_by
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<PortfolioData>, client?: PoolClient) {
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
    const query = `UPDATE portfolio_governance SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async softDelete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    await db.query(`UPDATE portfolio_governance SET status = 'archived', updated_at = NOW() WHERE id = $1`, [id]);
  }

  async getRisks(portfolioId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT 
        pr.*,
        u.name as owner_name
      FROM portfolio_risks pr
      LEFT JOIN users u ON pr.owner_id = u.id
      WHERE pr.portfolio_id = $1
      ORDER BY 
        CASE pr.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        pr.created_at DESC
    `;
    const result = await db.query(query, [portfolioId]);
    return result.rows;
  }
}
