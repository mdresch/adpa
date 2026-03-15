import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export class PortfolioAssessmentRepository {
  private logger = childLogger({ component: 'PortfolioAssessmentRepository' });

  constructor(private pool: Pool) {}

  async findRecentByProjectId(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT * FROM portfolio_assessments
      WHERE project_id = $1
        AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  }

  async findLatestByProjectId(projectId: string, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT * FROM portfolio_assessments
      WHERE project_id = $1
      ORDER BY assessment_date DESC
      LIMIT 1
    `;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  }

  async findHistoryByProjectId(projectId: string, limit: number = 10, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT 
        id, assessment_date, total_documents, avg_quality_score,
        maturity_level, maturity_label, gap_percentage
      FROM portfolio_assessments
      WHERE project_id = $1
      ORDER BY assessment_date DESC
      LIMIT $2
    `;
    const result = await db.query(query, [projectId, limit]);
    return result.rows;
  }

  async findBenchmark(industry: string, documentType: string | null = null, client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT * FROM industry_benchmarks
      WHERE industry_vertical = $1
        AND ($2::text IS NULL OR document_type = $2)
      ORDER BY last_updated DESC
      LIMIT 1
    `;
    const result = await db.query(query, [industry, documentType]);
    return result.rows[0];
  }

  async findAllIndustries(client?: PoolClient) {
    const db = client || this.pool;
    const query = `
      SELECT 
        industry_vertical,
        COUNT(*) as benchmark_count,
        AVG(avg_quality_score) as avg_score
      FROM industry_benchmarks
      WHERE document_type IS NULL
      GROUP BY industry_vertical
      ORDER BY industry_vertical
    `;
    const result = await db.query(query);
    return result.rows;
  }

  async verifyProjectAccess(userId: string, userRole: string, userCompanyId: string | null, projectId: string, client?: PoolClient): Promise<boolean> {
    const db = client || this.pool;
    const role = userRole.toLowerCase();
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';

    if (isSuperAdmin) {
      const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
      return projectExists.rows.length > 0;
    }

    if (isAdmin) {
      if (userCompanyId) {
        const projectCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND company_id = $2', [projectId, userCompanyId]);
        return projectCheck.rows.length > 0;
      } else {
        const projectCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR created_by = $2)', [projectId, userId]);
        return projectCheck.rows.length > 0;
      }
    }

    const query = `
      SELECT id, owner_id, created_by, team_members
      FROM projects
      WHERE id = $1
    `;
    const result = await db.query(query, [projectId]);
    if (result.rows.length === 0) return false;

    const project = result.rows[0];
    const isOwner = project.owner_id === userId || project.created_by === userId;
    const teamMembers = project.team_members || [];
    const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId);

    return isOwner || isInTeam;
  }
}
