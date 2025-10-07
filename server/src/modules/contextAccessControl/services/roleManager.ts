/**
 * Role Manager Service
 * Manages user roles and role assignments
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  UserRole,
  Permission,
  Role
} from '../types'

export class RoleManager {
  async assignRole(userId: string, roleId: string, contextId?: string): Promise<void> {
    try {
      logger.info('Assigning role', { userId, roleId, contextId })

      // Check if role exists
      const role = await this.getRole(roleId)
      if (!role) {
        throw new Error(`Role not found: ${roleId}`)
      }

      // Check if user already has this role
      const existingRole = await this.getUserRole(userId, roleId, contextId)
      if (existingRole) {
        throw new Error(`User already has role: ${roleId}`)
      }

      // Assign role
      await pool.query(
        `
        INSERT INTO user_roles (
          user_id, role_id, context_id, assigned_at, assigned_by, is_active
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, true)
        `,
        [userId, roleId, contextId, 'system'] // Would be extracted from request
      )

      logger.info('Role assigned successfully', { userId, roleId, contextId })

    } catch (error) {
      logger.error('Failed to assign role', {
        userId,
        roleId,
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async removeRole(userId: string, roleId: string, contextId?: string): Promise<void> {
    try {
      logger.info('Removing role', { userId, roleId, contextId })

      // Remove role
      await pool.query(
        `
        UPDATE user_roles 
        SET is_active = false, removed_at = CURRENT_TIMESTAMP, removed_by = $4
        WHERE user_id = $1 AND role_id = $2 AND (context_id = $3 OR context_id IS NULL) AND is_active = true
        `,
        [userId, roleId, contextId, 'system'] // Would be extracted from request
      )

      logger.info('Role removed successfully', { userId, roleId, contextId })

    } catch (error) {
      logger.error('Failed to remove role', {
        userId,
        roleId,
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async getUserRoles(userId: string, contextId?: string): Promise<UserRole[]> {
    try {
      logger.debug('Getting user roles', { userId, contextId })

      let sql = `
        SELECT 
          ur.id, ur.user_id, ur.role_id, ur.context_id, ur.assigned_at, ur.assigned_by,
          ur.expires_at, ur.is_active,
          r.name as role_name, r.description as role_description,
          c.name as context_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN contexts c ON ur.context_id = c.id
        WHERE ur.user_id = $1 AND ur.is_active = true
      `
      const params: any[] = [userId]
      let paramIndex = 2

      if (contextId) {
        sql += ` AND (ur.context_id = $${paramIndex} OR ur.context_id IS NULL)`
        params.push(contextId)
        paramIndex++
      }

      sql += ` ORDER BY ur.assigned_at DESC`

      const result = await pool.query(sql, params)

      const userRoles: UserRole[] = []

      for (const row of result.rows) {
        // Get role permissions
        const permissions = await this.getRolePermissions(row.role_id)

        userRoles.push({
          id: row.id,
          user_id: row.user_id,
          role_id: row.role_id,
          role_name: row.role_name,
          role_description: row.role_description,
          context_id: row.context_id,
          context_name: row.context_name,
          assigned_at: row.assigned_at,
          assigned_by: row.assigned_by,
          expires_at: row.expires_at,
          is_active: row.is_active,
          permissions,
          metadata: {
            assignment_reason: 'Role assigned by administrator',
            approval_workflow: 'standard',
            review_required: false,
            compliance_notes: [],
            risk_assessment: 'low'
          }
        })
      }

      logger.info('User roles retrieved successfully', {
        userId,
        contextId,
        rolesCount: userRoles.length
      })

      return userRoles

    } catch (error) {
      logger.error('Failed to get user roles', {
        userId,
        contextId,
        error: error.message
      })
      return []
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      logger.debug('Getting role permissions', { roleId })

      const result = await pool.query(
        `
        SELECT p.*
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND p.is_active = true
        ORDER BY p.name
        `,
        [roleId]
      )

      const permissions: Permission[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        action: row.action,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        conditions: row.conditions || [],
        constraints: row.constraints || [],
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
      }))

      logger.info('Role permissions retrieved successfully', {
        roleId,
        permissionsCount: permissions.length
      })

      return permissions

    } catch (error) {
      logger.error('Failed to get role permissions', {
        roleId,
        error: error.message
      })
      return []
    }
  }

  async createRole(role: Partial<Role>): Promise<Role> {
    try {
      logger.info('Creating role', { roleName: role.name })

      const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await pool.query(
        `
        INSERT INTO roles (
          id, name, description, role_type, permissions, constraints, metadata, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $8)
        RETURNING *
        `,
        [
          roleId,
          role.name,
          role.description,
          role.role_type,
          JSON.stringify(role.permissions || []),
          JSON.stringify(role.constraints || []),
          JSON.stringify(role.metadata || {}),
          'system' // Would be extracted from request
        ]
      )

      const createdRole = result.rows[0]

      logger.info('Role created successfully', {
        roleId: createdRole.id,
        roleName: createdRole.name
      })

      return {
        id: createdRole.id,
        name: createdRole.name,
        description: createdRole.description,
        role_type: createdRole.role_type,
        permissions: createdRole.permissions || [],
        constraints: createdRole.constraints || [],
        metadata: createdRole.metadata || {},
        created_at: createdRole.created_at,
        updated_at: createdRole.updated_at,
        created_by: createdRole.created_by
      }

    } catch (error) {
      logger.error('Failed to create role', {
        roleName: role.name,
        error: error.message
      })
      throw error
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    try {
      logger.info('Updating role', { roleId })

      const result = await pool.query(
        `
        UPDATE roles 
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            role_type = COALESCE($4, role_type),
            permissions = COALESCE($5, permissions),
            constraints = COALESCE($6, constraints),
            metadata = COALESCE($7, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [
          roleId,
          updates.name,
          updates.description,
          updates.role_type,
          updates.permissions ? JSON.stringify(updates.permissions) : null,
          updates.constraints ? JSON.stringify(updates.constraints) : null,
          updates.metadata ? JSON.stringify(updates.metadata) : null
        ]
      )

      if (result.rows.length === 0) {
        throw new Error(`Role not found: ${roleId}`)
      }

      const updatedRole = result.rows[0]

      logger.info('Role updated successfully', { roleId })

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        role_type: updatedRole.role_type,
        permissions: updatedRole.permissions || [],
        constraints: updatedRole.constraints || [],
        metadata: updatedRole.metadata || {},
        created_at: updatedRole.created_at,
        updated_at: updatedRole.updated_at,
        created_by: updatedRole.created_by
      }

    } catch (error) {
      logger.error('Failed to update role', {
        roleId,
        error: error.message
      })
      throw error
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    try {
      logger.info('Deleting role', { roleId })

      // Check if role is in use
      const usageResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1 AND is_active = true',
        [roleId]
      )

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error(`Cannot delete role: ${roleId} - role is in use`)
      }

      // Delete role
      await pool.query('DELETE FROM roles WHERE id = $1', [roleId])

      logger.info('Role deleted successfully', { roleId })

    } catch (error) {
      logger.error('Failed to delete role', {
        roleId,
        error: error.message
      })
      throw error
    }
  }

  async listRoles(filters?: any): Promise<Role[]> {
    try {
      logger.debug('Listing roles', { filters })

      let sql = 'SELECT * FROM roles WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (filters) {
        if (filters.role_type) {
          sql += ` AND role_type = $${paramIndex}`
          params.push(filters.role_type)
          paramIndex++
        }

        if (filters.created_by) {
          sql += ` AND created_by = $${paramIndex}`
          params.push(filters.created_by)
          paramIndex++
        }
      }

      sql += ' ORDER BY name'

      const result = await pool.query(sql, params)

      const roles: Role[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        role_type: row.role_type,
        permissions: row.permissions || [],
        constraints: row.constraints || [],
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
      }))

      logger.info('Roles listed successfully', {
        filters,
        rolesCount: roles.length
      })

      return roles

    } catch (error) {
      logger.error('Failed to list roles', {
        filters,
        error: error.message
      })
      return []
    }
  }

  // Private helper methods
  private async getRole(roleId: string): Promise<Role | null> {
    try {
      const result = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        role_type: row.role_type,
        permissions: row.permissions || [],
        constraints: row.constraints || [],
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
      }

    } catch (error) {
      logger.error('Failed to get role', {
        roleId,
        error: error.message
      })
      return null
    }
  }

  private async getUserRole(userId: string, roleId: string, contextId?: string): Promise<UserRole | null> {
    try {
      let sql = `
        SELECT * FROM user_roles 
        WHERE user_id = $1 AND role_id = $2 AND is_active = true
      `
      const params: any[] = [userId, roleId]
      let paramIndex = 3

      if (contextId) {
        sql += ` AND (context_id = $${paramIndex} OR context_id IS NULL)`
        params.push(contextId)
        paramIndex++
      }

      const result = await pool.query(sql, params)

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      const permissions = await this.getRolePermissions(roleId)

      return {
        id: row.id,
        user_id: row.user_id,
        role_id: row.role_id,
        role_name: 'Unknown Role', // Would be retrieved from roles table
        role_description: 'Unknown Role Description',
        context_id: row.context_id,
        context_name: undefined,
        assigned_at: row.assigned_at,
        assigned_by: row.assigned_by,
        expires_at: row.expires_at,
        is_active: row.is_active,
        permissions,
        metadata: {
          assignment_reason: 'Role assigned by administrator',
          approval_workflow: 'standard',
          review_required: false,
          compliance_notes: [],
          risk_assessment: 'low'
        }
      }

    } catch (error) {
      logger.error('Failed to get user role', {
        userId,
        roleId,
        contextId,
        error: error.message
      })
      return null
    }
  }
}

