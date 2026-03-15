import { Pool, PoolClient } from 'pg';
import { childLogger } from '../../utils/logger';

export interface PortfolioDomainData {
  id: string;
  name: string;
  description: { markdown: string };
}

export class PortfolioDomainRepository {
  private logger = childLogger({ component: 'PortfolioDomainRepository' });

  constructor(private pool: Pool) {}

  async findAll(client?: PoolClient): Promise<PortfolioDomainData[]> {
    const db = client || this.pool;
    try {
      const result = await db.query('SELECT * FROM portfolio_domains ORDER BY name ASC');
      return result.rows;
    } catch (dbErr: any) {
      if (dbErr.message?.includes('does not exist') || dbErr.message?.includes('relation')) {
        this.logger.warn('portfolio_domains table not found, returning mock data');
        return [
          {
            id: '1',
            name: 'Project Management',
            description: { markdown: '<p>Core project management methodologies and practices including waterfall, agile, and hybrid approaches.</p>' }
          },
          {
            id: '2', 
            name: 'Risk Management',
            description: { markdown: '<p>Comprehensive risk identification, assessment, mitigation, and monitoring processes.</p>' }
          },
          {
            id: '3',
            name: 'Financial Management',
            description: { markdown: '<p>Budget planning, cost control, financial reporting, and ROI analysis for projects.</p>' }
          },
          {
            id: '4',
            name: 'Stakeholder Management',
            description: { markdown: '<p>Stakeholder identification, engagement planning, communication, and relationship management.</p>' }
          },
          {
            id: '5',
            name: 'Quality Management',
            description: { markdown: '<p>Quality planning, assurance, control processes and continuous improvement methodologies.</p>' }
          }
        ];
      }
      throw dbErr;
    }
  }

  async findById(id: string, client?: PoolClient): Promise<PortfolioDomainData | null> {
    const db = client || this.pool;
    try {
      const result = await db.query('SELECT * FROM portfolio_domains WHERE id = $1', [id]);
      if (result.rows.length > 0) return result.rows[0];

      // Check mock data
      const all = await this.findAll(db as PoolClient);
      return all.find(d => d.id === id) || null;
    } catch (dbErr: any) {
      if (dbErr.message?.includes('does not exist') || dbErr.message?.includes('relation')) {
        const all = await this.findAll(db as PoolClient);
        return all.find(d => d.id === id) || null;
      }
      throw dbErr;
    }
  }
}
