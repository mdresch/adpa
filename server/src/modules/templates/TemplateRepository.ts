import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

const JSONB_UPDATE_FIELDS = new Set([
  'content',
  'variables',
  'template_paragraphs',
  'gkg_context_strategy',
]);

export class TemplateRepository {
  private logger = childLogger({ component: 'TemplateRepository' });

  constructor(private pool: Pool) {}

  private normalizeJsonbUpdateValue(field: string, value: unknown) {
    if (value === null) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        if (field === 'content') return '{}';
        if (field === 'variables') return '[]';
        return null;
      }

      try {
        JSON.parse(trimmed);
        return trimmed;
      } catch {
        return JSON.stringify(value);
      }
    }

    return JSON.stringify(value);
  }

  async findTemplates(filters: any, isSuperAdmin: boolean, userCompanyId: string | null, userId: string, client?: PoolClient): Promise<any[]> {
    const db = client || this.pool;
    
    let query = `
      SELECT 
        t.*, 
        u.name as created_by_name,
        c.name as company_name,
        CASE 
          WHEN t.validation_count = 0 THEN 0
          ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
        END as success_rate,
        CASE
          WHEN t.validation_count = 0 THEN 'Not tested yet'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.90 THEN 'Excellent'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.75 THEN 'Good'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.50 THEN 'Fair'
          ELSE 'Needs Improvement'
        END as health_rating,
        tep.avg_entity_counts,
        tep.knowledge_domain_coverage,
        tep.performance_domain_coverage,
        tep.primary_knowledge_domain,
        tep.secondary_knowledge_domains,
        tep.primary_performance_domain
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN template_entity_profile tep ON tep.template_id = t.id
      WHERE t.deleted_at IS NULL
        AND (t.development_status IS NULL OR t.development_status != 'archived')
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (!isSuperAdmin) {
      query += ` AND (
          t.template_scope = 'standard'
          OR
          (t.template_scope = 'company' AND t.company_id = $${paramCount + 1})
          OR
          (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $${paramCount + 2}))
        )`;
      params.push(userCompanyId, userId);
      paramCount = 2;
    }

    if (filters.framework) {
      paramCount++;
      query += ` AND t.framework = $${paramCount}`;
      params.push(filters.framework);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.is_public !== undefined) {
      paramCount++;
      query += ` AND t.is_public = $${paramCount}`;
      params.push(filters.is_public);
    }

    if (filters.template_scope && filters.template_scope !== 'all') {
      paramCount++;
      query += ` AND t.template_scope = $${paramCount}`;
      params.push(filters.template_scope);
    }

    query += ` ORDER BY 
      CASE t.template_scope 
        WHEN 'standard' THEN 1 
        WHEN 'company' THEN 2 
        WHEN 'user' THEN 3 
      END,
      t.usage_count DESC, 
      t.created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async countTemplates(filters: any, isSuperAdmin: boolean, userCompanyId: string | null, userId: string, client?: PoolClient) {
    const db = client || this.pool;
    
    let query = `
      SELECT COUNT(*) 
      FROM templates t
      WHERE t.deleted_at IS NULL
        AND (t.development_status IS NULL OR t.development_status != 'archived')
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (!isSuperAdmin) {
      query += ` AND (
          t.template_scope = 'standard'
          OR
          (t.template_scope = 'company' AND t.company_id = $${paramCount + 1})
          OR
          (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $${paramCount + 2}))
        )`;
      params.push(userCompanyId, userId);
      paramCount = 2;
    }

    if (filters.framework) {
      paramCount++;
      query += ` AND t.framework = $${paramCount}`;
      params.push(filters.framework);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.is_public !== undefined) {
      paramCount++;
      query += ` AND t.is_public = $${paramCount}`;
      params.push(filters.is_public);
    }

    if (filters.template_scope && filters.template_scope !== 'all') {
      paramCount++;
      query += ` AND t.template_scope = $${paramCount}`;
      params.push(filters.template_scope);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async findTrash(isAdmin: boolean, userId: string, limit: number, offset: number, client?: PoolClient) {
    const db = client || this.pool;
    let query = `
      SELECT t.*, u.name as created_by_name 
      FROM templates t 
      LEFT JOIN users u ON t.created_by = u.id 
      WHERE (t.deleted_at IS NOT NULL OR t.development_status = 'archived')
    `;
    const params: any[] = [];

    if (!isAdmin) {
      params.push(userId);
      query += ` AND (t.deleted_by = $${params.length} OR t.created_by = $${params.length})`;
    }

    query += ` ORDER BY COALESCE(t.deleted_at, t.updated_at) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async countTrash(isAdmin: boolean, userId: string, client?: PoolClient) {
    const db = client || this.pool;
    let query = `SELECT COUNT(*) FROM templates t WHERE (t.deleted_at IS NOT NULL OR t.development_status = 'archived')`;
    const params: any[] = [];
    if (!isAdmin) {
      params.push(userId);
      query += ` AND (t.deleted_by = $${params.length} OR t.created_by = $${params.length})`;
    }
    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async findById(id: string, isSuperAdmin: boolean, userCompanyId: string | null, userId: string, client?: PoolClient) {
    const db = client || this.pool;
    let query = `
      SELECT 
        t.*, 
        u.name as created_by_name,
        c.name as company_name,
        CASE 
          WHEN t.validation_count = 0 THEN 0
          ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
        END as success_rate,
        CASE
          WHEN t.validation_count = 0 THEN 'Not tested yet'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.90 THEN 'Excellent'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.75 THEN 'Good'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.50 THEN 'Fair'
          ELSE 'Needs Improvement'
        END as health_rating,
        tep.avg_entity_counts,
        tep.knowledge_domain_coverage,
        tep.performance_domain_coverage,
        tep.primary_knowledge_domain,
        tep.secondary_knowledge_domains,
        tep.primary_performance_domain
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN template_entity_profile tep ON tep.template_id = t.id
      WHERE t.id = $1 
        AND t.deleted_at IS NULL
    `;

    const params: any[] = [id];

    if (!isSuperAdmin) {
      query += ` AND (
          t.template_scope = 'standard'
          OR
          (t.template_scope = 'company' AND t.company_id = $2)
          OR
          (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $3))
        )`;
      params.push(userCompanyId, userId);
    }

    const result = await db.query(query, params);
    return result.rows[0] || null;
  }

  async findRecentUsage(templateId: string, limit: number = 10, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      SELECT 
        tu.id, tu.document_id, tu.used_at, tu.quality_score, tu.success,
        tu.word_count, tu.generation_time_ms, tu.ai_provider, tu.ai_model,
        d.name as document_name, d.status as document_status,
        p.id as project_id, p.name as project_name, u.name as user_name
      FROM template_usage tu
      LEFT JOIN documents d ON tu.document_id = d.id
      LEFT JOIN projects p ON tu.project_id = p.id
      LEFT JOIN users u ON tu.user_id = u.id
      WHERE tu.template_id = $1
      ORDER BY tu.used_at DESC
      LIMIT $2
      `,
      [templateId, limit]
    );
    return result.rows;
  }

  async findVersionHistory(templateId: string, limit: number = 10, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      SELECT 
        tv.id, tv.version_number, tv.change_type, tv.change_summary,
        tv.created_at, tv.created_by, u.name as created_by_name,
        tis.id as optimization_suggestion_id, tis.expected_quality_gain,
        tis.implemented_at, tis.status as suggestion_status
      FROM template_versions tv
      LEFT JOIN users u ON tv.created_by = u.id
      LEFT JOIN template_improvement_suggestions tis ON tv.improvement_suggestion_id = tis.id
      WHERE tv.template_id = $1
      ORDER BY tv.created_at DESC
      LIMIT $2
      `,
      [templateId, limit]
    );
    return result.rows;
  }

  async findOptimizationHistory(templateId: string, limit: number = 10, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      SELECT 
        tis.id, tis.status, tis.expected_quality_gain, tis.current_avg_quality,
        tis.implemented_at, tis.implemented_by, u.name as implemented_by_name,
        tis.created_at, tis.suggested_improvements
      FROM template_improvement_suggestions tis
      LEFT JOIN users u ON tis.implemented_by = u.id
      WHERE tis.template_id = $1
        AND tis.status = 'implemented'
        AND (
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(tis.suggested_improvements) AS imp
            WHERE (
              (imp->'metadata'->>'optimization_type')::text = '"ai_generated"'
              OR (imp->>'change_type')::text = '"template_optimization"'
            )
          )
        )
      ORDER BY tis.implemented_at DESC NULLS LAST, tis.created_at DESC
      LIMIT $2
      `,
      [templateId, limit]
    );
    return result.rows;
  }

  async create(data: any, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, template_scope, company_id, is_read_only, created_by, 
        system_prompt, prompt_build_up, template_paragraphs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
      [
        data.id, data.name, data.description, data.framework, data.category,
        JSON.stringify(data.content), JSON.stringify(data.variables),
        data.is_public, data.template_scope, data.company_id,
        data.is_read_only, data.created_by, data.system_prompt,
        data.prompt_build_up ? JSON.stringify(data.prompt_build_up) : null,
        data.template_paragraphs ? JSON.stringify(data.template_paragraphs) : null,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: any, client?: PoolClient) {
    const db = client || this.pool;
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    const allowedFields = [
      'name', 'description', 'framework', 'category', 'content', 'variables',
      'is_public', 'system_prompt', 'quality_threshold', 'prompt_version',
      'template_paragraphs', 'gkg_context_strategy', 'development_status'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        if (JSONB_UPDATE_FIELDS.has(field)) {
          params.push(this.normalizeJsonbUpdateValue(field, data[field]));
        } else {
          params.push(data[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `UPDATE templates SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
      const result = await db.query(query, params);
      return result.rows[0];
    }
    return null;
  }

  async softDelete(id: string, userId: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      "UPDATE templates SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2, development_status = 'archived' WHERE id = $1 RETURNING *",
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async hardDelete(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query("DELETE FROM templates WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  async restore(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      "UPDATE templates SET deleted_at = NULL, deleted_by = NULL, development_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  }

  async promoteToCompany(id: string, companyId: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      UPDATE templates 
      SET 
        template_scope = 'company',
        company_id = $1,
        is_read_only = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [companyId, id]
    );
    return result.rows[0] || null;
  }

  async promoteToStandard(id: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      UPDATE templates 
      SET 
        template_scope = 'standard',
        is_read_only = true,
        company_id = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );
    return result.rows[0] || null;
  }

  async incrementUsage(id: string, userId: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(
      `
      UPDATE templates 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (is_public = true OR created_by = $2) AND deleted_at IS NULL
      RETURNING usage_count
      `,
      [id, userId]
    );
    return result.rows[0]?.usage_count || null;
  }

  async promoteStatus(id: string, userId: string, reason?: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM promote_template_status($1, $2, $3)', [id, userId, reason || null]);
    return result.rows[0];
  }

  async archive(id: string, userId: string, reason?: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM archive_template($1, $2, $3)', [id, userId, reason || 'Archived by user']);
    return result.rows[0];
  }

  async approveCompliance(id: string, userId: string, score: number, notes?: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query('SELECT * FROM approve_template_compliance($1, $2, $3, $4)', [id, userId, score, notes || null]);
    return result.rows[0];
  }

  // Statistics & Metrics
  async findStatistics(client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(`
      SELECT * FROM template_statistics
      ORDER BY total_uses DESC, name ASC
    `);
    return result.rows;
  }

  async findStatisticsById(templateId: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(`
      SELECT * FROM template_statistics
      WHERE id = $1
    `, [templateId]);
    return result.rows[0] || null;
  }

  async findUsageTrends(templateId: string, days: number = 30, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(`
      SELECT 
        DATE(used_at) as date,
        COUNT(*) as usage_count,
        AVG(word_count) as avg_word_count,
        AVG(quality_score) as avg_quality,
        AVG(generation_time_ms) as avg_time_ms,
        COUNT(DISTINCT user_id) as unique_users
      FROM template_usage
      WHERE template_id = $1
      AND used_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(used_at)
      ORDER BY date DESC
    `, [templateId]);
    return result.rows;
  }
}
