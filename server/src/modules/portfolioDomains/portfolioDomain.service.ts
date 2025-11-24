// Service for portfolio domains

import { PortfolioDomain } from './portfolioDomain.model';
import { pool } from '../../database/connection';


export async function getAllDomains(): Promise<PortfolioDomain[]> {
  try {
    const result = await pool.query('SELECT * FROM portfolio_domains ORDER BY name ASC');
    return result.rows;
  } catch (err: any) {
    console.error('[portfolioDomain.service] getAllDomains error:', err);
    throw new Error(`Failed to fetch portfolio domains: ${err.message}`);
  }
}


export async function getDomainById(id: string): Promise<PortfolioDomain | null> {
  try {
    const result = await pool.query('SELECT * FROM portfolio_domains WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (err: any) {
    console.error('[portfolioDomain.service] getDomainById error:', err);
    throw new Error(`Failed to fetch portfolio domain: ${err.message}`);
  }
}

// Add create, update, delete as needed
