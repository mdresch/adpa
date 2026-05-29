import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';
import {
  getAllowedEntityTableName,
  quotedEntityTableName,
} from './entityTypeTables';

export class AnalysisRepository {
  private logger = childLogger({ component: 'AnalysisRepository' });

  constructor(private pool: Pool) {}

  /**
   * Create a new background job
   */
  async createJob(data: {
    type: string;
    status: string;
    data: any;
    created_by?: string;
    project_id?: string;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      INSERT INTO jobs (type, status, data, created_by, project_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.type, data.status, JSON.stringify(data.data), data.created_by, data.project_id];
    
    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string) {
    const result = await this.pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0];
  }

  /**
   * Update job status and progress
   */
  async updateJob(jobId: string, updates: {
    status?: string;
    progress?: number;
    result?: any;
    error_message?: string;
    completed_at?: Date;
    started_at?: Date;
  }, client?: PoolClient) {
    const db = client || this.pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(key === 'result' ? JSON.stringify(value) : value);
    });

    if (fields.length === 0) return null;

    values.push(jobId);
    const query = `
      UPDATE jobs 
      SET ${fields.join(', ')} 
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all active AI providers
   */
  async getActiveProviders() {
    const query = `
      SELECT id, name, provider_type, configuration, is_active, usage_stats, created_at, updated_at
      FROM ai_providers
      WHERE is_active = true
      ORDER BY priority ASC, name ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get provider by name
   */
  async getProviderByName(name: string) {
    const result = await this.pool.query(
      'SELECT * FROM ai_providers WHERE name = $1',
      [name]
    );
    return result.rows[0];
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: string) {
    const result = await this.pool.query(
      'SELECT * FROM ai_providers WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Create or update AI provider
   */
  async upsertProvider(provider: {
    id?: string;
    name: string;
    provider_type: string;
    api_key_encrypted: string;
    configuration: any;
    is_active?: boolean;
  }) {
    const query = `
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (name) DO UPDATE SET
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        configuration = EXCLUDED.configuration,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id, name, provider_type, is_active, created_at, updated_at
    `;
    const id = provider.id || require('uuid').v4();
    const values = [
      id,
      provider.name,
      provider.provider_type,
      provider.api_key_encrypted,
      JSON.stringify(provider.configuration),
      provider.is_active ?? true
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete provider by name
   */
  async deleteProvider(name: string) {
    const result = await this.pool.query(
      'DELETE FROM ai_providers WHERE name = $1 RETURNING name',
      [name]
    );
    return result.rowCount > 0;
  }

  /**
   * Toggle provider status
   */
  async toggleProviderStatus(id: string) {
    const result = await this.pool.query(
      'UPDATE ai_providers SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get AI generation history for a user
   */
  async getUserHistory(userId: string, limit: number, offset: number) {
    const query = `
      SELECT al.*, ap.name as provider_name, ap.provider_type
      FROM audit_logs al
      LEFT JOIN ai_providers ap ON al.resource_id::text = ap.id::text
      WHERE al.user_id = $1 AND al.action = 'ai_generate'
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get history count for a user
   */
  async getHistoryCount(userId: string) {
    const result = await this.pool.query(
      "SELECT COUNT(*) FROM audit_logs WHERE user_id = $1 AND action = 'ai_generate'",
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Log AI usage/audit
   */
  async logAudit(userId: string | null, action: string, resourceType: string, resourceId: string | null, details: any) {
    const query = `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    const values = [userId, action, resourceType, resourceId, JSON.stringify(details)];
    await this.pool.query(query, values);
  }

  /**
   * Get entity counts for a project across various tables
   */
  async getProjectEntityCounts(projectId: string, tables: { key: string, name: string }[]) {
    const counts: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const fromTable = quotedEntityTableName(table.name);
        const result = await this.pool.query(
          `SELECT COUNT(*) as count FROM ${fromTable} WHERE project_id = $1`,
          [projectId]
        );
        counts[table.key] = parseInt(result.rows[0].count) || 0;
      } catch (error) {
        this.logger.debug(`Table ${table.name} not found or query failed`, { error });
        counts[table.key] = 0;
      }
    }
    
    return counts;
  }

  /**
   * Fetch entities associated with a specific document.
   * Checks both direct document_id and source_document_ids array in entity_data.
   */
  async getEntitiesByDocument(documentId: string): Promise<any[]> {
    const query = `
      SELECT * FROM entity_extractions
      WHERE status != 'deleted'
      AND (
        document_id = $1
        OR entity_data->'source_document_ids' ? $1
      )
      ORDER BY entity_type ASC, extraction_confidence DESC
    `;
    
    const result = await this.pool.query(query, [documentId]);
    return result.rows;
  }

  /**
   * Fetch paginated entities by type for a project.
   */
  async getProjectEntitiesByType(
    projectId: string,
    entityType: string,
    options: { limit: number; offset: number }
  ): Promise<{ entities: any[]; total: number; tableName: string }> {
    const tableName = getAllowedEntityTableName(entityType);
    const quotedTable = quotedEntityTableName(tableName);

    // Fetch the entities. We select all columns. If there's a source_document_id, we can also try to get document names.
    // However, table schemas vary. A simple SELECT * is safest.
    const query = `
      SELECT *
      FROM ${quotedTable}
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${quotedTable}
      WHERE project_id = $1
    `;

    const [entitiesResult, countResult] = await Promise.all([
      this.pool.query(query, [projectId, options.limit, options.offset]),
      this.pool.query(countQuery, [projectId])
    ]);

    // Enhance with source document information if applicable
    const entities = entitiesResult.rows;
    const documentIds = [...new Set(entities.map(e => e.source_document_id).filter(Boolean))];

    if (documentIds.length > 0) {
      const docsQuery = `SELECT id, name FROM documents WHERE id = ANY($1)`;
      const docsResult = await this.pool.query(docsQuery, [documentIds]);
      const docMap = new Map(docsResult.rows.map(d => [d.id, d.name]));

      entities.forEach(e => {
        if (e.source_document_id && docMap.has(e.source_document_id)) {
          e.source_document_name = docMap.get(e.source_document_id);
        }
      });
    }

    return {
      entities,
      total: parseInt(countResult.rows[0].total, 10) || 0,
      tableName
    };
  }

  /**
   * Get document info for display
   */
  async getDocumentInfo(documentId: string) {
    const result = await this.pool.query(
      'SELECT id, name, project_id, generation_metadata FROM documents WHERE id = $1',
      [documentId]
    );
    return result.rows[0];
  }
}

