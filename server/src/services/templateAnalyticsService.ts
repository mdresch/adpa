/**
 * Template Analytics Service
 * 
 * Tracks template versions, quality metrics, and usage analytics
 */

import { pool } from '../database/connection';
import { PMBOK_KNOWLEDGE_DOMAINS, getDomainTier, type PmbokDomain } from '@/types/pmbok';
import { ENTITY_DOMAIN_WEIGHTS, type EntityDomainWeight } from '@/types/entity-domain-weights';

const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

interface TemplateVersion {
  id?: string;
  template_id: string;
  version_number: string;
  version_tag?: string;
  change_type: 'created' | 'updated' | 'republished' | 'deprecated';
  change_summary?: string;
  change_details?: any;
  breaking_changes?: boolean;
  created_by: string;
}

interface QualityMetrics {
  template_id: string;
  total_uses: number;
  successful_uses: number;
  success_rate: number;
  unique_users: number;
  avg_document_word_count: number;
  avg_rating?: number;
  maintenance_priority?: string;
}

interface MaintenanceAction {
  template_id: string;
  action_type: 'review' | 'update' | 'deprecate' | 'restore' | 'archive';
  action_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  description?: string;
  assigned_to?: string;
  performed_by?: string;
}

export class TemplateAnalyticsService {
  /**
   * Create a new template version
   */
  static async createVersion(data: TemplateVersion): Promise<string> {
    try {
      const result = await query(
        `SELECT create_template_version($1, $2, $3, $4, $5)`,
        [
          data.template_id,
          data.version_number,
          data.change_type,
          data.change_summary || 'Version created',
          data.created_by
        ]
      );

      const versionId = result.rows[0].create_template_version;
      console.log(`Template version created: ${versionId}`);
      return versionId;
    } catch (error) {
      console.error('Failed to create template version:', error);
      throw error;
    }
  }

  /**
   * Rebuild template_entity_profile rows based on aggregated_template_entity_view.
   * If templateId is provided, only that template is recomputed.
   * This uses the shared ENTITY_DOMAIN_WEIGHTS matrix and PMBOK domain tiers
   * to infer primary knowledge/performance domains for each template.
   */
  static async updateTemplateEntityProfile(templateId?: string): Promise<void> {
    const params: any[] = [];
    let whereClause = '';

    if (templateId) {
      whereClause = 'WHERE template_id = $1';
      params.push(templateId);
    }

    const result = await query(
      `
      SELECT template_id, total_documents, total_entities, avg_entity_counts
      FROM aggregated_template_entity_view
      ${whereClause}
      `,
      params
    );

    const normalize = (coverage: Record<string, number>): Record<string, number> => {
      const total = Object.values(coverage).reduce((sum, v) => sum + v, 0) || 1;
      const normalized: Record<string, number> = {};
      for (const [domain, value] of Object.entries(coverage)) {
        normalized[domain] = value / total;
      }
      return normalized;
    };

    const findPrimary = (coverage: Record<string, number>): string | null => {
      let best: string | null = null;
      let bestVal = 0;
      for (const [domain, value] of Object.entries(coverage)) {
        if (value > bestVal) {
          bestVal = value;
          best = domain;
        }
      }
      return best;
    };

    for (const row of result.rows) {
      const avgEntityCounts = (row.avg_entity_counts || {}) as Record<string, number>;

      const knowledgeCoverage: Record<string, number> = {};
      const performanceCoverage: Record<string, number> = {};

      for (const [entityType, avgCountRaw] of Object.entries(avgEntityCounts)) {
        const avgCount = Number(avgCountRaw);
        if (!avgCount || avgCount <= 0) continue;

        const weights: EntityDomainWeight[] =
          ENTITY_DOMAIN_WEIGHTS[entityType] || ENTITY_DOMAIN_WEIGHTS[
            entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
          ] ||
          [];

        if (!weights.length) continue;

        for (const w of weights) {
          const tier = getDomainTier(w.domain as PmbokDomain);
          const increment = avgCount * w.weight;

          if (tier === 'knowledge') {
            knowledgeCoverage[w.domain] = (knowledgeCoverage[w.domain] || 0) + increment;
          } else {
            performanceCoverage[w.domain] = (performanceCoverage[w.domain] || 0) + increment;
          }
        }
      }

      const normalizedKnowledge = normalize(knowledgeCoverage);
      const normalizedPerformance = normalize(performanceCoverage);

      const primaryKnowledge = findPrimary(normalizedKnowledge);
      const primaryPerformance = findPrimary(normalizedPerformance);

      const secondaryKnowledgeDomains = Object.entries(normalizedKnowledge)
        .filter(([domain, value]) => domain !== primaryKnowledge && value >= 0.2)
        .map(([domain]) => domain);

      await query(
        `
        INSERT INTO template_entity_profile (
          template_id,
          total_documents,
          total_entities,
          avg_entity_counts,
          knowledge_domain_coverage,
          performance_domain_coverage,
          primary_knowledge_domain,
          secondary_knowledge_domains,
          primary_performance_domain,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (template_id) DO UPDATE SET
          total_documents = EXCLUDED.total_documents,
          total_entities = EXCLUDED.total_entities,
          avg_entity_counts = EXCLUDED.avg_entity_counts,
          knowledge_domain_coverage = EXCLUDED.knowledge_domain_coverage,
          performance_domain_coverage = EXCLUDED.performance_domain_coverage,
          primary_knowledge_domain = EXCLUDED.primary_knowledge_domain,
          secondary_knowledge_domains = EXCLUDED.secondary_knowledge_domains,
          primary_performance_domain = EXCLUDED.primary_performance_domain,
          updated_at = NOW()
        `,
        [
          row.template_id,
          row.total_documents,
          row.total_entities,
          row.avg_entity_counts || {},
          normalizedKnowledge,
          normalizedPerformance,
          primaryKnowledge,
          secondaryKnowledgeDomains,
          primaryPerformance
        ]
      );
    }
  }

  /**
   * Get template version history
   */
  static async getVersionHistory(templateId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          tv.*,
          u.name as created_by_name,
          u.email as created_by_email
        FROM template_versions tv
        LEFT JOIN users u ON tv.created_by = u.id
        WHERE tv.template_id = $1
        ORDER BY tv.created_at DESC
        LIMIT $2`,
        [templateId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get template version history:', error);
      return [];
    }
  }

  /**
   * Get specific version
   */
  static async getVersion(versionId: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT tv.*, u.name as created_by_name
         FROM template_versions tv
         LEFT JOIN users u ON tv.created_by = u.id
         WHERE tv.id = $1`,
        [versionId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get template version:', error);
      return null;
    }
  }

  /**
   * Calculate quality metrics for a template
   */
  static async calculateQualityMetrics(
    templateId: string,
    periodType: string = 'all_time',
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<void> {
    try {
      await query(
        `SELECT calculate_template_quality_metrics($1, $2, $3, $4)`,
        [
          templateId,
          periodType,
          periodStart || null,
          periodEnd || null
        ]
      );

      console.log(`Quality metrics calculated for template: ${templateId}`);
    } catch (error) {
      console.error('Failed to calculate quality metrics:', error);
    }
  }

  /**
   * Get quality metrics for a template
   */
  static async getQualityMetrics(
    templateId: string,
    periodType: string = 'all_time'
  ): Promise<any | null> {
    try {
      const result = await query(
        `SELECT * FROM template_quality_metrics
         WHERE template_id = $1 AND period_type = $2
         ORDER BY calculated_at DESC
         LIMIT 1`,
        [templateId, periodType]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get quality metrics:', error);
      return null;
    }
  }

  /**
   * Determine maintenance priority
   */
  static async determineMaintenancePriority(templateId: string): Promise<string> {
    try {
      const result = await query(
        `SELECT determine_template_maintenance_priority($1)`,
        [templateId]
      );

      return result.rows[0].determine_template_maintenance_priority;
    } catch (error) {
      console.error('Failed to determine maintenance priority:', error);
      return 'low';
    }
  }

  /**
   * Create maintenance action
   */
  static async createMaintenanceAction(data: MaintenanceAction): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO template_maintenance_log (
          template_id, action_type, action_status, priority,
          reason, description, assigned_to, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          data.template_id,
          data.action_type,
          data.action_status,
          data.priority,
          data.reason || null,
          data.description || null,
          data.assigned_to || null,
          data.performed_by || null
        ]
      );

      const maintenanceId = result.rows[0].id;
      console.log(`Maintenance action created: ${maintenanceId}`);
      return maintenanceId;
    } catch (error) {
      console.error('Failed to create maintenance action:', error);
      throw error;
    }
  }

  /**
   * Update maintenance action status
   */
  static async updateMaintenanceStatus(
    maintenanceId: string,
    status: string,
    description?: string
  ): Promise<void> {
    try {
      const updates: string[] = ['action_status = $2', 'updated_at = CURRENT_TIMESTAMP'];
      const params: any[] = [maintenanceId, status];

      if (status === 'in_progress' && description) {
        updates.push('started_at = CURRENT_TIMESTAMP');
      } else if (status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      }

      if (description) {
        updates.push(`description = $${params.length + 1}`);
        params.push(description);
      }

      await query(
        `UPDATE template_maintenance_log
         SET ${updates.join(', ')}
         WHERE id = $1`,
        params
      );

      console.log(`Maintenance action updated: ${maintenanceId}`);
    } catch (error) {
      console.error('Failed to update maintenance action:', error);
    }
  }

  /**
   * Get maintenance log for template
   */
  static async getMaintenanceLog(templateId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          tml.*,
          u1.name as assigned_to_name,
          u2.name as performed_by_name
        FROM template_maintenance_log tml
        LEFT JOIN users u1 ON tml.assigned_to = u1.id
        LEFT JOIN users u2 ON tml.performed_by = u2.id
        WHERE tml.template_id = $1
        ORDER BY tml.created_at DESC
        LIMIT $2`,
        [templateId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get maintenance log:', error);
      return [];
    }
  }

  /**
   * Get template performance summary
   */
  static async getPerformanceSummary(templateId: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT * FROM mv_template_performance
         WHERE template_id = $1`,
        [templateId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return null;
    }
  }

  /**
   * Get template trends
   */
  static async getTemplateTrends(
    templateId: string,
    days: number = 30
  ): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM mv_template_trends
         WHERE template_id = $1
           AND usage_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY usage_date DESC`,
        [templateId]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get template trends:', error);
      return [];
    }
  }

  /**
   * Get top performing templates
   */
  static async getTopTemplates(
    limit: number = 10,
    framework?: string,
    category?: string
  ): Promise<any[]> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (framework) {
        whereClause += ' AND framework = $1';
        params.push(framework);
      }

      if (category) {
        whereClause += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      params.push(limit);

      const result = await query(
        `SELECT * FROM mv_template_performance
         WHERE 1=1 ${whereClause}
         ORDER BY success_rate DESC, total_uses DESC
         LIMIT $${params.length}`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get top templates:', error);
      return [];
    }
  }

  /**
   * Get templates needing maintenance
   */
  static async getTemplatesNeedingMaintenance(
    minPriority: string = 'medium'
  ): Promise<any[]> {
    try {
      const priorities = ['low', 'medium', 'high', 'critical'];
      const minIndex = priorities.indexOf(minPriority);

      const result = await query(
        `SELECT 
          t.id, t.name, t.framework, t.category,
          tqm.success_rate, tqm.days_since_last_use,
          tqm.maintenance_priority, tqm.total_uses
        FROM templates t
        INNER JOIN template_quality_metrics tqm ON t.id = tqm.template_id
        WHERE tqm.period_type = 'all_time'
          AND tqm.maintenance_priority = ANY($1)
        ORDER BY 
          CASE tqm.maintenance_priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          tqm.total_uses DESC`,
        [priorities.slice(minIndex)]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get templates needing maintenance:', error);
      return [];
    }
  }

  /**
   * Compare two templates
   */
  static async compareTemplates(
    templateIdA: string,
    templateIdB: string
  ): Promise<any> {
    try {
      const [metricsA, metricsB] = await Promise.all([
        this.getQualityMetrics(templateIdA),
        this.getQualityMetrics(templateIdB)
      ]);

      if (!metricsA || !metricsB) {
        return null;
      }

      const comparison = {
        template_a: { id: templateIdA, metrics: metricsA },
        template_b: { id: templateIdB, metrics: metricsB },
        comparison: {
          success_rate: {
            a: metricsA.success_rate,
            b: metricsB.success_rate,
            difference: metricsA.success_rate - metricsB.success_rate,
            winner: metricsA.success_rate > metricsB.success_rate ? 'a' : metricsB.success_rate > metricsA.success_rate ? 'b' : 'tie'
          },
          total_uses: {
            a: metricsA.total_uses,
            b: metricsB.total_uses,
            difference: metricsA.total_uses - metricsB.total_uses,
            winner: metricsA.total_uses > metricsB.total_uses ? 'a' : metricsB.total_uses > metricsA.total_uses ? 'b' : 'tie'
          },
          avg_word_count: {
            a: metricsA.avg_document_word_count,
            b: metricsB.avg_document_word_count,
            difference: metricsA.avg_document_word_count - metricsB.avg_document_word_count
          }
        }
      };

      return comparison;
    } catch (error) {
      console.error('Failed to compare templates:', error);
      return null;
    }
  }

  /**
   * Refresh analytics views
   */
  static async refreshAnalyticsViews(): Promise<void> {
    try {
      await query('SELECT refresh_template_analytics_views()');
      console.log('Template analytics views refreshed');
    } catch (error) {
      console.error('Failed to refresh analytics views:', error);
    }
  }

  /**
   * Get template analytics dashboard
   */
  static async getDashboard(framework?: string): Promise<any> {
    try {
      const [topTemplates, needsMaintenance, recentTrends] = await Promise.all([
        this.getTopTemplates(5, framework),
        this.getTemplatesNeedingMaintenance('high'),
        query(
          `SELECT 
            usage_date,
            COUNT(DISTINCT template_id) as active_templates,
            SUM(daily_uses) as total_uses,
            ROUND(AVG(daily_avg_word_count), 0) as avg_word_count
          FROM mv_template_trends
          WHERE usage_date >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY usage_date
          ORDER BY usage_date DESC`,
          []
        )
      ]);

      const stats = await query(
        `SELECT 
          COUNT(DISTINCT template_id) as total_templates,
          SUM(total_uses) as total_uses,
          ROUND(AVG(success_rate), 2) as avg_success_rate,
          COUNT(*) FILTER (WHERE maintenance_priority IN ('high', 'critical')) as needs_maintenance
        FROM template_quality_metrics
        WHERE period_type = 'all_time'`,
        []
      );

      return {
        stats: stats.rows[0],
        top_templates: topTemplates,
        needs_maintenance: needsMaintenance,
        recent_trends: recentTrends.rows
      };
    } catch (error) {
      console.error('Failed to get analytics dashboard:', error);
      return null;
    }
  }
}

export default TemplateAnalyticsService;

