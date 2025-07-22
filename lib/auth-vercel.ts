import { sql } from '@vercel/postgres';
import { CacheService } from './kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function authenticateUser(email: string, password: string) {
  try {
    const { rows } = await sql`
      SELECT id, email, password_hash, name, role, permissions
      FROM users 
      WHERE email = ${email} AND is_active = true
    `;

    if (rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    };

    // Store in KV with 24 hour expiry
    await CacheService.setSession(sessionId, sessionData, 86400);

    // Create JWT token
    const token = jwt.sign(
      { sessionId, userId: user.id },
      process.env.JWT_SECRET || 'default-jwt-secret',
      { expiresIn: '24h' }
    );

    return { token, user: sessionData };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function validateSession(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret') as any;
    const sessionData = await CacheService.getSession(decoded.sessionId);
    
    if (!sessionData) {
      throw new Error('Session expired');
    }

    return sessionData;
  } catch (error) {
    throw new Error('Invalid session');
  }
}