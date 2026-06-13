import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export class AnalyticsRepository {
  private logger = childLogger({ component: 'AnalyticsRepository' });

  constructor(private pool: Pool) {}

  async getDashboardStats(userId: string, client?: PoolClient) {
    const db = client || this.pool;
    
    const projectStats = await db.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as projects_last_30d
      FROM projects 
      WHERE owner_id = $1 OR team_members ? $1::text
    `, [userId]);

    const documentStats = await db.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE d.status = 'published') as published_documents,
        COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as documents_last_30d
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.owner_id = $1 OR p.team_members ? $1::text
    `, [userId]);

    const aiStats = await db.query(`
      SELECT 
        COUNT(*) as total_generations,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as generations_last_30d
      FROM audit_logs
      WHERE user_id = $1 AND action = 'ai_generate'
    `, [userId]);

    const recentActivity = await db.query(`
      SELECT 
        activity_type as action,
        description as details,
        created_at as time,
        entity_id,
        entity_type,
        metadata,
        CASE 
          WHEN activity_category = 'success' THEN 'emerald'
          WHEN activity_category = 'info' THEN 'blue'
          WHEN activity_category = 'error' THEN 'red'
          WHEN activity_category = 'warning' THEN 'purple'
          ELSE 'slate'
        END as color
      FROM user_activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    const aiPerformance = await db.query(`
      SELECT 
        COALESCE(AVG(response_time_ms), 0) as avg_response_time_ms,
        COALESCE((COUNT(*) FILTER (WHERE success = true)::FLOAT / NULLIF(COUNT(*), 0) * 100), 0) as success_rate
      FROM ai_usage_logs
      WHERE user_id = $1
    `, [userId]);

    return {
      projects: projectStats.rows[0],
      documents: documentStats.rows[0],
      ai: aiStats.rows[0],
      recent_activity: recentActivity.rows,
      ai_performance: aiPerformance.rows[0]
    };
  }

  async getRecentActivity(userId: string, limit: number = 10, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(`
      SELECT 
        activity_type as action,
        description as details,
        created_at as time,
        entity_id,
        entity_type,
        metadata,
        CASE 
          WHEN activity_category = 'success' THEN 'emerald'
          WHEN activity_category = 'info' THEN 'blue'
          WHEN activity_category = 'error' THEN 'red'
          WHEN activity_category = 'warning' THEN 'purple'
          ELSE 'slate'
        END as color
      FROM user_activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  async getAIPerformance(userId: string, client?: PoolClient) {
    const db = client || this.pool;
    const result = await db.query(`
      SELECT 
        COALESCE(AVG(response_time_ms), 0) as avg_response_time_ms,
        COALESCE((COUNT(*) FILTER (WHERE success = true)::FLOAT / NULLIF(COUNT(*), 0) * 100), 0) as success_rate
      FROM ai_usage_logs
      WHERE user_id = $1
    `, [userId]);
    return result.rows[0];
  }

  async getSystemWideStats(interval: string, client?: PoolClient) {
    const db = client || this.pool;
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = CURRENT_DATE) as documents_today,
        (SELECT COUNT(*) FROM templates WHERE is_public = true) as public_templates,
        (SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '${interval}') as jobs_period,
        (SELECT COUNT(*) FROM ai_usage_logs WHERE request_type = 'ai_generate' AND created_at >= NOW() - INTERVAL '${interval}') as ai_generations_period
    `);
    return stats.rows[0];
  }

  async trackEvent(userId: string, eventType: string, properties: any, client?: PoolClient) {
    const db = client || this.pool;
    await db.query(`
      INSERT INTO analytics_events (user_id, event_type, properties)
      VALUES ($1, $2, $3)
    `, [userId, eventType, JSON.stringify(properties)]);
  }

  async getAIGlobalSummary(interval: string, client?: PoolClient) {
    const db = client || this.pool;
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        AVG(response_time_ms) as avg_response_time,
        (COUNT(*) FILTER (WHERE success = true)::FLOAT / NULLIF(COUNT(*), 0) * 100) as success_rate,
        COUNT(DISTINCT model_name) as active_models
      FROM ai_usage_logs
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `);
    return stats.rows[0];
  }

  async getAIUsageTimeline(interval: string, client?: PoolClient) {
    const db = client || this.pool;
    // Group by day for the interval
    const stats = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens
      FROM ai_usage_logs
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);
    return stats.rows;
  }

  async getAIProviderStats(interval: string, client?: PoolClient) {
    const db = client || this.pool;
    const stats = await db.query(`
      SELECT 
        provider_type as provider,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(estimated_cost) as cost,
        AVG(response_time_ms) as avg_latency
      FROM ai_usage_logs
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY provider_type
      ORDER BY requests DESC
    `);
    return stats.rows;
  }

  async getAIModelStats(interval: string, client?: PoolClient) {
    const db = client || this.pool;
    const stats = await db.query(`
      SELECT 
        model_name as model,
        provider_type as provider,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        AVG(response_time_ms) as avg_latency,
        (COUNT(*) FILTER (WHERE success = true)::FLOAT / NULLIF(COUNT(*), 0) * 100) as success_rate
      FROM ai_usage_logs
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY model_name, provider_type
      ORDER BY requests DESC
    `);
    return stats.rows;
  }

  async getPMBOK8Analytics(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    // ... complex queries from legacy analytics.ts ...
    // Simplified for now, can add more as needed
    const teamMetrics = await db.query(`SELECT * FROM team_agreements WHERE project_id = $1`, [projectId]);
    return { team: teamMetrics.rows };
  }
}
