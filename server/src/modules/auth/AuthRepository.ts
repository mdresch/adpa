import { Pool, PoolClient, QueryResult } from 'pg';
import { pool } from '../../database/connection';

export interface UserData {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  permissions: string; // JSON string
  metadata?: string | null;
  company_id?: string | null;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
  last_login?: Date;
}

export interface CompanyData {
  id: string;
  name: string;
  domain?: string | null;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class AuthRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Finds a user by email.
   */
  async findByEmail(email: string): Promise<QueryResult<any>> {
    try {
      return await this.db.query(
        `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active, 
                u.metadata, u.company_id, c.name as company_name
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.email = $1`,
        [email]
      );
    } catch (err: any) {
      if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
        return await this.db.query(
          "SELECT id, email, password_hash, name, role, permissions, is_active FROM users WHERE email = $1",
          [email]
        );
      }
      throw err;
    }
  }

  /**
   * Finds a user by ID.
   */
  async findById(id: string): Promise<QueryResult<any>> {
    return this.db.query(
      `SELECT id, email, name, role, permissions, company_id, created_at, last_login 
       FROM users WHERE id = $1`,
      [id]
    );
  }

  /**
   * Updates a user's last login timestamp.
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.db.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [id]);
  }

  /**
   * Updates a user's password.
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db.query("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [passwordHash, id]);
  }

  /**
   * Creates a new user with fallback for missing columns.
   */
  async createUser(data: Partial<UserData>, client: Pool | PoolClient = this.db): Promise<QueryResult<any>> {
    try {
      return await client.query(
        `INSERT INTO users (email, password_hash, name, role, permissions, metadata, company_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, email, name, role, permissions, created_at, company_id, metadata`,
        [data.email, data.password_hash, data.name, data.role, data.permissions, data.metadata, data.company_id]
      );
    } catch (err: any) {
      if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
        try {
          return await client.query(
            `INSERT INTO users (email, password_hash, name, role, permissions, company_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, email, name, role, permissions, created_at, company_id`,
            [data.email, data.password_hash, data.name, data.role, data.permissions, data.company_id]
          );
        } catch (err2: any) {
          if (err2.message?.includes('column "company_id"') || err2.code === '42703') {
            return await client.query(
              `INSERT INTO users (email, password_hash, name, role, permissions) 
               VALUES ($1, $2, $3, $4, $5) 
               RETURNING id, email, name, role, permissions, created_at`,
              [data.email, data.password_hash, data.name, data.role, data.permissions]
            );
          }
          throw err2;
        }
      }
      throw err;
    }
  }

  /**
   * Finds an active company by name (case-insensitive).
   */
  async findCompanyByName(name: string, client: Pool | PoolClient = this.db): Promise<QueryResult<any>> {
    return client.query(
      "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_active = true",
      [name]
    );
  }

  /**
   * Creates a new company.
   */
  async createCompany(data: CompanyData, client: Pool | PoolClient = this.db): Promise<QueryResult<any>> {
    return client.query(
      `INSERT INTO companies (id, name, domain, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [data.id, data.name, data.domain, true]
    );
  }

  /**
   * Gets user count for a company.
   */
  async getCompanyUserCount(companyId: string, client: Pool | PoolClient = this.db): Promise<number> {
    const result = await client.query(
      `SELECT COUNT(*) AS count FROM users WHERE company_id = $1 AND is_active = true`,
      [companyId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Helper to get a generic client from the pool.
   */
  async getClient(): Promise<PoolClient> {
    return this.db.connect();
  }

  /**
   * Executes a callback within a transaction.
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Gets a user's company ID.
   */
  async getCompanyIdByUserId(userId: string): Promise<string | null> {
    const result = await this.db.query("SELECT company_id FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.company_id || null;
  }
}
