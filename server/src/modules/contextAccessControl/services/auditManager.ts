/**
 * Audit Manager Service
 * Manages audit logging and access monitoring
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  AccessAttempt,
  AccessLog,
  AccessReport,
  AccessPatternAnalysis,
  AccessLogFilters
} from '../types'

export class AuditManager {
  async logAccessAttempt(accessAttempt: AccessAttempt): Promise<void> {
    try {
      logger.debug('Logging access attempt', { 
        attemptId: accessAttempt.attempt_id,
        userId: accessAttempt.user_id,
        contextId: accessAttempt.context_id,
        action: accessAttempt.action,
        result: accessAttempt.result
      })

      // Store access attempt
      await pool.query(
        `
        INSERT INTO access_attempts (
          attempt_id, user_id, context_id, action, timestamp, ip_address, user_agent,
          session_id, result, reason, duration, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          accessAttempt.attempt_id,
          accessAttempt.user_id,
          accessAttempt.context_id,
          accessAttempt.action,
          accessAttempt.timestamp,
          accessAttempt.ip_address,
          accessAttempt.user_agent,
          accessAttempt.session_id,
          accessAttempt.result,
          accessAttempt.reason,
          accessAttempt.duration,
          JSON.stringify(accessAttempt.metadata)
        ]
      )

      // Also store in access log
      await this.storeAccessLog(accessAttempt)

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

      let sql = `
        SELECT 
          aa.attempt_id as id, aa.user_id, aa.context_id, aa.action, aa.timestamp,
          aa.ip_address, aa.user_agent, aa.session_id, aa.result, aa.reason, aa.duration,
          c.security_level, ur.access_level, aa.metadata
        FROM access_attempts aa
        LEFT JOIN contexts c ON aa.context_id = c.id
        LEFT JOIN user_roles ur ON aa.user_id = ur.user_id
        WHERE 1=1
      `
      const params: any[] = []
      let paramIndex = 1

      // Apply filters
      if (filters) {
        if (filters.user_id) {
          sql += ` AND aa.user_id = $${paramIndex}`
          params.push(filters.user_id)
          paramIndex++
        }

        if (filters.context_id) {
          sql += ` AND aa.context_id = $${paramIndex}`
          params.push(filters.context_id)
          paramIndex++
        }

        if (filters.action) {
          sql += ` AND aa.action = $${paramIndex}`
          params.push(filters.action)
          paramIndex++
        }

        if (filters.result) {
          sql += ` AND aa.result = $${paramIndex}`
          params.push(filters.result)
          paramIndex++
        }

        if (filters.security_level) {
          sql += ` AND c.security_level = $${paramIndex}`
          params.push(filters.security_level)
          paramIndex++
        }

        if (filters.access_level) {
          sql += ` AND ur.access_level = $${paramIndex}`
          params.push(filters.access_level)
          paramIndex++
        }

        if (filters.timestamp_after) {
          sql += ` AND aa.timestamp >= $${paramIndex}`
          params.push(filters.timestamp_after)
          paramIndex++
        }

        if (filters.timestamp_before) {
          sql += ` AND aa.timestamp <= $${paramIndex}`
          params.push(filters.timestamp_before)
          paramIndex++
        }

        if (filters.ip_address) {
          sql += ` AND aa.ip_address = $${paramIndex}`
          params.push(filters.ip_address)
          paramIndex++
        }

        if (filters.session_id) {
          sql += ` AND aa.session_id = $${paramIndex}`
          params.push(filters.session_id)
          paramIndex++
        }
      }

      sql += ' ORDER BY aa.timestamp DESC'

      const result = await pool.query(sql, params)

      const accessLogs: AccessLog[] = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        context_id: row.context_id,
        action: row.action,
        timestamp: row.timestamp,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        session_id: row.session_id,
        result: row.result,
        reason: row.reason,
        duration: row.duration,
        security_level: row.security_level || 'internal',
        access_level: row.access_level || 'read_only',
        restrictions_applied: [],
        metadata: row.metadata || {}
      }))

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

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const generatedAt = new Date()

      // Get access data for the timeframe
      const accessData = await this.getAccessDataForTimeframe(timeframe)
      
      // Calculate report metrics
      const totalAccessAttempts = accessData.length
      const successfulAccesses = accessData.filter(log => log.result === 'success').length
      const failedAccesses = accessData.filter(log => log.result === 'failure').length
      const deniedAccesses = accessData.filter(log => log.result === 'denied').length

      // Generate access by user
      const accessByUser = await this.generateAccessByUser(accessData)
      
      // Generate access by context
      const accessByContext = await this.generateAccessByContext(accessData)
      
      // Generate access by action
      const accessByAction = await this.generateAccessByAction(accessData)

      // Identify security incidents
      const securityIncidents = await this.identifySecurityIncidents(accessData)
      
      // Identify compliance violations
      const complianceViolations = await this.identifyComplianceViolations(accessData)

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(accessData)

      // Generate recommendations
      const recommendations = await this.generateAccessReportRecommendations(accessData, securityIncidents, complianceViolations)

      // Generate trends
      const trends = await this.generateAccessTrends(accessData, timeframe)

      const accessReport: AccessReport = {
        report_id: reportId,
        generated_at: generatedAt,
        timeframe,
        total_access_attempts: totalAccessAttempts,
        successful_accesses: successfulAccesses,
        failed_accesses: failedAccesses,
        denied_accesses: deniedAccesses,
        access_by_user: accessByUser,
        access_by_context: accessByContext,
        access_by_action: accessByAction,
        security_incidents: securityIncidents,
        compliance_violations: complianceViolations,
        risk_assessment: riskAssessment,
        recommendations,
        trends
      }

      // Store report
      await this.storeAccessReport(accessReport)

      logger.info('Access report generated successfully', {
        reportId,
        timeframe,
        totalAccessAttempts,
        successfulAccesses,
        failedAccesses,
        deniedAccesses
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

      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const analyzedAt = new Date()

      // Get recent access data
      const recentAccessData = await this.getRecentAccessData()
      
      // Analyze access patterns
      const accessPatterns = await this.analyzeAccessPatterns(recentAccessData)
      
      // Detect anomalies
      const anomalies = await this.detectAccessAnomalies(recentAccessData)
      
      // Identify risk indicators
      const riskIndicators = await this.identifyRiskIndicators(recentAccessData)
      
      // Generate recommendations
      const recommendations = await this.generatePatternRecommendations(accessPatterns, anomalies, riskIndicators)
      
      // Generate trends
      const trends = await this.generateAccessTrends(recentAccessData, '24h')

      const patternAnalysis: AccessPatternAnalysis = {
        analysis_id: analysisId,
        analyzed_at: analyzedAt,
        timeframe: '24h',
        total_accesses: recentAccessData.length,
        unique_users: new Set(recentAccessData.map(log => log.user_id)).size,
        unique_contexts: new Set(recentAccessData.map(log => log.context_id)).size,
        access_patterns: accessPatterns,
        anomalies,
        risk_indicators: riskIndicators,
        recommendations,
        trends
      }

      // Store analysis
      await this.storeAccessPatternAnalysis(patternAnalysis)

      logger.info('Access patterns monitoring completed', {
        analysisId,
        totalAccesses: patternAnalysis.total_accesses,
        uniqueUsers: patternAnalysis.unique_users,
        uniqueContexts: patternAnalysis.unique_contexts,
        patternsCount: accessPatterns.length,
        anomaliesCount: anomalies.length
      })

      return patternAnalysis

    } catch (error) {
      logger.error('Failed to monitor access patterns', {
        error: error.message
      })
      throw error
    }
  }

  // Audit logging methods
  async logAccessGrant(grantData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_grant_log (
          user_id, context_id, permissions, granted_by, granted_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          grantData.user_id,
          grantData.context_id,
          JSON.stringify(grantData.permissions),
          grantData.granted_by,
          grantData.granted_at,
          grantData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log access grant', {
        userId: grantData.user_id,
        contextId: grantData.context_id,
        error: error.message
      })
    }
  }

  async logAccessRevocation(revocationData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_revocation_log (
          user_id, context_id, permissions, revoked_by, revoked_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          revocationData.user_id,
          revocationData.context_id,
          JSON.stringify(revocationData.permissions),
          revocationData.revoked_by,
          revocationData.revoked_at,
          revocationData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log access revocation', {
        userId: revocationData.user_id,
        contextId: revocationData.context_id,
        error: error.message
      })
    }
  }

  async logAccessUpdate(updateData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_update_log (
          user_id, context_id, permissions, updated_by, updated_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          updateData.user_id,
          updateData.context_id,
          JSON.stringify(updateData.permissions),
          updateData.updated_by,
          updateData.updated_at,
          updateData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log access update', {
        userId: updateData.user_id,
        contextId: updateData.context_id,
        error: error.message
      })
    }
  }

  async logRoleAssignment(assignmentData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO role_assignment_log (
          user_id, role_id, context_id, assigned_by, assigned_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          assignmentData.user_id,
          assignmentData.role_id,
          assignmentData.context_id,
          assignmentData.assigned_by,
          assignmentData.assigned_at,
          assignmentData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log role assignment', {
        userId: assignmentData.user_id,
        roleId: assignmentData.role_id,
        error: error.message
      })
    }
  }

  async logRoleRemoval(removalData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO role_removal_log (
          user_id, role_id, context_id, removed_by, removed_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          removalData.user_id,
          removalData.role_id,
          removalData.context_id,
          removalData.removed_by,
          removalData.removed_at,
          removalData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log role removal', {
        userId: removalData.user_id,
        roleId: removalData.role_id,
        error: error.message
      })
    }
  }

  async logPermissionCreation(creationData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO permission_creation_log (
          permission_id, permission_name, created_by, created_at, reason
        ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          creationData.permission_id,
          creationData.permission_name,
          creationData.created_by,
          creationData.created_at,
          creationData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log permission creation', {
        permissionId: creationData.permission_id,
        error: error.message
      })
    }
  }

  async logPermissionUpdate(updateData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO permission_update_log (
          permission_id, updates, updated_by, updated_at, reason
        ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          updateData.permission_id,
          JSON.stringify(updateData.updates),
          updateData.updated_by,
          updateData.updated_at,
          updateData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log permission update', {
        permissionId: updateData.permission_id,
        error: error.message
      })
    }
  }

  async logPermissionDeletion(deletionData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO permission_deletion_log (
          permission_id, deleted_by, deleted_at, reason
        ) VALUES ($1, $2, $3, $4)
        `,
        [
          deletionData.permission_id,
          deletionData.deleted_by,
          deletionData.deleted_at,
          deletionData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log permission deletion', {
        permissionId: deletionData.permission_id,
        error: error.message
      })
    }
  }

  async logSecurityLevelChange(changeData: any): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO security_level_change_log (
          context_id, old_security_level, new_security_level, changed_by, changed_at, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          changeData.context_id,
          changeData.old_security_level,
          changeData.new_security_level,
          changeData.changed_by,
          changeData.changed_at,
          changeData.reason
        ]
      )

    } catch (error) {
      logger.error('Failed to log security level change', {
        contextId: changeData.context_id,
        error: error.message
      })
    }
  }

  // Private helper methods
  private async storeAccessLog(accessAttempt: AccessAttempt): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_logs (
          user_id, context_id, action, timestamp, ip_address, user_agent, session_id,
          result, reason, duration, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          accessAttempt.user_id,
          accessAttempt.context_id,
          accessAttempt.action,
          accessAttempt.timestamp,
          accessAttempt.ip_address,
          accessAttempt.user_agent,
          accessAttempt.session_id,
          accessAttempt.result,
          accessAttempt.reason,
          accessAttempt.duration,
          JSON.stringify(accessAttempt.metadata)
        ]
      )

    } catch (error) {
      logger.error('Failed to store access log', {
        attemptId: accessAttempt.attempt_id,
        error: error.message
      })
    }
  }

  private async getAccessDataForTimeframe(timeframe: string): Promise<AccessLog[]> {
    try {
      let sql = `
        SELECT * FROM access_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 ${timeframe}'
        ORDER BY timestamp DESC
      `

      const result = await pool.query(sql)
      return result.rows

    } catch (error) {
      logger.error('Failed to get access data for timeframe', {
        timeframe,
        error: error.message
      })
      return []
    }
  }

  private async getRecentAccessData(): Promise<AccessLog[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM access_logs 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC
        `
      )

      return result.rows

    } catch (error) {
      logger.error('Failed to get recent access data', {
        error: error.message
      })
      return []
    }
  }

  private async generateAccessByUser(accessData: AccessLog[]): Promise<any[]> {
    // Generate access statistics by user
    const userStats: Record<string, any> = {}

    for (const log of accessData) {
      if (!userStats[log.user_id]) {
        userStats[log.user_id] = {
          user_id: log.user_id,
          username: 'Unknown User', // Would be retrieved from users table
          total_accesses: 0,
          successful_accesses: 0,
          failed_accesses: 0,
          denied_accesses: 0,
          average_duration: 0,
          security_level: log.security_level,
          risk_score: 0
        }
      }

      const stats = userStats[log.user_id]
      stats.total_accesses++
      
      if (log.result === 'success') {
        stats.successful_accesses++
      } else if (log.result === 'failure') {
        stats.failed_accesses++
      } else if (log.result === 'denied') {
        stats.denied_accesses++
      }

      stats.average_duration = (stats.average_duration + log.duration) / 2
    }

    return Object.values(userStats)
  }

  private async generateAccessByContext(accessData: AccessLog[]): Promise<any[]> {
    // Generate access statistics by context
    const contextStats: Record<string, any> = {}

    for (const log of accessData) {
      if (!contextStats[log.context_id]) {
        contextStats[log.context_id] = {
          context_id: log.context_id,
          context_name: 'Unknown Context', // Would be retrieved from contexts table
          total_accesses: 0,
          successful_accesses: 0,
          failed_accesses: 0,
          denied_accesses: 0,
          unique_users: new Set(),
          security_level: log.security_level,
          risk_score: 0
        }
      }

      const stats = contextStats[log.context_id]
      stats.total_accesses++
      stats.unique_users.add(log.user_id)
      
      if (log.result === 'success') {
        stats.successful_accesses++
      } else if (log.result === 'failure') {
        stats.failed_accesses++
      } else if (log.result === 'denied') {
        stats.denied_accesses++
      }
    }

    // Convert sets to counts
    for (const stats of Object.values(contextStats)) {
      stats.unique_users = stats.unique_users.size
    }

    return Object.values(contextStats)
  }

  private async generateAccessByAction(accessData: AccessLog[]): Promise<any[]> {
    // Generate access statistics by action
    const actionStats: Record<string, any> = {}

    for (const log of accessData) {
      if (!actionStats[log.action]) {
        actionStats[log.action] = {
          action: log.action,
          total_attempts: 0,
          successful_attempts: 0,
          failed_attempts: 0,
          denied_attempts: 0,
          average_duration: 0,
          risk_score: 0
        }
      }

      const stats = actionStats[log.action]
      stats.total_attempts++
      
      if (log.result === 'success') {
        stats.successful_attempts++
      } else if (log.result === 'failure') {
        stats.failed_attempts++
      } else if (log.result === 'denied') {
        stats.denied_attempts++
      }

      stats.average_duration = (stats.average_duration + log.duration) / 2
    }

    return Object.values(actionStats)
  }

  private async identifySecurityIncidents(accessData: AccessLog[]): Promise<any[]> {
    // Identify security incidents from access data
    const incidents: any[] = []

    // Check for suspicious access patterns
    const suspiciousAccesses = accessData.filter(log => 
      log.result === 'denied' && log.duration > 5000 // Long duration denied access
    )

    for (const access of suspiciousAccesses) {
      incidents.push({
        incident_id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incident_type: 'Suspicious Access Attempt',
        severity: 'medium',
        description: 'Long duration denied access attempt',
        detected_at: access.timestamp,
        user_id: access.user_id,
        context_id: access.context_id,
        action: access.action,
        ip_address: access.ip_address,
        risk_factors: [],
        mitigation_taken: [],
        status: 'open',
        resolution: '',
        metadata: {}
      })
    }

    return incidents
  }

  private async identifyComplianceViolations(accessData: AccessLog[]): Promise<any[]> {
    // Identify compliance violations from access data
    const violations: any[] = []

    // Check for unauthorized access to sensitive data
    const unauthorizedAccesses = accessData.filter(log => 
      log.security_level === 'top_secret' && log.result === 'success'
    )

    for (const access of unauthorizedAccesses) {
      violations.push({
        violation_type: 'Unauthorized Access to Sensitive Data',
        severity: 'high',
        description: 'Access to top secret data without proper authorization',
        regulation: 'Internal Security Policy',
        impact: 'Potential data breach',
        remediation: 'Review and revoke unauthorized access'
      })
    }

    return violations
  }

  private async performRiskAssessment(accessData: AccessLog[]): Promise<any> {
    // Perform risk assessment based on access data
    const riskFactors: any[] = []
    let riskScore = 0

    // Calculate risk based on denied access attempts
    const deniedAccesses = accessData.filter(log => log.result === 'denied').length
    if (deniedAccesses > 10) {
      riskFactors.push({
        factor: 'High number of denied access attempts',
        risk_level: 'high',
        probability: 0.8,
        impact: 0.7,
        description: `${deniedAccesses} denied access attempts detected`,
        mitigation: 'Investigate and address access issues'
      })
      riskScore += 0.8
    }

    return {
      risk_level: riskScore > 1.0 ? 'high' : riskScore > 0.5 ? 'medium' : 'low',
      risk_factors: riskFactors,
      risk_score: riskScore,
      mitigation_strategies: [],
      monitoring_requirements: []
    }
  }

  private async generateAccessReportRecommendations(accessData: AccessLog[], securityIncidents: any[], complianceViolations: any[]): Promise<any[]> {
    const recommendations: any[] = []

    // Generate recommendations based on security incidents
    if (securityIncidents.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Address Security Incidents',
        description: `${securityIncidents.length} security incidents detected`,
        implementation: 'Investigate and resolve security incidents',
        expected_benefit: 'Improved security posture',
        timeframe: 'immediate'
      })
    }

    // Generate recommendations based on compliance violations
    if (complianceViolations.length > 0) {
      recommendations.push({
        type: 'compliance',
        priority: 'critical',
        title: 'Address Compliance Violations',
        description: `${complianceViolations.length} compliance violations detected`,
        implementation: 'Address compliance violations immediately',
        expected_benefit: 'Regulatory compliance',
        timeframe: 'immediate'
      })
    }

    return recommendations
  }

  private async generateAccessTrends(accessData: AccessLog[], timeframe: string): Promise<any[]> {
    // Generate access trends
    const trends: any[] = []

    // Calculate trend for total accesses
    const totalAccesses = accessData.length
    const previousPeriodAccesses = await this.getPreviousPeriodAccesses(timeframe)
    
    const trendDirection = totalAccesses > previousPeriodAccesses ? 'increasing' : 
                          totalAccesses < previousPeriodAccesses ? 'decreasing' : 'stable'
    
    trends.push({
      metric: 'total_accesses',
      timeframe,
      trend_data: [],
      trend_direction: trendDirection,
      trend_strength: Math.abs(totalAccesses - previousPeriodAccesses) / Math.max(totalAccesses, previousPeriodAccesses),
      seasonality: false,
      forecast: {
        next_value: totalAccesses,
        confidence_interval: [totalAccesses * 0.9, totalAccesses * 1.1],
        forecast_horizon: 1,
        accuracy: 0.8,
        factors: []
      }
    })

    return trends
  }

  private async analyzeAccessPatterns(accessData: AccessLog[]): Promise<any[]> {
    // Analyze access patterns
    const patterns: any[] = []

    // Pattern 1: Peak access times
    const hourlyAccess = new Array(24).fill(0)
    for (const log of accessData) {
      const hour = new Date(log.timestamp).getHours()
      hourlyAccess[hour]++
    }

    const peakHour = hourlyAccess.indexOf(Math.max(...hourlyAccess))
    patterns.push({
      pattern_id: 'peak_access_time',
      pattern_type: 'temporal',
      pattern_name: 'Peak Access Time',
      description: `Peak access occurs at hour ${peakHour}`,
      frequency: Math.max(...hourlyAccess),
      confidence: 0.8,
      users_affected: new Set(accessData.map(log => log.user_id)).size,
      contexts_affected: new Set(accessData.map(log => log.context_id)).size,
      risk_level: 'low',
      metadata: { peak_hour: peakHour }
    })

    return patterns
  }

  private async detectAccessAnomalies(accessData: AccessLog[]): Promise<any[]> {
    // Detect access anomalies
    const anomalies: any[] = []

    // Anomaly 1: Unusual access frequency
    const userAccessCounts: Record<string, number> = {}
    for (const log of accessData) {
      userAccessCounts[log.user_id] = (userAccessCounts[log.user_id] || 0) + 1
    }

    const averageAccesses = Object.values(userAccessCounts).reduce((sum, count) => sum + count, 0) / Object.keys(userAccessCounts).length
    
    for (const [userId, count] of Object.entries(userAccessCounts)) {
      if (count > averageAccesses * 3) {
        anomalies.push({
          anomaly_id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          anomaly_type: 'Unusual Access Frequency',
          severity: 'medium',
          description: `User ${userId} has unusually high access frequency: ${count} accesses`,
          detected_at: new Date(),
          user_id: userId,
          context_id: '',
          action: 'read',
          anomaly_score: 0.7,
          risk_factors: [],
          investigation_required: true,
          status: 'new',
          resolution: '',
          metadata: { access_count: count, average_accesses: averageAccesses }
        })
      }
    }

    return anomalies
  }

  private async identifyRiskIndicators(accessData: AccessLog[]): Promise<any[]> {
    // Identify risk indicators
    const riskIndicators: any[] = []

    // Risk indicator 1: High number of denied accesses
    const deniedAccesses = accessData.filter(log => log.result === 'denied').length
    if (deniedAccesses > 5) {
      riskIndicators.push({
        indicator_id: 'high_denied_accesses',
        indicator_type: 'access_denial',
        indicator_name: 'High Number of Denied Accesses',
        description: `${deniedAccesses} denied access attempts detected`,
        risk_level: 'medium',
        confidence: 0.8,
        frequency: deniedAccesses,
        impact: 0.6,
        mitigation_strategies: [],
        monitoring_requirements: [],
        metadata: { denied_count: deniedAccesses }
      })
    }

    return riskIndicators
  }

  private async generatePatternRecommendations(patterns: any[], anomalies: any[], riskIndicators: any[]): Promise<any[]> {
    const recommendations: any[] = []

    // Generate recommendations based on patterns
    for (const pattern of patterns) {
      if (pattern.pattern_type === 'temporal' && pattern.risk_level === 'high') {
        recommendations.push({
          type: 'security',
          priority: 'medium',
          title: 'Address High-Risk Access Pattern',
          description: pattern.description,
          implementation: 'Review and restrict high-risk access patterns',
          expected_benefit: 'Reduced security risk',
          timeframe: '1 week'
        })
      }
    }

    // Generate recommendations based on anomalies
    if (anomalies.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Investigate Access Anomalies',
        description: `${anomalies.length} access anomalies detected`,
        implementation: 'Investigate and address access anomalies',
        expected_benefit: 'Improved security monitoring',
        timeframe: 'immediate'
      })
    }

    // Generate recommendations based on risk indicators
    for (const indicator of riskIndicators) {
      if (indicator.risk_level === 'high' || indicator.risk_level === 'critical') {
        recommendations.push({
          type: 'security',
          priority: 'high',
          title: 'Address High-Risk Indicator',
          description: indicator.description,
          implementation: 'Implement mitigation strategies for high-risk indicators',
          expected_benefit: 'Reduced security risk',
          timeframe: 'immediate'
        })
      }
    }

    return recommendations
  }

  private async getPreviousPeriodAccesses(timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count FROM access_logs 
        WHERE timestamp >= NOW() - INTERVAL '2 ${timeframe}' 
        AND timestamp < NOW() - INTERVAL '1 ${timeframe}'
        `
      )

      return parseInt(result.rows[0]?.count) || 0

    } catch (error) {
      logger.error('Failed to get previous period accesses', {
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async storeAccessReport(report: AccessReport): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_reports (
          report_id, generated_at, timeframe, total_access_attempts, successful_accesses,
          failed_accesses, denied_accesses, access_by_user, access_by_context, access_by_action,
          security_incidents, compliance_violations, risk_assessment, recommendations, trends
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
        [
          report.report_id,
          report.generated_at,
          report.timeframe,
          report.total_access_attempts,
          report.successful_accesses,
          report.failed_accesses,
          report.denied_accesses,
          JSON.stringify(report.access_by_user),
          JSON.stringify(report.access_by_context),
          JSON.stringify(report.access_by_action),
          JSON.stringify(report.security_incidents),
          JSON.stringify(report.compliance_violations),
          JSON.stringify(report.risk_assessment),
          JSON.stringify(report.recommendations),
          JSON.stringify(report.trends)
        ]
      )

    } catch (error) {
      logger.error('Failed to store access report', {
        reportId: report.report_id,
        error: error.message
      })
    }
  }

  private async storeAccessPatternAnalysis(analysis: AccessPatternAnalysis): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO access_pattern_analysis (
          analysis_id, analyzed_at, timeframe, total_accesses, unique_users, unique_contexts,
          access_patterns, anomalies, risk_indicators, recommendations, trends
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          analysis.analysis_id,
          analysis.analyzed_at,
          analysis.timeframe,
          analysis.total_accesses,
          analysis.unique_users,
          analysis.unique_contexts,
          JSON.stringify(analysis.access_patterns),
          JSON.stringify(analysis.anomalies),
          JSON.stringify(analysis.risk_indicators),
          JSON.stringify(analysis.recommendations),
          JSON.stringify(analysis.trends)
        ]
      )

    } catch (error) {
      logger.error('Failed to store access pattern analysis', {
        analysisId: analysis.analysis_id,
        error: error.message
      })
    }
  }
}

