import { Pool, PoolClient, QueryResult } from 'pg';
import { pool } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentData {
  id?: string;
  project_id: string;
  name: string;
  content: string;
  template_id?: string | null;
  status?: string;
  created_by?: string;
  updated_by?: string;
  word_count?: number;
  character_count?: number;
  version?: string | number;
  semantic_version?: string;
  template_version?: string | null;
  template_author?: string | null;
  template_framework?: string | null;
  template_category?: string | null;
  template_complexity?: string | null;
  template_metadata?: any;
  generation_metadata?: any;
  confluence_page_url?: string | null;
  correlation_id?: string;
}

export class DocumentRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async getClient(): Promise<PoolClient> {
    return this.db.connect();
  }

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
   * Finds a document by ID with creator, updater, project, and template details.
   */
  async findById(id: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      `
      SELECT d.*, u.name as created_by_name, u2.name as updated_by_name,
             p.name as project_name, t.name as template_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `,
      [id]
    );
  }

  /**
   * Retrieves documents for a specific project with filtering and pagination.
   */
  async findByProjectId(projectId: string, options: {
    limit: number;
    offset: number;
    status?: string;
    search?: string;
    template?: string;
    framework?: string;
    grade?: string;
  }, client?: PoolClient): Promise<{ rows: any[], total: number }> {
    const db = client || this.db;
    const { limit, offset, status, search, template, framework, grade } = options;

    let query = `
      SELECT d.*, 
             u.name as created_by_name, 
             u2.name as updated_by_name,
             t.name as template_name,
             t.framework as template_framework
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 AND d.deleted_at IS NULL AND d.parent_document_id IS NULL
    `;

    const params: any[] = [projectId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND d.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    if (template) {
      paramCount++;
      query += ` AND t.name = $${paramCount}`;
      params.push(template);
    }

    if (framework) {
      paramCount++;
      query += ` AND t.framework = $${paramCount}`;
      params.push(framework);
    }

    if (grade) {
      if (grade === 'not_audited') {
        query += ` AND d.quality_score IS NULL`;
      } else if (grade === 'A') {
        query += ` AND d.quality_score >= 90`;
      } else if (grade === 'B') {
        query += ` AND d.quality_score >= 80 AND d.quality_score < 90`;
      } else if (grade === 'C') {
        query += ` AND d.quality_score >= 70 AND d.quality_score < 80`;
      } else if (grade === 'D') {
        query += ` AND d.quality_score >= 60 AND d.quality_score < 70`;
      } else if (grade === 'F') {
        query += ` AND d.quality_score < 60 AND d.quality_score IS NOT NULL`;
      }
    }

    const dataQuery = query + ` ORDER BY d.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    const dataParams = [...params, limit, offset];

    const result = await db.query(dataQuery, dataParams);

    // Count query
    let countQuery = `
      SELECT COUNT(*) 
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 AND d.deleted_at IS NULL AND d.parent_document_id IS NULL
    `;
    
    // Append the same filters to count query (excluding grade logic which needs refinement if complex)
    if (status) countQuery += ` AND d.status = $2`; // Note: simple reconstruction for count
    if (search) countQuery += ` AND d.name ILIKE $${status ? 3 : 2}`;
    // ... for simplicity of extraction, I'll use a more robust way if needed, 
    // but legacy code reconstructed it manually.

    // Better: Re-use the filters from the main query but replace SELECT
    const filterIndex = query.indexOf('WHERE');
    const filterPart = query.substring(filterIndex);
    const finalCountQuery = `SELECT COUNT(*) FROM documents d LEFT JOIN templates t ON d.template_id = t.id ` + filterPart;
    
    const countResult = await db.query(finalCountQuery, params);
    const total = parseInt(countResult.rows[0].count);

    return { rows: result.rows, total };
  }

  /**
   * Retrieves document statistics for a project.
   */
  async getStats(projectId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'published') as published_documents,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_documents,
        COUNT(*) FILTER (WHERE status = 'review') as review_documents,
        SUM(word_count) as total_word_count,
        AVG(quality_score) as average_quality_score
      FROM documents
      WHERE project_id = $1 AND deleted_at IS NULL
      `,
      [projectId]
    );
  }

  /**
   * Retrieves soft-deleted documents for a project.
   */
  async findDeletedByProjectId(projectId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      `
      SELECT *
      FROM documents_deleted
      WHERE project_id = $1
      ORDER BY deleted_at DESC
      `,
      [projectId]
    );
  }

  /**
   * Creates a new document.
   */
  async create(data: DocumentData, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    const id = data.id || uuidv4();
    
    return db.query(
      `
      INSERT INTO documents (
        id, project_id, name, content, template_id, status, created_by, updated_by, 
        word_count, character_count, version, semantic_version,
        template_version, template_author, template_framework, template_category, 
        template_complexity, template_metadata, generation_metadata, correlation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
      `,
      [
        id, data.project_id, data.name, data.content, data.template_id || null, 
        data.status || 'draft', data.created_by, data.updated_by || data.created_by,
        data.word_count || 0, data.character_count || 0, data.version || 1, data.semantic_version || '1.0.0',
        data.template_version || null, data.template_author || null, data.template_framework || null,
        data.template_category || null, data.template_complexity || null,
        data.template_metadata ? JSON.stringify(data.template_metadata) : null,
        data.generation_metadata ? JSON.stringify(data.generation_metadata) : null,
        data.correlation_id
      ]
    );
  }

  /**
   * Updates an existing document.
   */
  async update(id: string, data: Partial<DocumentData>, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    
    const fields = Object.keys(data).filter(key => data[key as keyof DocumentData] !== undefined);
    if (fields.length === 0) {
      return db.query('SELECT * FROM documents WHERE id = $1', [id]);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const params = fields.map(field => {
      const value = data[field as keyof DocumentData];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    
    params.push(id);
    const query = `UPDATE documents SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`;
    
    return db.query(query, params);
  }

  /**
   * Soft deletes a document.
   */
  async softDelete(id: string, userId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query("SELECT soft_delete_document($1, $2) as deleted", [id, userId]);
  }

  /**
   * Restores a soft-deleted document.
   */
  async restore(id: string, userId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query("SELECT restore_document($1, $2) as restored", [id, userId]);
  }

  /**
   * Permanently deletes a document.
   */
  async hardDelete(id: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query("DELETE FROM documents WHERE id = $1", [id]);
  }

  /**
   * Retrieves version history for a document.
   */
  async getVersions(id: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      `
      SELECT dv.*, u.name as author_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.author_id = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.created_at DESC
      `,
      [id]
    );
  }

  /**
   * Saves a version snapshot.
   */
  async saveVersion(data: {
    document_id: string;
    version: string | number;
    semantic_version: string;
    content: string;
    author_id: string;
    change_type: string;
    change_description: string;
    generation_metadata?: any;
  }, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      `
      INSERT INTO document_versions 
      (id, document_id, version, semantic_version, content, author_id, created_at, change_type, change_description, generation_metadata)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
      ON CONFLICT (document_id, version) DO NOTHING
      RETURNING *
      `,
      [
        uuidv4(), data.document_id, data.version, data.semantic_version, 
        data.content, data.author_id, data.change_type, 
        data.change_description, data.generation_metadata ? JSON.stringify(data.generation_metadata) : null
      ]
    );
  }

  /**
   * Retrieves quality audit for a document.
   */
  async getQualityAudit(documentId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      "SELECT * FROM document_quality_audits WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1",
      [documentId]
    );
  }

  /**
   * Retrieves summaries for a document.
   */
  async getSummaries(documentId: string, client?: PoolClient): Promise<QueryResult<any>> {
    const db = client || this.db;
    return db.query(
      "SELECT * FROM document_summaries WHERE document_id = $1 ORDER BY level ASC",
      [documentId]
    );
  }

  /**
   * Increments template usage count.
   */
  async incrementTemplateUsage(templateId: string, client?: PoolClient): Promise<void> {
    const db = client || this.db;
    await db.query(
      `UPDATE templates 
       SET usage_count = usage_count + 1,
           last_used_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [templateId]
    );
  }

  /**
   * Tracks template usage in usage table.
   */
  async trackTemplateUsage(data: {
    template_id: string, 
    document_id: string, 
    user_id: string, 
    project_id: string, 
    word_count: number
  }, client?: PoolClient): Promise<void> {
    const db = client || this.db;
    await db.query(`
      INSERT INTO template_usage (
        template_id, document_id, user_id, project_id, 
        used_at, word_count, success
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, true)
    `, [data.template_id, data.document_id, data.user_id, data.project_id, data.word_count]);
  }
}
