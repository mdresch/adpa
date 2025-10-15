/**
 * Permission Manager Service
 * Manages permissions and permission assignments
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  Permission,
  CreatePermissionRequest
} from '../types'

export class PermissionManager {
  async createPermission(permission: CreatePermissionRequest): Promise<Permission> {
    try {
      logger.info('Creating permission', { permissionName: permission.name })

      const permissionId = `permission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await pool.query(
        `
        INSERT INTO permissions (
          id, name, description, action, resource_type, resource_id, conditions, constraints, metadata, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $10)
        RETURNING *
        `,
        [
          permissionId,
          permission.name,
          permission.description,
          permission.action,
          permission.resource_type,
          permission.resource_id,
          JSON.stringify(permission.conditions),
          JSON.stringify(permission.constraints),
          JSON.stringify(permission.metadata),
          'system' // Would be extracted from request
        ]
      )

      const createdPermission = result.rows[0]

      logger.info('Permission created successfully', {
        permissionId: createdPermission.id,
        permissionName: createdPermission.name
      })

      return {
        id: createdPermission.id,
        name: createdPermission.name,
        description: createdPermission.description,
        action: createdPermission.action,
        resource_type: createdPermission.resource_type,
        resource_id: createdPermission.resource_id,
        conditions: createdPermission.conditions || [],
        constraints: createdPermission.constraints || [],
        metadata: createdPermission.metadata || {},
        created_at: createdPermission.created_at,
        updated_at: createdPermission.updated_at,
        created_by: createdPermission.created_by
      }

    } catch (error) {
      logger.error('Failed to create permission', {
        permissionName: permission.name,
        error: error.message
      })
      throw error
    }
  }

  async updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission> {
    try {
      logger.info('Updating permission', { permissionId })

      const result = await pool.query(
        `
        UPDATE permissions 
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            action = COALESCE($4, action),
            resource_type = COALESCE($5, resource_type),
            resource_id = COALESCE($6, resource_id),
            conditions = COALESCE($7, conditions),
            constraints = COALESCE($8, constraints),
            metadata = COALESCE($9, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [
          permissionId,
          updates.name,
          updates.description,
          updates.action,
          updates.resource_type,
          updates.resource_id,
          updates.conditions ? JSON.stringify(updates.conditions) : null,
          updates.constraints ? JSON.stringify(updates.constraints) : null,
          updates.metadata ? JSON.stringify(updates.metadata) : null
        ]
      )

      if (result.rows.length === 0) {
        throw new Error(`Permission not found: ${permissionId}`)
      }

      const updatedPermission = result.rows[0]

      logger.info('Permission updated successfully', { permissionId })

      return {
        id: updatedPermission.id,
        name: updatedPermission.name,
        description: updatedPermission.description,
        action: updatedPermission.action,
        resource_type: updatedPermission.resource_type,
        resource_id: updatedPermission.resource_id,
        conditions: updatedPermission.conditions || [],
        constraints: updatedPermission.constraints || [],
        metadata: updatedPermission.metadata || {},
        created_at: updatedPermission.created_at,
        updated_at: updatedPermission.updated_at,
        created_by: updatedPermission.created_by
      }

    } catch (error) {
      logger.error('Failed to update permission', {
        permissionId,
        error: error.message
      })
      throw error
    }
  }

  async deletePermission(permissionId: string): Promise<void> {
    try {
      logger.info('Deleting permission', { permissionId })

      // Check if permission is in use
      const usageResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_permissions WHERE permission_id = $1 AND is_active = true',
        [permissionId]
      )

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error(`Cannot delete permission: ${permissionId} - permission is in use`)
      }

      // Delete permission
      await pool.query('DELETE FROM permissions WHERE id = $1', [permissionId])

      logger.info('Permission deleted successfully', { permissionId })

    } catch (error) {
      logger.error('Failed to delete permission', {
        permissionId,
        error: error.message
      })
      throw error
    }
  }

  async listPermissions(filters?: any): Promise<Permission[]> {
    try {
      logger.debug('Listing permissions', { filters })

      let sql = 'SELECT * FROM permissions WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (filters) {
        if (filters.action) {
          sql += ` AND action = $${paramIndex}`
          params.push(filters.action)
          paramIndex++
        }

        if (filters.resource_type) {
          sql += ` AND resource_type = $${paramIndex}`
          params.push(filters.resource_type)
          paramIndex++
        }

        if (filters.resource_id) {
          sql += ` AND resource_id = $${paramIndex}`
          params.push(filters.resource_id)
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

      logger.info('Permissions listed successfully', {
        filters,
        permissionsCount: permissions.length
      })

      return permissions

    } catch (error) {
      logger.error('Failed to list permissions', {
        filters,
        error: error.message
      })
      return []
    }
  }

  async grantPermissions(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Granting permissions', { userId, contextId, permissionsCount: permissions.length })

      for (const permission of permissions) {
        // Check if permission already exists
        const existingPermission = await this.getUserPermission(userId, permission.id, contextId)
        if (existingPermission) {
          // Update existing permission
          await pool.query(
            `
            UPDATE user_permissions 
            SET is_active = true, granted_at = CURRENT_TIMESTAMP, granted_by = $4
            WHERE user_id = $1 AND permission_id = $2 AND context_id = $3
            `,
            [userId, permission.id, contextId, 'system']
          )
        } else {
          // Create new permission
          await pool.query(
            `
            INSERT INTO user_permissions (
              user_id, permission_id, context_id, granted_at, granted_by, is_active
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, true)
            `,
            [userId, permission.id, contextId, 'system']
          )
        }
      }

      logger.info('Permissions granted successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to grant permissions', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async revokePermissions(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Revoking permissions', { userId, contextId, permissionsCount: permissions.length })

      for (const permission of permissions) {
        await pool.query(
          `
          UPDATE user_permissions 
          SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_by = $4
          WHERE user_id = $1 AND permission_id = $2 AND context_id = $3 AND is_active = true
          `,
          [userId, permission.id, contextId, 'system']
        )
      }

      logger.info('Permissions revoked successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to revoke permissions', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async updatePermissions(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Updating permissions', { userId, contextId, permissionsCount: permissions.length })

      // First revoke all existing permissions
      await pool.query(
        `
        UPDATE user_permissions 
        SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_by = $3
        WHERE user_id = $1 AND context_id = $2 AND is_active = true
        `,
        [userId, contextId, 'system']
      )

      // Then grant new permissions
      await this.grantPermissions(userId, contextId, permissions)

      logger.info('Permissions updated successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to update permissions', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async getUserDirectPermissions(userId: string, contextId?: string): Promise<Permission[]> {
    try {
      logger.debug('Getting user direct permissions', { userId, contextId })

      let sql = `
        SELECT p.*
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND up.is_active = true
      `
      const params: any[] = [userId]
      let paramIndex = 2

      if (contextId) {
        sql += ` AND (up.context_id = $${paramIndex} OR up.context_id IS NULL)`
        params.push(contextId)
        paramIndex++
      }

      sql += ' ORDER BY p.name'

      const result = await pool.query(sql, params)

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

      logger.info('User direct permissions retrieved successfully', {
        userId,
        contextId,
        permissionsCount: permissions.length
      })

      return permissions

    } catch (error) {
      logger.error('Failed to get user direct permissions', {
        userId,
        contextId,
        error: error.message
      })
      return []
    }
  }

  async getPermission(permissionId: string): Promise<Permission | null> {
    try {
      const result = await pool.query('SELECT * FROM permissions WHERE id = $1', [permissionId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
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
      }

    } catch (error) {
      logger.error('Failed to get permission', {
        permissionId,
        error: error.message
      })
      return null
    }
  }

  // Private helper methods
  private async getUserPermission(userId: string, permissionId: string, contextId?: string): Promise<Permission | null> {
    try {
      let sql = `
        SELECT p.*
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND up.permission_id = $2 AND up.is_active = true
      `
      const params: any[] = [userId, permissionId]
      let paramIndex = 3

      if (contextId) {
        sql += ` AND (up.context_id = $${paramIndex} OR up.context_id IS NULL)`
        params.push(contextId)
        paramIndex++
      }

      const result = await pool.query(sql, params)

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
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
      }

    } catch (error) {
      logger.error('Failed to get user permission', {
        userId,
        permissionId,
        contextId,
        error: error.message
      })
      return null
    }
  }
}

