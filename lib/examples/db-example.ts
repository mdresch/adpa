/**
 * This file provides examples of how to use the database connection library
 */

import { sql, pool, withTransaction, executeQuery, checkDatabaseHealth } from '../db';

/**
 * Example of using the sql client for serverless functions
 */
export async function getUsersWithServerless() {
  try {
    // Using the sql client from @vercel/postgres
    const { rows } = await sql`
      SELECT id, email, name, role, created_at 
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Example of using the connection pool
 */
export async function getUsersWithPool() {
  try {
    // Using the traditional connection pool
    return await executeQuery(
      'SELECT id, email, name, role, created_at FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT 10'
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Example of using transactions
 */
export async function createUserWithTransaction(userData: {
  email: string;
  name: string;
  role: string;
  password_hash: string;
}) {
  try {
    // Using transaction to ensure all operations succeed or fail together
    return await withTransaction(async (client) => {
      // Create user
      const { rows: [user] } = await client.query(
        'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [userData.email, userData.name, userData.role, userData.password_hash]
      );
      
      // Create default settings for user
      await client.query(
        'INSERT INTO user_settings (user_id, theme, notifications_enabled) VALUES ($1, $2, $3)',
        [user.id, 'light', true]
      );
      
      // Return the created user
      const { rows: [createdUser] } = await client.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [user.id]
      );
      
      return createdUser;
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Example of checking database health
 */
export async function checkDatabaseStatus() {
  try {
    const status = await checkDatabaseHealth();
    console.log('Database status:', status);
    return status;
  } catch (error) {
    console.error('Error checking database health:', error);
    throw error;
  }
}