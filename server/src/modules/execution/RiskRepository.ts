import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export class RiskRepository {
  private logger = childLogger({ component: 'RiskRepository' });

  constructor(private pool: Pool) {}

  async findRegistry(filters: any, client?: PoolClient) {
    const db = client || this.pool;
    
    // Logic from riskReportingRoutes.ts
    let useView = true;
    try {
      await db.query('SELECT 1 FROM risk_registry LIMIT 1');
    } catch (viewError: any) {
      this.logger.warn('[RISK-REGISTRY] View does not exist, falling back to direct query');
      useView = false;
    }
    
    let query: string;
    const params: any[] = [];
    let paramCount = 0;
    
    if (useView) {
      query = 'SELECT * FROM risk_registry WHERE 1=1';
    } else {
      query = `
        SELECT 
          r.*,
          p.name as project_name,
          pr.name as program_name,
          d.name as source_document_name,
          (SELECT COUNT(*) FROM mitigation_plans mp WHERE mp.risk_id = r.id) as mitigation_plan_count,
          (SELECT COUNT(*) FROM mitigation_plans mp WHERE mp.risk_id = r.id AND mp.status = 'completed') as completed_mitigation_count,
          (SELECT ROUND(AVG(mp.completion_percentage), 0) FROM mitigation_plans mp WHERE mp.risk_id = r.id) as avg_mitigation_completion,
          (SELECT COUNT(*) FROM issues i WHERE i.related_risk_id = r.id) as related_issues_count,
          (SELECT COUNT(*) FROM issues i WHERE i.related_risk_id = r.id AND i.status NOT IN ('closed', 'resolved')) as active_related_issues_count
        FROM risks r
        LEFT JOIN projects p ON r.project_id = p.id
        LEFT JOIN programs pr ON r.program_id = pr.id OR (p.program_id = pr.id)
        LEFT JOIN documents d ON r.source_document_id = d.id
        WHERE 1=1
      `;
    }
    
    if (filters.project_id) {
      paramCount++;
      query += ` AND project_id = $${paramCount}`;
      params.push(filters.project_id);
    }
    
    if (filters.program_id) {
      paramCount++;
      query += ` AND program_id = $${paramCount}`;
      params.push(filters.program_id);
    }
    
    if (filters.risk_level) {
      paramCount++;
      query += ` AND ${useView ? 'risk_level' : 'COALESCE(r.risk_level, \'project\')'} = $${paramCount}`;
      params.push(filters.risk_level);
    }
    
    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    } else if (!useView) {
      query += ` AND (r.status NOT IN ('closed', 'mitigated') OR COALESCE(r.risk_level, 'project') IN ('portfolio', 'systemic'))`;
    }
    
    query += ` ORDER BY 
      CASE 
        WHEN priority = 'critical' THEN 1
        WHEN priority = 'high' THEN 2
        WHEN priority = 'medium' THEN 3
        WHEN priority = 'low' THEN 4
        ELSE 5
      END,
      created_at DESC
    `;
    
    const result = await db.query(query, params);
    return result.rows;
  }

  async findMitigationReport(filters: any, client?: PoolClient) {
    const db = client || this.pool;
    let query = 'SELECT * FROM risk_mitigation_report WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    if (filters.project_id) {
      paramCount++;
      query += ` AND risk_id IN (SELECT id FROM risks WHERE project_id = $${paramCount})`;
      params.push(filters.project_id);
    }
    
    if (filters.program_id) {
      paramCount++;
      query += ` AND risk_id IN (SELECT id FROM risks WHERE program_id = $${paramCount})`;
      params.push(filters.program_id);
    }
    
    if (filters.risk_id) {
      paramCount++;
      query += ` AND risk_id = $${paramCount}`;
      params.push(filters.risk_id);
    }
    
    if (filters.status) {
      paramCount++;
      query += ` AND mitigation_status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.overdue_only) {
      query += ` AND is_overdue = TRUE`;
    }
    
    query += ` ORDER BY risk_id, mitigation_priority DESC, due_date ASC NULLS LAST`;
    
    const result = await db.query(query, params);
    return result.rows;
  }

  async findSummary(programId?: string, client?: PoolClient) {
    const db = client || this.pool;
    let query = 'SELECT * FROM portfolio_risk_summary WHERE 1=1';
    const params: any[] = [];
    if (programId) {
      query += ` AND program_id = $1`;
      params.push(programId);
    }
    query += ` ORDER BY total_risks DESC`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async findCompliance(programId?: string, client?: PoolClient) {
    const db = client || this.pool;
    let query = 'SELECT * FROM portfolio_risk_review_compliance WHERE 1=1';
    const params: any[] = [];
    if (programId) {
      query += ` AND program_id = $1`;
      params.push(programId);
    }
    query += ` ORDER BY compliance_percentage DESC`;
    const result = await db.query(query, params);
    return result.rows;
  }
}
