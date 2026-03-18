import { Pool, PoolClient, QueryResult } from 'pg';
import { pool } from '../../database/connection';

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  framework?: string;
  status?: string;
  priority?: string;
  program_id?: string | null;
  owner_id: string;
  team_members: string; // JSON string
  company_id?: string | null;
  correlation_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class ProjectRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Helper to get a generic client from the pool.
   */
  async getClient(): Promise<PoolClient> {
    return this.db.connect();
  }

  /**
   * Executes a callback within a transaction.
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a project by ID with owner and program details.
   */
  async findById(id: string): Promise<QueryResult<any>> {
    return this.db.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email,
              pr.name as program_name, pg.portfolio_name
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN programs pr ON p.program_id = pr.id
       LEFT JOIN portfolio_governance pg ON pr.portfolio_id = pg.id
       WHERE p.id = $1`,
      [id]
    );
  }

  /**
   * Retrieves all projects with complex filtering and activity tracking.
   */
  async findAll(options: {
    limit: number;
    offset: number;
    userId: string;
    isSuperAdmin: boolean;
    userCompanyId: string | null;
    status?: any;
    framework?: any;
    search?: any;
  }): Promise<QueryResult<any>> {
    const { limit, offset, userId, isSuperAdmin, userCompanyId, status, framework, search } = options;

    let query = `
      SELECT p.*, u.name as owner_name, u.email as owner_email,
             COUNT(d.id) as document_count,
             MAX(d.updated_at) as last_document_activity,
             GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (!isSuperAdmin && userCompanyId) {
      paramCount++;
      query += ` AND p.company_id = $${paramCount}`;
      params.push(userCompanyId);
    } else if (!isSuperAdmin) {
      paramCount++;
      query += ` AND (p.owner_id = $${paramCount} OR p.team_members ? $${paramCount}::text)`;
      params.push(userId);
    }

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (framework) {
      paramCount++;
      query += ` AND p.framework = $${paramCount}`;
      params.push(framework);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.id, u.name, u.email ORDER BY last_activity DESC NULLS LAST, p.name ASC, p.id ASC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    try {
      return await this.db.query(query, params);
    } catch (err: any) {
      if (err.message?.includes('column "company_id"') || err.code === '42703') {
        // Fallback for missing company_id column
        let fallbackQuery = `
          SELECT p.*, u.name as owner_name, u.email as owner_email,
                 COUNT(d.id) as document_count,
                 MAX(d.updated_at) as last_document_activity,
                 GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
          FROM projects p
          LEFT JOIN users u ON p.owner_id = u.id
          LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
          WHERE 1=1
        `;
        const fallbackParams: any[] = [];
        let fbParamCount = 0;

        if (!isSuperAdmin) {
          fbParamCount++;
          fallbackQuery += ` AND (p.owner_id = $${fbParamCount} OR p.team_members ? $${fbParamCount}::text)`;
          fallbackParams.push(userId);
        }

        if (status) {
          fbParamCount++;
          fallbackQuery += ` AND p.status = $${fbParamCount}`;
          fallbackParams.push(status);
        }

        if (framework) {
          fbParamCount++;
          fallbackQuery += ` AND p.framework = $${fbParamCount}`;
          fallbackParams.push(framework);
        }

        if (search) {
          fbParamCount++;
          fallbackQuery += ` AND (p.name ILIKE $${fbParamCount} OR p.description ILIKE $${fbParamCount})`;
          fallbackParams.push(`%${search}%`);
        }

        fallbackQuery += ` GROUP BY p.id, u.name, u.email ORDER BY last_activity DESC NULLS LAST, p.name ASC, p.id ASC`;
        fbParamCount++;
        fallbackQuery += ` LIMIT $${fbParamCount}`;
        fallbackParams.push(limit);
        fbParamCount++;
        fallbackQuery += ` OFFSET $${fbParamCount}`;
        fallbackParams.push(offset);

        return await this.db.query(fallbackQuery, fallbackParams);
      }
      throw err;
    }
  }

  /**
   * Creates a new project.
   */
  async create(data: ProjectData): Promise<QueryResult<ProjectData>> {
    return this.db.query(
      `INSERT INTO projects (id, name, description, framework, status, priority, program_id, owner_id, team_members, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [data.id, data.name, data.description, data.framework, data.status, data.priority, data.program_id, data.owner_id, data.team_members, data.correlation_id]
    );
  }

  /**
   * Updates an existing project.
   */
  async update(id: string, data: Partial<ProjectData>): Promise<QueryResult<ProjectData>> {
    const fields = [];
    const params = [id];
    let count = 2;

    if (data.name !== undefined) { fields.push(`name = $${count++}`); params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${count++}`); params.push(data.description); }
    if (data.framework !== undefined) { fields.push(`framework = $${count++}`); params.push(data.framework); }
    if (data.status !== undefined) { fields.push(`status = $${count++}`); params.push(data.status); }
    if (data.priority !== undefined) { fields.push(`priority = $${count++}`); params.push(data.priority); }
    if (data.team_members !== undefined) { fields.push(`team_members = $${count++}`); params.push(data.team_members); }
    if (data.correlation_id !== undefined) { fields.push(`correlation_id = $${count++}`); params.push(data.correlation_id); }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
    return this.db.query(query, params);
  }

  /**
   * Deletes a project.
   */
  async delete(id: string): Promise<QueryResult<any>> {
    return this.db.query('DELETE FROM projects WHERE id = $1', [id]);
  }

  /**
   * Gets the owner ID of a project.
   */
  async getOwnerId(id: string): Promise<string | null> {
    const result = await this.db.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    return result.rows[0]?.owner_id || null;
  }
}
