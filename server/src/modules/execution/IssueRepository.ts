import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export class IssueRepository {
  private logger = childLogger({ component: 'IssueRepository' });

  constructor(private pool: Pool) {}

  async findStats(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE status = 'open') as open_issues,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_issues,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_issues,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_issues,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_issues,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_issues,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_issues,
        COUNT(*) FILTER (WHERE priority = 'high') as high_issues,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_issues,
        COUNT(*) FILTER (WHERE priority = 'low') as low_issues,
        COUNT(*) FILTER (WHERE target_resolution_date < CURRENT_TIMESTAMP AND status NOT IN ('resolved', 'closed')) as overdue_issues
      FROM issues
      WHERE project_id = $1
    `;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  }

  async findDetail(issueId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT title, description, category, priority, impact 
      FROM issues 
      WHERE id = $1
    `;
    const result = await db.query(query, [issueId]);
    return result.rows[0];
  }

  async findResolutionMetrics(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    // This is from getResolutionMetrics in issueService.ts
    // I'll check the service implementation for this one
    const query = `
      SELECT 
        COUNT(*) as total_resolved,
        AVG(EXTRACT(EPOCH FROM (date_resolved - date_raised))/86400) as avg_resolution_days
      FROM issues
      WHERE project_id = $1 AND status IN ('resolved', 'closed') AND date_resolved IS NOT NULL
    `;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  }
}
