/**
 * Context Access Control Manager
 * Manages role-based access control for context data retrieval
 */

import { randomUUID } from 'crypto'
import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { AccessControlEngine } from './services/accessControlEngine'
import { RoleManager } from './services/roleManager'
import { PermissionManager } from './services/permissionManager'
import { SecurityManager } from './services/securityManager'
import { AuditManager } from './services/auditManager'
import type {
  ContextAccessControlManager as IContextAccessControlManager,
  AccessDecision,
  Permission,
  UserRole,
  SecurityLevel,
  ValidationResult,
  AccessAttempt,
  AccessLog,
  AccessReport,
  AccessPatternAnalysis,
  CreatePermissionRequest,
  PermissionFilters,
  AccessLogFilters
} from './types'

export interface ContextAccessControlConfig {
  enableRoleBasedAccess: boolean
  enableAttributeBasedAccess: boolean
  enableContextBasedAccess: boolean
  enableTimeBasedAccess: boolean
  enableLocationBasedAccess: boolean
  enableDeviceBasedAccess: boolean
  enableAuditLogging: boolean
  enableComplianceChecking: boolean
  enableRiskAssessment: boolean
  enableAnomalyDetection: boolean
  defaultSecurityLevel: SecurityLevel
  defaultAccessLevel: string
  sessionTimeout: number
  maxConcurrentSessions: number
}

export class ContextAccessControlManager implements IContextAccessControlManager {
  private accessControlEngine: AccessControlEngine
  private roleManager: RoleManager
  private permissionManager: PermissionManager
  private securityManager: SecurityManager
  private auditManager: AuditManager
  private config: ContextAccessControlConfig

  constructor(config: ContextAccessControlConfig) {
    this.config = config
    this.accessControlEngine = new AccessControlEngine()
    this.roleManager = new RoleManager()
    this.permissionManager = new PermissionManager()
    this.securityManager = new SecurityManager()
    this.auditManager = new AuditManager()
  }

  async checkAccess(userId: string, contextId: string, action: string): Promise<AccessDecision> {
    try {
      logger.info('Checking access', { userId, contextId, action })

      // Get user roles and permissions
      const userRoles = await this.getUserRoles(userId, contextId)
      const userPermissions = await this.getUserPermissions(userId, contextId)
      
      // Get context security level
      const contextSecurityLevel = await this.getContextSecurityLevel(contextId)
      
      // Evaluate access decision
      const accessDecision = await this.accessControlEngine.evaluateAccess({
        userId,
        contextId,
        action,
        userRoles,
        userPermissions,
        contextSecurityLevel
      })

      // Log access attempt
      await this.logAccessAttempt({
        attempt_id: `attempt_${randomUUID()}`,
        user_id: userId,
        context_id: contextId,
        action: action as any,
        timestamp: new Date(),
        ip_address: '127.0.0.1', // Would be extracted from request
        user_agent: 'system', // Would be extracted from request
        session_id: 'session_123', // Would be extracted from request
        result: accessDecision.allowed ? 'success' : 'denied',
        reason: accessDecision.reason,
        duration: 0, // Would be calculated
        metadata: {
          request_size: 0,
          response_size: 0,
          processing_time: 0,
          cache_hit: false,
          security_checks_performed: [],
          compliance_checks_performed: [],
          risk_assessment_performed: false,
          audit_trail_generated: true
        }
      })

      logger.info('Access check completed', {
        userId,
        contextId,
        action,
        allowed: accessDecision.allowed,
        reason: accessDecision.reason
      })

      return accessDecision

    } catch (error) {
      logger.error('Failed to check access', {
        userId,
        contextId,
        action,
        error: error.message
      })
      throw error
    }
  }

  async checkBatchAccess(userId: string, contextIds: string[], action: string): Promise<AccessDecision[]> {
    try {
      logger.info('Checking batch access', { userId, contextIdsCount: contextIds.length, action })

      const accessDecisions: AccessDecision[] = []

      // Process in batches to avoid overwhelming the system
      const batchSize = 10
      for (let i = 0; i < contextIds.length; i += batchSize) {
        const batch = contextIds.slice(i, i + batchSize)
        
        const batchDecisions = await Promise.all(
          batch.map(contextId => this.checkAccess(userId, contextId, action))
        )
        
        accessDecisions.push(...batchDecisions)
      }

      logger.info('Batch access check completed', {
        userId,
        totalContexts: contextIds.length,
        allowedCount: accessDecisions.filter(d => d.allowed).length,
        deniedCount: accessDecisions.filter(d => !d.allowed).length
      })

      return accessDecisions

    } catch (error) {
      logger.error('Failed to check batch access', {
        userId,
        contextIdsCount: contextIds.length,
        action,
        error: error.message
      })
      throw error
    }
  }

  async grantAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Granting access', { userId, contextId, permissionsCount: permissions.length })

      // Validate permissions
      for (const permission of permissions) {
        await this.validatePermission(permission)
      }

      // Grant permissions
      await this.permissionManager.grantPermissions(userId, contextId, permissions)

      // Log access grant
      await this.auditManager.logAccessGrant({
        user_id: userId,
        context_id: contextId,
        permissions,
        granted_by: 'system', // Would be extracted from request
        granted_at: new Date(),
        reason: 'Access granted by administrator'
      })

      logger.info('Access granted successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to grant access', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async revokeAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Revoking access', { userId, contextId, permissionsCount: permissions.length })

      // Revoke permissions
      await this.permissionManager.revokePermissions(userId, contextId, permissions)

      // Log access revocation
      await this.auditManager.logAccessRevocation({
        user_id: userId,
        context_id: contextId,
        permissions,
        revoked_by: 'system', // Would be extracted from request
        revoked_at: new Date(),
        reason: 'Access revoked by administrator'
      })

      logger.info('Access revoked successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to revoke access', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async updateAccess(userId: string, contextId: string, permissions: Permission[]): Promise<void> {
    try {
      logger.info('Updating access', { userId, contextId, permissionsCount: permissions.length })

      // Validate permissions
      for (const permission of permissions) {
        await this.validatePermission(permission)
      }

      // Update permissions
      await this.permissionManager.updatePermissions(userId, contextId, permissions)

      // Log access update
      await this.auditManager.logAccessUpdate({
        user_id: userId,
        context_id: contextId,
        permissions,
        updated_by: 'system', // Would be extracted from request
        updated_at: new Date(),
        reason: 'Access updated by administrator'
      })

      logger.info('Access updated successfully', { userId, contextId, permissionsCount: permissions.length })

    } catch (error) {
      logger.error('Failed to update access', {
        userId,
        contextId,
        permissionsCount: permissions.length,
        error: error.message
      })
      throw error
    }
  }

  async assignRole(userId: string, roleId: string, contextId?: string): Promise<void> {
    try {
      logger.info('Assigning role', { userId, roleId, contextId })

      // Assign role
      await this.roleManager.assignRole(userId, roleId, contextId)

      // Log role assignment
      await this.auditManager.logRoleAssignment({
        user_id: userId,
        role_id: roleId,
        context_id: contextId,
        assigned_by: 'system', // Would be extracted from request
        assigned_at: new Date(),
        reason: 'Role assigned by administrator'
      })

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
      await this.roleManager.removeRole(userId, roleId, contextId)

      // Log role removal
      await this.auditManager.logRoleRemoval({
        user_id: userId,
        role_id: roleId,
        context_id: contextId,
        removed_by: 'system', // Would be extracted from request
        removed_at: new Date(),
        reason: 'Role removed by administrator'
      })

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

      const userRoles = await this.roleManager.getUserRoles(userId, contextId)

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

      const permissions = await this.roleManager.getRolePermissions(roleId)

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

  async createPermission(permission: CreatePermissionRequest): Promise<Permission> {
    try {
      logger.info('Creating permission', { permissionName: permission.name })

      const createdPermission = await this.permissionManager.createPermission(permission)

      // Log permission creation
      await this.auditManager.logPermissionCreation({
        permission_id: createdPermission.id,
        permission_name: createdPermission.name,
        created_by: 'system', // Would be extracted from request
        created_at: new Date(),
        reason: 'Permission created by administrator'
      })

      logger.info('Permission created successfully', {
        permissionId: createdPermission.id,
        permissionName: createdPermission.name
      })

      return createdPermission

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

      const updatedPermission = await this.permissionManager.updatePermission(permissionId, updates)

      // Log permission update
      await this.auditManager.logPermissionUpdate({
        permission_id: permissionId,
        updates,
        updated_by: 'system', // Would be extracted from request
        updated_at: new Date(),
        reason: 'Permission updated by administrator'
      })

      logger.info('Permission updated successfully', { permissionId })

      return updatedPermission

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

      await this.permissionManager.deletePermission(permissionId)

      // Log permission deletion
      await this.auditManager.logPermissionDeletion({
        permission_id: permissionId,
        deleted_by: 'system', // Would be extracted from request
        deleted_at: new Date(),
        reason: 'Permission deleted by administrator'
      })

      logger.info('Permission deleted successfully', { permissionId })

    } catch (error) {
      logger.error('Failed to delete permission', {
        permissionId,
        error: error.message
      })
      throw error
    }
  }

  async listPermissions(filters?: PermissionFilters): Promise<Permission[]> {
    try {
      logger.debug('Listing permissions', { filters })

      const permissions = await this.permissionManager.listPermissions(filters)

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

  async setContextSecurityLevel(contextId: string, securityLevel: SecurityLevel): Promise<void> {
    try {
      logger.info('Setting context security level', { contextId, securityLevel })

      await this.securityManager.setContextSecurityLevel(contextId, securityLevel)

      // Log security level change
      await this.auditManager.logSecurityLevelChange({
        context_id: contextId,
        old_security_level: 'internal', // Would be retrieved from current state
        new_security_level: securityLevel,
        changed_by: 'system', // Would be extracted from request
        changed_at: new Date(),
        reason: 'Security level changed by administrator'
      })

      logger.info('Context security level set successfully', { contextId, securityLevel })

    } catch (error) {
      logger.error('Failed to set context security level', {
        contextId,
        securityLevel,
        error: error.message
      })
      throw error
    }
  }

  async getContextSecurityLevel(contextId: string): Promise<SecurityLevel> {
    try {
      logger.debug('Getting context security level', { contextId })

      const securityLevel = await this.securityManager.getContextSecurityLevel(contextId)

      logger.info('Context security level retrieved successfully', {
        contextId,
        securityLevel
      })

      return securityLevel

    } catch (error) {
      logger.error('Failed to get context security level', {
        contextId,
        error: error.message
      })
      return this.config.defaultSecurityLevel
    }
  }

  async validateContextAccess(userId: string, contextId: string): Promise<ValidationResult> {
    try {
      logger.info('Validating context access', { userId, contextId })

      const validationResult = await this.securityManager.validateContextAccess(userId, contextId)

      logger.info('Context access validation completed', {
        userId,
        contextId,
        valid: validationResult.valid,
        errorsCount: validationResult.validation_errors.length,
        warningsCount: validationResult.validation_warnings.length
      })

      return validationResult

    } catch (error) {
      logger.error('Failed to validate context access', {
        userId,
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async logAccessAttempt(accessAttempt: AccessAttempt): Promise<void> {
    try {
      logger.debug('Logging access attempt', { 
        attemptId: accessAttempt.attempt_id,
        userId: accessAttempt.user_id,
        contextId: accessAttempt.context_id,
        action: accessAttempt.action,
        result: accessAttempt.result
      })

      await this.auditManager.logAccessAttempt(accessAttempt)

      logger.info('Access attempt logged successfully', {
        attemptId: accessAttempt.attempt_id,
        result: accessAttempt.result
      })

    } catch (error) {
      logger.error('Failed to log access attempt', {
        attemptId: accessAttempt.attempt_id,
        error: error.message
      })
      throw error
    }
  }

  async getAccessLogs(filters?: AccessLogFilters): Promise<AccessLog[]> {
    try {
      logger.debug('Getting access logs', { filters })

      const accessLogs = await this.auditManager.getAccessLogs(filters)

      logger.info('Access logs retrieved successfully', {
        filters,
        logsCount: accessLogs.length
      })

      return accessLogs

    } catch (error) {
      logger.error('Failed to get access logs', {
        filters,
        error: error.message
      })
      return []
    }
  }

  async generateAccessReport(timeframe: string): Promise<AccessReport> {
    try {
      logger.info('Generating access report', { timeframe })

      const accessReport = await this.auditManager.generateAccessReport(timeframe)

      logger.info('Access report generated successfully', {
        timeframe,
        reportId: accessReport.report_id,
        totalAccessAttempts: accessReport.total_access_attempts
      })

      return accessReport

    } catch (error) {
      logger.error('Failed to generate access report', {
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async monitorAccessPatterns(): Promise<AccessPatternAnalysis> {
    try {
      logger.info('Monitoring access patterns')

      const patternAnalysis = await this.auditManager.monitorAccessPatterns()

      logger.info('Access patterns monitoring completed', {
        analysisId: patternAnalysis.analysis_id,
        totalAccesses: patternAnalysis.total_accesses,
        uniqueUsers: patternAnalysis.unique_users,
        anomaliesCount: patternAnalysis.anomalies.length
      })

      return patternAnalysis

    } catch (error) {
      logger.error('Failed to monitor access patterns', {
        error: error.message
      })
      throw error
    }
  }

  // Private helper methods
  private async getUserPermissions(userId: string, contextId?: string): Promise<Permission[]> {
    try {
      // Get permissions from user roles
      const userRoles = await this.getUserRoles(userId, contextId)
      const permissions: Permission[] = []

      for (const userRole of userRoles) {
        const rolePermissions = await this.getRolePermissions(userRole.role_id)
        permissions.push(...rolePermissions)
      }

      // Get direct permissions
      const directPermissions = await this.permissionManager.getUserDirectPermissions(userId, contextId)
      permissions.push(...directPermissions)

      // Remove duplicates
      const uniquePermissions = permissions.filter((permission, index, self) => 
        index === self.findIndex(p => p.id === permission.id)
      )

      return uniquePermissions

    } catch (error) {
      logger.error('Failed to get user permissions', {
        userId,
        contextId,
        error: error.message
      })
      return []
    }
  }

  private async validatePermission(permission: Permission): Promise<void> {
    try {
      // Validate permission structure
      if (!permission.id || !permission.name || !permission.action) {
        throw new Error('Invalid permission structure')
      }

      // Validate permission conditions
      for (const condition of permission.conditions) {
        if (!condition.condition_type || !condition.field || !condition.operator) {
          throw new Error('Invalid permission condition structure')
        }
      }

      // Validate permission constraints
      for (const constraint of permission.constraints) {
        if (!constraint.constraint_type || constraint.constraint_value === undefined) {
          throw new Error('Invalid permission constraint structure')
        }
      }

    } catch (error) {
      logger.error('Failed to validate permission', {
        permissionId: permission.id,
        error: error.message
      })
      throw error
    }
  }
}

