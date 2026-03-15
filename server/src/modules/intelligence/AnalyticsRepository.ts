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

    return {
      projects: projectStats.rows[0],
      documents: documentStats.rows[0],
      ai: aiStats.rows[0]
    };
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
        (SELECT COUNT(*) FROM audit_logs WHERE action = 'ai_generate' AND created_at >= NOW() - INTERVAL '${interval}') as ai_generations_period
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

  async getPMBOK8Analytics(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    // ... complex queries from legacy analytics.ts ...
    // Simplified for now, can add more as needed
    const teamMetrics = await db.query(`SELECT * FROM team_agreements WHERE project_id = $1`, [projectId]);
    return { team: teamMetrics.rows };
  }
}
