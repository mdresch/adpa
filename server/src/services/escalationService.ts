/**
 * Escalation Service
 * TASK-742: Escalation matrix based on severity
 * 
 * Evaluates drift against escalation matrix rules and triggers appropriate alerts
 * Based on DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md Phase 2 specification
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { emailNotificationService, BudgetOverrunEmailData, ScopeCreepEmailData } from './emailNotificationService'
import { teamsService } from './teamsService'
import { emergencyMeetingService } from './emergencyMeetingService'
import * as playbookService from './playbookService'
import { driftResolutionService } from './driftResolutionService'
import { positiveDriftChangeRequestService } from './positiveDriftChangeRequestService'

export interface EscalationRule {
  id: string
  rule_name: string
  drift_type: 'budget_overrun' | 'scope_creep' | 'timeline_delay' | 'quality_degradation' | 'technical_drift' | 'resource_drift'
  threshold_min: number
  threshold_max: number | null
  severity_level: 'warning' | 'high' | 'critical' | 'emergency'
  escalate_to: string[] // Roles like ["PM", "CFO", "CEO"]
  deadline_hours: number
  channels: string[] // ["email", "slack", "sms", "dashboard", "meeting"]
  auto_create_cr: boolean
  require_meeting: boolean
  description: string
  priority: number
}

export interface EscalationAlert {
  id: string
  drift_detection_id: string
  escalation_rule_id: string
  project_id: string
  alert_type: string
  severity_level: string
  variance_percentage: number | null
  status: 'pending' | 'notified' | 'acknowledged' | 'in_progress' | 'resolved' | 'expired'
  escalated_to: any[]
  notification_channels: string[]
  deadline: Date
  alert_summary: string
  alert_details: any
}

export interface DriftEvaluationResult {
  shouldEscalate: boolean
  matchedRule: EscalationRule | null
  variancePercentage: number | null
  suggestedActions: string[]
  recommendedPlaybooks?: playbookService.Playbook[]
}

export class EscalationService {
  /**
   * Evaluate drift and determine if escalation is needed
   */
  async evaluateDrift(
    driftDetectionId: string,
    projectId: string,
    driftType: string,
    driftSeverity: string,
    driftData: any
  ): Promise<DriftEvaluationResult> {
    try {
      logger.info('[ESCALATION] Evaluating drift for escalation', {
        driftDetectionId,
        projectId,
        driftType,
        driftSeverity
      })

      // Calculate variance percentage based on drift type
      const variancePercentage = this.calculateVariancePercentage(driftType, driftData)

      // Find matching escalation rule
      const matchedRule = await this.findMatchingRule(driftType, variancePercentage, driftSeverity)

      if (!matchedRule) {
        logger.info('[ESCALATION] No escalation rule matched', {
          driftType,
          variancePercentage,
          driftSeverity
        })
        return {
          shouldEscalate: false,
          matchedRule: null,
          variancePercentage,
          suggestedActions: []
        }
      }

      // 3. Find matching playbooks (Phase 2 Enhancement)
      const recommendedPlaybooks = await playbookService.findMatchingPlaybooks({
        project_id: projectId,
        risk_category: driftType.split('_')[0], // Extract category from drift type
        severity_level: matchedRule?.severity_level || driftSeverity,
        impact: matchedRule?.severity_level || driftSeverity
      })

      // Generate suggested actions based on rule
      const suggestedActions = this.generateSuggestedActions(matchedRule, driftData)

      if (recommendedPlaybooks.length > 0) {
        suggestedActions.push(`Consider executing playbook: ${recommendedPlaybooks[0].title}`)
      }

      logger.info('[ESCALATION] Escalation evaluation complete', {
        ruleMatched: !!matchedRule,
        playbooksFound: recommendedPlaybooks.length
      })

      return {
        shouldEscalate: !!matchedRule || recommendedPlaybooks.length > 0,
        matchedRule,
        variancePercentage,
        suggestedActions,
        recommendedPlaybooks
      }
    } catch (error) {
      logger.error('[ESCALATION] Error evaluating drift:', error)
      throw error
    }
  }

  /**
   * Main entry point for processing drift escalation.
   * Orchestrates evaluation, alert creation, notifications, and automated actions.
   */
  async processDriftEscalation(
    driftDetectionId: string,
    projectId: string,
    driftType: string,
    driftSeverity: string,
    driftData: any
  ): Promise<DriftEvaluationResult> {
    const evaluation = await this.evaluateDrift(driftDetectionId, projectId, driftType, driftSeverity, driftData)

    if (evaluation.shouldEscalate && evaluation.matchedRule) {
      // 1. Create alert
      const alert = await this.createAlert(
        driftDetectionId,
        projectId,
        evaluation.matchedRule,
        evaluation.variancePercentage,
        driftData
      )

      // 2. Send notifications via configured channels (Email, Teams, etc.)
      await this.sendNotifications(alert, evaluation.matchedRule)

      // 3. Auto-create change request if rule is configured for it
      if (evaluation.matchedRule.auto_create_cr) {
        await this.createChangeRequest(alert, evaluation.matchedRule, driftData)
      }

      // 4. Schedule meeting if required by the rule (TASK-743)
      if (evaluation.matchedRule.require_meeting) {
        await this.scheduleMeeting(alert, evaluation.matchedRule)
      }
    }

    return evaluation
  }

  /**
   * Create escalation alert based on matched rule
   */
  async createAlert(
    driftDetectionId: string,
    projectId: string,
    rule: EscalationRule,
    variancePercentage: number | null,
    driftData: any
  ): Promise<EscalationAlert> {
    try {
      logger.info('[ESCALATION] Creating escalation alert', {
        driftDetectionId,
        projectId,
        ruleName: rule.rule_name
      })

      // Calculate deadline based on rule's deadline_hours
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + rule.deadline_hours)

      // Generate alert summary
      const alertSummary = this.generateAlertSummary(rule, variancePercentage, driftData)

      // Insert escalation alert
      const result = await pool.query(
        `INSERT INTO escalation_alerts (
          drift_detection_id,
          escalation_rule_id,
          project_id,
          alert_type,
          severity_level,
          variance_percentage,
          status,
          escalated_to,
          notification_channels,
          deadline,
          alert_summary,
          alert_details,
          dashboard_alert
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          driftDetectionId,
          rule.id,
          projectId,
          rule.drift_type,
          rule.severity_level,
          variancePercentage,
          'pending',
          JSON.stringify(rule.escalate_to),
          JSON.stringify(rule.channels),
          deadline,
          alertSummary,
          JSON.stringify(driftData),
          true
        ]
      )

      const alert = result.rows[0]

      // Log alert creation to history
      await this.logAlertHistory(
        alert.id,
        'created',
        `Escalation alert created based on rule: ${rule.rule_name}`,
        null
      )

      // Trigger notifications (non-blocking)
      this.sendNotifications(alert, rule).catch(error => {
        logger.error('[ESCALATION] Error sending notifications:', error)
      })

      // Auto-create change request if required
      if (rule.auto_create_cr) {
        this.createChangeRequest(alert, rule, driftData).catch(error => {
          logger.error('[ESCALATION] Error creating change request:', error)
        })
      }

      // Schedule meeting if required
      if (rule.require_meeting) {
        this.scheduleMeeting(alert, rule).catch(error => {
          logger.error('[ESCALATION] Error scheduling meeting:', error)
        })
      }

      logger.info('[ESCALATION] Alert created successfully', {
        alertId: alert.id,
        deadline: deadline.toISOString()
      })

      return alert
    } catch (error) {
      logger.error('[ESCALATION] Error creating alert:', error)
      throw error
    }
  }

  /**
   * Calculate variance percentage based on drift type
   */
  private calculateVariancePercentage(driftType: string, driftData: any): number | null {
    try {
      switch (driftType) {
        case 'budget_overrun':
        case 'cost_drift':
          // Calculate budget variance percentage
          if (driftData.approved_budget && driftData.projected_cost) {
            const variance = ((driftData.projected_cost - driftData.approved_budget) / driftData.approved_budget) * 100
            return Math.abs(variance)
          }
          break

        case 'scope_creep':
        case 'scope_drift':
          // Calculate scope increase percentage
          if (driftData.baseline_scope_count && driftData.current_scope_count) {
            const variance = ((driftData.current_scope_count - driftData.baseline_scope_count) / driftData.baseline_scope_count) * 100
            return Math.abs(variance)
          }
          break

        case 'timeline_delay':
          // Calculate timeline delay percentage
          if (driftData.planned_duration && driftData.actual_duration) {
            const variance = ((driftData.actual_duration - driftData.planned_duration) / driftData.planned_duration) * 100
            return Math.abs(variance)
          }
          break
      }

      return null
    } catch (error) {
      logger.warn('[ESCALATION] Could not calculate variance percentage:', error)
      return null
    }
  }

  /**
   * Find matching escalation rule based on drift type and variance
   */
  private async findMatchingRule(
    driftType: string,
    variancePercentage: number | null,
    driftSeverity: string
  ): Promise<EscalationRule | null> {
    try {
      // Query escalation rules for this drift type
      let query = `
        SELECT * FROM escalation_matrix
        WHERE drift_type = $1
          AND is_active = true
      `
      const params: any[] = [driftType]

      // If we have a variance percentage, filter by threshold
      if (variancePercentage !== null) {
        query += ` AND threshold_min <= $2
                   AND (threshold_max IS NULL OR threshold_max > $2)`
        params.push(variancePercentage)
      }

      query += ` ORDER BY priority DESC, threshold_min DESC LIMIT 1`

      const result = await pool.query(query, params)

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        rule_name: row.rule_name,
        drift_type: row.drift_type,
        threshold_min: parseFloat(row.threshold_min),
        threshold_max: row.threshold_max ? parseFloat(row.threshold_max) : null,
        severity_level: row.severity_level,
        escalate_to: row.escalate_to,
        deadline_hours: row.deadline_hours,
        channels: row.channels,
        auto_create_cr: row.auto_create_cr,
        require_meeting: row.require_meeting,
        description: row.description,
        priority: row.priority
      }
    } catch (error) {
      logger.error('[ESCALATION] Error finding matching rule:', error)
      throw error
    }
  }

  /**
   * Generate alert summary message
   */
  private generateAlertSummary(
    rule: EscalationRule,
    variancePercentage: number | null,
    driftData: any
  ): string {
    const emoji = rule.severity_level === 'emergency' ? '🚨🚨' :
      rule.severity_level === 'critical' ? '🚨' :
        rule.severity_level === 'high' ? '🔴' : '⚠️'

    let summary = `${emoji} ${rule.severity_level.toUpperCase()}: `

    switch (rule.drift_type) {
      case 'budget_overrun':
        summary += `Budget Overrun Detected - ${variancePercentage?.toFixed(1)}% over baseline`
        if (driftData.approved_budget && driftData.projected_cost) {
          const overrun = driftData.projected_cost - driftData.approved_budget
          summary += ` ($${overrun.toLocaleString()} excess)`
        }
        break

      case 'scope_creep':
        summary += `Scope Creep Detected - ${variancePercentage?.toFixed(1)}% increase`
        break

      case 'timeline_delay':
        summary += `Timeline Delay Detected - ${variancePercentage?.toFixed(1)}% behind schedule`
        break

      default:
        summary += `${rule.drift_type.replace('_', ' ')} detected`
    }

    return summary
  }

  /**
   * Generate suggested actions based on escalation rule
   */
  private generateSuggestedActions(rule: EscalationRule, driftData: any): string[] {
    const actions: string[] = []

    if (rule.auto_create_cr) {
      actions.push('Review and approve auto-generated Change Request')
    }

    if (rule.require_meeting) {
      actions.push('Attend emergency meeting to discuss corrective actions')
    }

    switch (rule.drift_type) {
      case 'budget_overrun':
        actions.push('Review budget variance analysis')
        actions.push('Evaluate corrective action options: approve overrun, reduce scope, or cancel project')
        break

      case 'scope_creep':
        actions.push('Review unapproved scope additions')
        actions.push('Decide: approve scope increase, remove additions, or partial approval')
        break

      case 'timeline_delay':
        actions.push('Review timeline variance and critical path impact')
        actions.push('Evaluate options to accelerate delivery or adjust milestones')
        break
    }

    actions.push(`Respond within ${rule.deadline_hours} hours`)

    return actions
  }

  /**
   * Send notifications via configured channels
   */
  private async sendNotifications(alert: EscalationAlert, rule: EscalationRule): Promise<void> {
    const channels = rule.channels

    // Track notification status
    const updates: any = {}

    // Email notification
    if (channels.includes('email')) {
      try {
        await this.sendEmailNotification(alert, rule)
        updates.email_sent = true
        updates.email_sent_at = new Date()
        logger.info('[ESCALATION] Email notification sent', { alertId: alert.id })
      } catch (error) {
        logger.error('[ESCALATION] Error sending email:', error)
      }
    }

    // Teams notification
    if (channels.includes('teams')) {
      try {
        await this.sendTeamsNotification(alert, rule)
        updates.teams_sent = true
        updates.teams_sent_at = new Date()
        logger.info('[ESCALATION] Teams notification sent', { alertId: alert.id })
      } catch (error) {
        logger.error('[ESCALATION] Error sending Teams message:', error)
      }
    }

    // SMS notification (for emergency alerts)
    if (channels.includes('sms')) {
      try {
        await this.sendSMSNotification(alert, rule)
        updates.sms_sent = true
        updates.sms_sent_at = new Date()
        logger.info('[ESCALATION] SMS notification sent', { alertId: alert.id })
      } catch (error) {
        logger.error('[ESCALATION] Error sending SMS:', error)
      }
    }

    // Update alert status
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')
      const values = [alert.id, ...Object.values(updates)]

      await pool.query(
        `UPDATE escalation_alerts SET ${setClauses}, status = 'notified', updated_at = NOW() WHERE id = $1`,
        values
      )

      await this.logAlertHistory(
        alert.id,
        'notified',
        `Notifications sent via: ${channels.join(', ')}`,
        null
      )
    }
  }

  /**
   * Send email notification using email notification service
   */
  private async sendEmailNotification(alert: EscalationAlert, rule: EscalationRule): Promise<void> {
    try {
      // Get project details
      const projectResult = await pool.query(
        'SELECT name FROM projects WHERE id = $1',
        [alert.project_id]
      )
      const projectName = projectResult.rows[0]?.name || 'Unknown Project'

      // Determine notification type and send appropriate email
      switch (rule.drift_type) {
        case 'budget_overrun':
          await this.sendBudgetOverrunEmail(alert, rule, projectName)
          break

        case 'scope_creep':
          await this.sendScopeCreepEmail(alert, rule, projectName)
          break

        default:
          // For other drift types, log for now
          logger.info('[ESCALATION] Email notification type not implemented yet:', rule.drift_type)
      }

      // Log the notification
      await pool.query(
        `INSERT INTO email_notification_logs (
          notification_type, severity, priority, recipient_roles, subject,
          project_id, drift_detection_id, escalation_alert_id, metadata, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          rule.drift_type,
          rule.severity_level,
          rule.severity_level === 'emergency' || rule.severity_level === 'critical' ? 'high' : 'normal',
          rule.escalate_to,
          `${rule.drift_type} - ${alert.alert_summary}`,
          alert.project_id,
          alert.drift_detection_id,
          alert.id,
          JSON.stringify({ rule_name: rule.rule_name }),
          'sent'
        ]
      )
    } catch (error) {
      logger.error('[ESCALATION] Error in sendEmailNotification:', error)
      throw error
    }
  }

  /**
   * Send budget overrun email
   */
  private async sendBudgetOverrunEmail(
    alert: EscalationAlert,
    rule: EscalationRule,
    projectName: string
  ): Promise<void> {
    const details = alert.alert_details || {}
    const variance = alert.variance_percentage || 0

    const emailData: BudgetOverrunEmailData = {
      projectId: alert.project_id,
      projectName,
      approvedBudget: details.approved_budget || 0,
      projectedCost: details.projected_cost || 0,
      overrunAmount: details.overrun_amount || 0,
      overrunPercentage: variance,
      severity: rule.severity_level,
      deadline: alert.deadline,
      changeRequestId: details.change_request_id,
      rootCause: details.root_cause,
      options: details.corrective_options
    }

    await emailNotificationService.sendBudgetOverrunAlert(emailData)
  }

  /**
   * Send scope creep email
   */
  private async sendScopeCreepEmail(
    alert: EscalationAlert,
    rule: EscalationRule,
    projectName: string
  ): Promise<void> {
    const details = alert.alert_details || {}
    const variance = alert.variance_percentage || 0

    const emailData: ScopeCreepEmailData = {
      projectId: alert.project_id,
      projectName,
      baselineScope: details.baseline_scope || [],
      currentScope: details.current_scope || [],
      scopeIncrease: variance,
      severity: rule.severity_level,
      deadline: alert.deadline,
      changeRequestId: details.change_request_id,
      unapprovedFeatures: details.unapproved_features
    }

    await emailNotificationService.sendScopeCreepAlert(emailData)
  }

  /**
   * Send Teams notification using Teams service
   */
  private async sendTeamsNotification(alert: EscalationAlert, rule: EscalationRule): Promise<void> {
    try {
      // Get integration for Teams
      const integrationResult = await pool.query(
        "SELECT configuration, credentials_encrypted FROM integrations WHERE type = 'teams' AND is_active = true LIMIT 1"
      )

      if (integrationResult.rows.length === 0) {
        logger.warn('[ESCALATION] No active Teams integration found')
        return
      }

      const credentials = JSON.parse(
        Buffer.from(integrationResult.rows[0].credentials_encrypted, 'base64').toString('utf-8')
      )
      const webhookUrl = credentials.webhookUrl || credentials.webhook_url

      if (!webhookUrl) {
        logger.warn('[ESCALATION] Teams webhook URL not found in credentials')
        return
      }

      const driftData = alert.alert_details || {}

      // Prepare message facts
      const facts = teamsService.formatFacts({
        alert_type: rule.drift_type,
        severity: rule.severity_level,
        variance: alert.variance_percentage ? `${alert.variance_percentage.toFixed(1)}%` : 'N/A',
        deadline: alert.deadline.toLocaleString()
      })

      if (driftData.approved_budget) {
        facts.push({ name: 'Approved Budget', value: `$${driftData.approved_budget.toLocaleString()}` })
        facts.push({ name: 'Projected Cost', value: `$${driftData.projected_cost.toLocaleString()}` })
      }

      await teamsService.sendNotification({
        webhookUrl,
        title: `🚨 ${rule.severity_level.toUpperCase()}: ${rule.rule_name}`,
        summary: alert.alert_summary,
        text: alert.alert_summary,
        severity: rule.severity_level as any,
        sections: facts,
        actions: [
          {
            "@type": "OpenUri",
            "name": "View Project",
            "targets": [{ "os": "default", "uri": `${process.env.FRONTEND_URL}/projects/${alert.project_id}` }]
          },
          {
            "@type": "OpenUri",
            "name": "Acknowledge Alert",
            "targets": [{ "os": "default", "uri": `${process.env.FRONTEND_URL}/alerts/${alert.id}/acknowledge` }]
          }
        ]
      })
    } catch (error) {
      logger.error('[ESCALATION] Failed to send Teams notification:', error)
      throw error
    }
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS service)
   */
  private async sendSMSNotification(alert: EscalationAlert, rule: EscalationRule): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    logger.info('[ESCALATION] SMS notification would be sent to:', rule.escalate_to)
  }

  /**
  * Auto-create change request based on drift detected
  */
  private async createChangeRequest(
    alert: EscalationAlert,
    rule: EscalationRule,
    driftData: any
  ): Promise<void> {
    try {
      logger.info('[ESCALATION] Auto-creating change request for alert:', alert.id)

      const driftPoints = driftData.drift_points || []
      let changeRequestId: string | undefined

      // Check if this is positive drift (opportunity)
      const isPositiveDrift = rule.drift_type === ('positive_drift' as any) ||
        (driftData.positive_drift && Object.keys(driftData.positive_drift).length > 0)

      if (isPositiveDrift) {
        // Use PositiveDriftChangeRequestService for opportunities
        const result = await positiveDriftChangeRequestService.generateOpportunityCR(
          alert.project_id,
          driftData.source_document_id || '',
          alert.drift_detection_id,
          driftPoints,
          driftData.positive_drift,
          'SYSTEM' // System-created
        )
        changeRequestId = result.changeRequestId
      } else {
        // Use DriftResolutionService for corrective actions/major changes
        // First, get the resolution content and identify major changes
        const resolution = await driftResolutionService.resolveDrift(
          driftData.source_document_id || '',
          alert.drift_detection_id,
          'SYSTEM',
          'balanced'
        )

        // Then apply the resolution, which will create a Change Request if major changes are detected
        const applyResult = await driftResolutionService.applyResolution(
          driftData.source_document_id || '',
          resolution.resolvedContent,
          alert.drift_detection_id,
          'SYSTEM',
          resolution.majorChanges
        )

        changeRequestId = applyResult.changeRequestId
      }

      if (changeRequestId) {
        await pool.query(
          `UPDATE escalation_alerts 
           SET change_request_created = true, 
               metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{change_request_id}', $1),
               updated_at = NOW() 
           WHERE id = $2`,
          [JSON.stringify(changeRequestId), alert.id]
        )

        await this.logAlertHistory(
          alert.id,
          'created',
          `Change request auto-created: ${changeRequestId}`,
          null
        )

        logger.info('[ESCALATION] Change request auto-created successfully', {
          alertId: alert.id,
          changeRequestId
        })
      }
    } catch (error) {
      logger.error('[ESCALATION] Failed to auto-create change request:', error)
      // Don't throw, we don't want to break the escalation flow if CR creation fails
    }
  }

  /**
   * Schedule emergency meeting using emergency meeting service
   * TASK-743: Auto-schedule emergency meetings for critical drift
   */
  private async scheduleMeeting(alert: EscalationAlert, rule: EscalationRule): Promise<void> {
    try {
      logger.info('[ESCALATION] Scheduling emergency meeting for alert', {
        alertId: alert.id,
        driftType: rule.drift_type,
        severity: rule.severity_level
      })

      // Only schedule meetings for budget overrun drift (as per TASK-743)
      if (rule.drift_type === 'budget_overrun' && alert.alert_details) {
        const driftData = alert.alert_details

        // Get project details
        const projectResult = await pool.query(
          'SELECT id, name FROM projects WHERE id = $1',
          [alert.project_id]
        )

        if (projectResult.rows.length === 0) {
          logger.warn('[ESCALATION] Project not found, cannot schedule meeting', {
            projectId: alert.project_id
          })
          return
        }

        const project = projectResult.rows[0]

        // Extract budget drift information
        const approvedBudget = driftData.approved_budget || 0
        const projectedCost = driftData.projected_cost || 0
        const overrunAmount = projectedCost - approvedBudget
        const overrunPercentage = alert.variance_percentage || 0

        // Only schedule meeting if overrun is significant (>= 5%)
        if (overrunPercentage < 5) {
          logger.info('[ESCALATION] Overrun below 5%, meeting not required', {
            overrunPercentage
          })
          return
        }

        // Schedule the emergency meeting
        const meetingResult = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
          {
            projectId: alert.project_id,
            projectName: project.name,
            driftRecordId: alert.drift_detection_id,
            approvedBudget,
            projectedCost,
            overrunAmount,
            overrunPercentage,
            rootCause: driftData.root_cause || 'Budget drift detected by automated system'
          },
          null // System-triggered, no specific user
        )

        logger.info('[ESCALATION] Emergency meeting scheduled successfully', {
          alertId: alert.id,
          meetingId: meetingResult.meeting.meetingId,
          scheduledDate: meetingResult.meeting.scheduledDate,
          severity: meetingResult.meeting.severity,
          attendeeCount: meetingResult.attendees.length
        })

        // Update alert to reflect meeting was scheduled
        await pool.query(
          `UPDATE escalation_alerts 
           SET meeting_scheduled = true, 
               meeting_scheduled_at = NOW(), 
               updated_at = NOW(),
               alert_details = jsonb_set(
                 COALESCE(alert_details, '{}'::jsonb),
                 '{emergency_meeting_id}',
                 $2::jsonb
               )
           WHERE id = $1`,
          [alert.id, JSON.stringify(meetingResult.meeting.meetingId)]
        )

        // Log meeting scheduling to alert history
        await this.logAlertHistory(
          alert.id,
          'meeting_scheduled',
          `Emergency meeting scheduled: ${meetingResult.meeting.meetingId} with ${meetingResult.attendees.length} attendees for ${meetingResult.meeting.scheduledDate}`,
          null,
          {
            meetingId: meetingResult.meeting.meetingId,
            severity: meetingResult.meeting.severity,
            scheduledDate: meetingResult.meeting.scheduledDate,
            attendeeCount: meetingResult.attendees.length
          }
        )
      } else {
        // For non-budget drift types, just mark as meeting required
        logger.info('[ESCALATION] Meeting required but auto-scheduling only supports budget overrun', {
          driftType: rule.drift_type
        })

        await pool.query(
          `UPDATE escalation_alerts 
           SET updated_at = NOW() 
           WHERE id = $1`,
          [alert.id]
        )

        await this.logAlertHistory(
          alert.id,
          'meeting_required',
          `Emergency meeting required with: ${rule.escalate_to.join(', ')}. Manual scheduling needed for ${rule.drift_type}.`,
          null
        )
      }
    } catch (error) {
      logger.error('[ESCALATION] Error scheduling emergency meeting:', error)
      // Don't throw - log error but continue with alert processing
      await this.logAlertHistory(
        alert.id,
        'meeting_scheduling_failed',
        `Failed to schedule emergency meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
        null
      )
    }
  }

  /**
   * Log action to alert history
   */
  private async logAlertHistory(
    alertId: string,
    actionType: string,
    description: string,
    performedBy: string | null,
    metadata: any = {}
  ): Promise<void> {
    await pool.query(
      `INSERT INTO escalation_alert_history (
        alert_id, action_type, action_description, performed_by, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [alertId, actionType, description, performedBy, JSON.stringify(metadata)]
    )
  }

  /**
   * Get active alerts for a project
   */
  async getActiveAlerts(projectId: string): Promise<EscalationAlert[]> {
    const result = await pool.query(
      `SELECT * FROM escalation_alerts
       WHERE project_id = $1
         AND status IN ('pending', 'notified', 'acknowledged', 'in_progress')
       ORDER BY created_at DESC`,
      [projectId]
    )

    return result.rows
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string, notes?: string): Promise<void> {
    await pool.query(
      `UPDATE escalation_alerts 
       SET status = 'acknowledged', 
           acknowledged_by = $2, 
           acknowledged_at = NOW(),
           response_notes = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [alertId, userId, notes]
    )

    await this.logAlertHistory(
      alertId,
      'acknowledged',
      notes || 'Alert acknowledged',
      userId
    )
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, notes: string): Promise<void> {
    await pool.query(
      `UPDATE escalation_alerts 
       SET status = 'resolved', 
           resolved_at = NOW(),
           response_notes = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [alertId, notes]
    )

    await this.logAlertHistory(
      alertId,
      'resolved',
      notes,
      userId
    )
  }

  /**
   * Proactively check for risk indicators in a project (Phase 2 Enhancement)
   * Scans for patterns that might indicate emerging risks before they hit escalation thresholds
   */
  async checkRiskIndicators(projectId: string): Promise<playbookService.Playbook[]> {
    try {
      logger.info('[ESCALATION] Checking proactive risk indicators', { projectId })

      // 1. Get recent project metrics/status
      const projectResult = await pool.query(
        "SELECT status, health_score, budget_status FROM projects WHERE id = $1",
        [projectId]
      )

      if (projectResult.rows.length === 0) return []
      const project = projectResult.rows[0]

      // 2. Identify potential issues (simplified for this implementation)
      const issues: any[] = []
      if (project.health_score < 70) issues.push({ category: 'quality', severity: 'medium' })
      if (project.status === 'on_hold') issues.push({ category: 'schedule', severity: 'high' })

      // 3. Match playbooks for each identified issue
      const allRecommended: playbookService.Playbook[] = []
      for (const issue of issues) {
        const matches = await playbookService.findMatchingPlaybooks({
          project_id: projectId,
          risk_category: issue.category,
          severity_level: issue.severity
        })
        allRecommended.push(...matches)
      }

      // Deduplicate by ID
      return Array.from(new Map(allRecommended.map(p => [p.id, p])).values())
    } catch (error) {
      logger.error('[ESCALATION] Error checking risk indicators:', error)
      return []
    }
  }
}

// Export singleton instance
export const escalationService = new EscalationService()
