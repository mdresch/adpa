// Service for portfolio domains

import { PortfolioDomain } from './portfolioDomain.model';
import { pool } from '../../database/connection';


export async function getAllDomains(): Promise<PortfolioDomain[]> {
  try {
    // Try to get from database first
    try {
      const result = await pool.query('SELECT * FROM portfolio_domains ORDER BY name ASC');
      return result.rows;
    } catch (dbErr: any) {
      // If table doesn't exist, return mock data
      if (dbErr.message?.includes('does not exist') || dbErr.message?.includes('relation')) {
        console.log('portfolio_domains table not found, returning mock data');
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
  } catch (err: any) {
    console.error('[portfolioDomain.service] getAllDomains error:', err);
    throw new Error(`Failed to fetch portfolio domains: ${err.message}`);
  }
}


export async function getDomainById(id: string): Promise<PortfolioDomain | null> {
  try {
    // Try to get from database first
    try {
      const result = await pool.query('SELECT * FROM portfolio_domains WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (dbErr: any) {
      // If table doesn't exist, return mock data
      if (dbErr.message?.includes('does not exist') || dbErr.message?.includes('relation')) {
        const allDomains = await getAllDomains();
        return allDomains.find(domain => domain.id === id) || null;
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('[portfolioDomain.service] getDomainById error:', err);
    throw new Error(`Failed to fetch portfolio domain: ${err.message}`);
  }
}

// Add create, update, delete as needed
