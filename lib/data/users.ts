import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';
import { User } from '@/lib/api';

// Cache TTL in seconds (10 minutes)
const CACHE_TTL = 600;

// Cache key prefixes
const CACHE_KEYS = {
  USER: 'user:',
  USERS: 'users:',
  USERS_BY_ROLE: 'users:role:',
  USERS_BY_EMAIL: 'users:email:',
};

// Input validation
function validateUserData(userData: Partial<User>): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email format');
  }

  if (userData.name && (userData.name.length < 2 || userData.name.length > 100)) {
    errors.push('Name must be between 2 and 100 characters');
  }

  if (userData.role && !['admin', 'user', 'editor', 'viewer'].includes(userData.role)) {
    errors.push('Invalid role. Must be one of: admin, user, editor, viewer');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Sanitize user data for safe display (remove sensitive fields)
function sanitizeUser(user: any): Partial<User> {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
}

export class UserService {
  /**
   * Get all users with optional filtering
   * @param filters Optional filters (role, search, isActive, etc.)
   * @returns Array of users
   */
  static async getUsers(filters?: {
    role?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ users: Partial<User>[]; total: number; page: number; limit: number }> {
    try {
      // Build cache key based on filters
      let cacheKey = CACHE_KEYS.USERS;
      if (filters) {
        const filterString = JSON.stringify(filters);
        cacheKey += Buffer.from(filterString).toString('base64');
      }

      // Try to get from cache first
      const cached = await CacheService.get<{ users: Partial<User>[]; total: number; page: number; limit: number }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Default pagination values
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const offset = (page - 1) * limit;

      // Build the query conditions
      let conditions = [];
      let queryParams: any[] = [limit, offset];
      let paramIndex = 3; // Starting from 3 because we already have 2 params

      if (filters?.role) {
        conditions.push(`role = $${paramIndex++}`);
        queryParams.push(filters.role);
      }

      if (filters?.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(filters.isActive);
      }

      if (filters?.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Combine conditions
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total users matching the criteria
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        ${whereClause}
      `;
      
      const { rows: countRows } = await sql.query(countQuery, queryParams.slice(2));
      const total = parseInt(countRows[0].total, 10);

      // Get users with pagination
      const query = `
        SELECT id, email, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const { rows } = await sql.query(query, queryParams);

      // Sanitize users
      const users = rows.map(sanitizeUser);

      // Cache the result
      const result = { users, total, page, limit };
      await CacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns User object or null if not found
   */
  static async getUserById(id: string): Promise<Partial<User> | null> {
    try {
      // Try to get from cache first
      const cacheKey = `${CACHE_KEYS.USER}${id}`;
      const cached = await CacheService.get<Partial<User>>(cacheKey);
      if (cached) {
        return cached;
      }

      // Query database
      const { rows } = await sql`
        SELECT id, email, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE id = ${id}
      `;

      if (rows.length === 0) {
        return null;
      }

      // Sanitize user
      const user = sanitizeUser(rows[0]);

      // Cache the result
      await CacheService.set(cacheKey, user, CACHE_TTL);

      return user;
    } catch (error) {
      console.error(`Error in getUserById for ID ${id}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get a user by email
   * @param email User email
   * @returns User object or null if not found
   */
  static async getUserByEmail(email: string): Promise<Partial<User> | null> {
    try {
      // Try to get from cache first
      const cacheKey = `${CACHE_KEYS.USERS_BY_EMAIL}${email}`;
      const cached = await CacheService.get<Partial<User>>(cacheKey);
      if (cached) {
        return cached;
      }

      // Query database
      const { rows } = await sql`
        SELECT id, email, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE email = ${email}
      `;

      if (rows.length === 0) {
        return null;
      }

      // Sanitize user
      const user = sanitizeUser(rows[0]);

      // Cache the result
      await CacheService.set(cacheKey, user, CACHE_TTL);

      return user;
    } catch (error) {
      console.error(`Error in getUserByEmail for email ${email}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Create a new user
   * @param userData User data
   * @returns Created user
   */
  static async createUser(userData: Partial<User>): Promise<Partial<User>> {
    try {
      // Validate user data
      const validation = validateUserData(userData);
      if (!validation.valid) {
        throw new Error(`Invalid user data: ${validation.errors?.join(', ')}`);
      }

      // Check if email already exists
      const existingUser = await UserService.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Insert user into database
      const { rows } = await sql`
        INSERT INTO users (
          email, 
          name, 
          role, 
          permissions,
          is_active
        ) VALUES (
          ${userData.email}, 
          ${userData.name}, 
          ${userData.role || 'user'}, 
          ${userData.permissions || {}},
          ${userData.is_active !== undefined ? userData.is_active : true}
        )
        RETURNING id, email, name, role, permissions, avatar_url, is_active, created_at, updated_at
      `;

      const newUser = sanitizeUser(rows[0]);

      // Invalidate cache
      await CacheService.delByPattern(`${CACHE_KEYS.USERS}*`);
      if (userData.role) {
        await CacheService.delByPattern(`${CACHE_KEYS.USERS_BY_ROLE}${userData.role}*`);
      }

      return newUser;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error instanceof Error ? error : new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user
   * @param id User ID
   * @param updates User data updates
   * @returns Updated user
   */
  static async updateUser(id: string, updates: Partial<User>): Promise<Partial<User>> {
    try {
      // Validate update data
      const validation = validateUserData(updates);
      if (!validation.valid) {
        throw new Error(`Invalid user data: ${validation.errors?.join(', ')}`);
      }

      // Check if user exists
      const existingUser = await UserService.getUserById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if email is being changed and if it's already in use
      if (updates.email && updates.email !== existingUser.email) {
        const userWithEmail = await UserService.getUserByEmail(updates.email);
        if (userWithEmail && userWithEmail.id !== id) {
          throw new Error('Email already in use by another user');
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(updates.email);
      }

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }

      if (updates.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(updates.role);
      }

      if (updates.permissions !== undefined) {
        updateFields.push(`permissions = $${paramIndex++}`);
        updateValues.push(updates.permissions);
      }

      if (updates.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(updates.avatar_url);
      }

      if (updates.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updates.is_active);
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add user ID to parameters
      updateValues.push(id);

      // Execute update query
      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at
      `;

      const { rows } = await sql.query(query, updateValues);
      const updatedUser = sanitizeUser(rows[0]);

      // Invalidate caches
      await CacheService.del(`${CACHE_KEYS.USER}${id}`);
      await CacheService.del(`${CACHE_KEYS.USERS_BY_EMAIL}${existingUser.email}`);
      if (updates.email) {
        await CacheService.del(`${CACHE_KEYS.USERS_BY_EMAIL}${updates.email}`);
      }
      await CacheService.delByPattern(`${CACHE_KEYS.USERS}*`);
      
      if (existingUser.role) {
        await CacheService.delByPattern(`${CACHE_KEYS.USERS_BY_ROLE}${existingUser.role}*`);
      }
      
      if (updates.role && updates.role !== existingUser.role) {
        await CacheService.delByPattern(`${CACHE_KEYS.USERS_BY_ROLE}${updates.role}*`);
      }

      return updatedUser;
    } catch (error) {
      console.error(`Error in updateUser for ID ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update user');
    }
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns Success status
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      // Check if user exists
      const existingUser = await UserService.getUserById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Delete user
      await sql`
        DELETE FROM users
        WHERE id = ${id}
      `;

      // Invalidate caches
      await CacheService.del(`${CACHE_KEYS.USER}${id}`);
      await CacheService.del(`${CACHE_KEYS.USERS_BY_EMAIL}${existingUser.email}`);
      await CacheService.delByPattern(`${CACHE_KEYS.USERS}*`);
      
      if (existingUser.role) {
        await CacheService.delByPattern(`${CACHE_KEYS.USERS_BY_ROLE}${existingUser.role}*`);
      }

      return true;
    } catch (error) {
      console.error(`Error in deleteUser for ID ${id}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Authenticate a user with email and password
   * @param email User email
   * @param password User password
   * @returns User object if authentication is successful
   */
  static async authenticateUser(email: string, password: string): Promise<Partial<User>> {
    try {
      // Get user with password hash
      const { rows } = await sql`
        SELECT id, email, name, role, permissions, password_hash, avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE email = ${email} AND is_active = true
      `;

      if (rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = rows[0];

      // In a real implementation, you would verify the password hash here
      // For example: const isValid = await bcrypt.compare(password, user.password_hash);
      // For this implementation, we'll just check if the password field exists
      if (!user.password_hash) {
        throw new Error('Invalid credentials');
      }

      // Update last login time
      await sql`
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `;

      // Return sanitized user
      return sanitizeUser(user);
    } catch (error) {
      console.error('Error in authenticateUser:', error);
      throw new Error('Authentication failed');
    }
  }
}