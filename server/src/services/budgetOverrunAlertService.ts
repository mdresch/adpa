/**
 * Budget Overrun Alert Service
 * CR-2026-001: Emergency Meeting Auto-Scheduling
 * 
 * Detects budget overruns and triggers emergency alerts with auto-scheduled meetings
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { meetingSchedulerService, MeetingScheduleRequest } from './meetingSchedulerService'

export interface BudgetOverrunDetection {
  projectId: string
  projectName: string
  approvedBudget: number
  projectedCost: number
  overrunAmount: number
  overrunPercentage: number
  rootCause?: {
    category: string
    description: string
    responsible?: string
    preventable: boolean
  }
  driftRecordId?: string
}

export interface BudgetOverrunAlert {
  id: string
  severity: 'warning' | 'critical' | 'emergency'
  title: string
  description: string
  projectId: string
  overrunAmount: number
  overrunPercentage: number
  escalatedTo: string[]
  meetingId?: string
  changeRequestId?: string
  status: string
}

export class BudgetOverrunAlertService {
  /**
   * Process budget overrun detection and trigger appropriate alerts
   */
  async processBudgetOverrun(
    detection: BudgetOverrunDetection,
    createdBy: string
  ): Promise<BudgetOverrunAlert> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      logger.info('[BUDGET-ALERT] Processing budget overrun', {
        projectId: detection.projectId,
        overrunPercentage: detection.overrunPercentage
      })
      
      // 1. Determine severity based on overrun percentage
      const severity = this.calculateSeverity(detection.overrunPercentage)
      
      // 2. Determine escalation targets
      const escalatedTo = this.determineEscalation(severity, detection.overrunPercentage)
      
      // 3. Generate alert title and description
      const { title, description } = this.generateAlertContent(detection, severity)
      
      // 4. Generate corrective options
      const correctiveOptions = this.generateCorrectiveOptions(detection)
      
      // 5. Create alert record
      const alertResult = await client.query(
        `INSERT INTO budget_overrun_alerts (
          project_id, alert_type, severity,
          title, description,
          approved_budget, projected_cost, overrun_amount, overrun_percentage,
          impact_analysis, root_cause, corrective_options,
          escalated_to, escalation_level, escalation_deadline,
          drift_record_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, severity, title, description, status`,
        [
          detection.projectId,
          'budget_overrun',
          severity,
          title,
          description,
          detection.approvedBudget,
          detection.projectedCost,
          detection.overrunAmount,
          detection.overrunPercentage,
          JSON.stringify(this.generateImpactAnalysis(detection)),
          JSON.stringify(detection.rootCause || {}),
          JSON.stringify(correctiveOptions),
          JSON.stringify(escalatedTo),
          this.getEscalationLevel(severity),
          this.calculateEscalationDeadline(severity),
          detection.driftRecordId || null,
          'active'
        ]
      )
      
      const alert = alertResult.rows[0]
      
      // 6. Auto-schedule emergency meeting if critical or emergency
      let meetingId: string | undefined
      if (severity === 'critical' || severity === 'emergency') {
        const meeting = await this.scheduleEmergencyMeetingForAlert(
          client,
          alert.id,
          detection,
          severity,
          escalatedTo,
          createdBy
        )
        meetingId = meeting.id
        
        // Update alert with meeting ID
        await client.query(
          `UPDATE budget_overrun_alerts SET meeting_id = $1 WHERE id = $2`,
          [meetingId, alert.id]
        )
      }
      
      // 7. Send multi-channel notifications
      await this.sendAlertNotifications(client, alert, detection, severity, escalatedTo, meetingId)
      
      await client.query('COMMIT')
      
      logger.info('[BUDGET-ALERT] Budget overrun alert created', {
        alertId: alert.id,
        severity: alert.severity,
        meetingScheduled: !!meetingId
      })
      
      return {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        projectId: detection.projectId,
        overrunAmount: detection.overrunAmount,
        overrunPercentage: detection.overrunPercentage,
        escalatedTo,
        meetingId,
        status: alert.status
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[BUDGET-ALERT] Error processing budget overrun:', error)
      throw error
    } finally {
      client.release()
    }
  }
  
  /**
   * Calculate severity based on overrun percentage
   * Warning: 5-10%, Critical: 10-25%, Emergency: 25%+
   */
  private calculateSeverity(overrunPercentage: number): 'warning' | 'critical' | 'emergency' {
    if (overrunPercentage >= 25) {
      return 'emergency'
    } else if (overrunPercentage >= 10) {
      return 'critical'
    } else {
      return 'warning'
    }
  }
  
  /**
   * Determine escalation targets based on severity
   */
  private determineEscalation(severity: string, overrunPercentage: number): string[] {
    if (severity === 'emergency' || overrunPercentage >= 25) {
      // 25%+ overrun: Escalate to CEO, CFO, Board
      return ['CEO', 'CFO', 'Board_Finance_Committee', 'Project_Sponsor']
    } else if (severity === 'critical') {
      // 10-25% overrun: Escalate to CFO, Sponsor, CTO
      return ['CFO', 'Project_Sponsor', 'CTO', 'Program_Manager']
    } else {
      // 5-10% overrun: Alert PM and Finance Controller
      return ['Project_Manager', 'Finance_Controller', 'Project_Sponsor']
    }
  }
  
  /**
   * Get escalation level (1-5)
   */
  private getEscalationLevel(severity: string): number {
    switch (severity) {
      case 'emergency': return 5 // CEO/Board
      case 'critical': return 3  // CFO
      default: return 1          // PM
    }
  }
  
  /**
   * Calculate escalation deadline based on severity
   */
  private calculateEscalationDeadline(severity: string): Date {
    const now = new Date()
    const hoursToAdd = severity === 'emergency' ? 12 : severity === 'critical' ? 24 : 72
    return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000)
  }
  
  /**
   * Generate alert content
   */
  private generateAlertContent(
    detection: BudgetOverrunDetection,
    severity: string
  ): { title: string; description: string } {
    const emoji = severity === 'emergency' ? '🚨🚨' : severity === 'critical' ? '🚨' : '⚠️'
    
    const title = `${emoji} ${severity.toUpperCase()}: Budget Overrun Detected - ${detection.projectName}`
    
    const description = `
Project: ${detection.projectName}
Severity: ${severity.toUpperCase()}
Detection Date: ${new Date().toISOString()}

BUDGET ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Approved Budget:    $${detection.approvedBudget.toLocaleString()}
Projected Cost:     $${detection.projectedCost.toLocaleString()}
Overrun Amount:     $${detection.overrunAmount.toLocaleString()}
Overrun Percentage: ${detection.overrunPercentage.toFixed(1)}%

${detection.rootCause ? `
ROOT CAUSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Category: ${detection.rootCause.category}
Description: ${detection.rootCause.description}
Preventable: ${detection.rootCause.preventable ? 'Yes' : 'No'}
` : ''}

IMMEDIATE ACTION REQUIRED:
${severity === 'emergency' ? '- Emergency meeting scheduled within 12 hours' : ''}
${severity === 'critical' ? '- Urgent meeting scheduled within 24 hours' : ''}
- Review corrective options
- Make decision on project continuation
- Approve Change Request

This is an automated alert from the ADPA Drift Detection System.
    `.trim()
    
    return { title, description }
  }
  
  /**
   * Generate corrective options
   */
  private generateCorrectiveOptions(detection: BudgetOverrunDetection): any[] {
    return [
      {
        option: 'Approve additional funding',
        description: `Approve additional $${detection.overrunAmount.toLocaleString()} to complete project`,
        pros: ['Complete all features', 'Stakeholder satisfaction', 'Maintain timeline'],
        cons: ['Rewards poor scope control', 'Depletes reserve fund', 'Sets bad precedent'],
        impact: {
          budgetImpact: `+$${detection.overrunAmount.toLocaleString()}`,
          timelineImpact: 'Original timeline maintained',
          scopeImpact: 'All features delivered',
          riskImpact: 'High - encourages future overruns'
        },
        recommendation: false,
        reasoning: 'Approving scope creep encourages future overruns'
      },
      {
        option: 'Reduce scope to baseline',
        description: 'Remove unapproved features and return to baseline scope',
        pros: ['Stays within budget', 'Enforces scope control', 'Maintains discipline'],
        cons: ['Stakeholder disappointment', 'Political friction', 'Morale impact'],
        impact: {
          budgetImpact: '$0 additional required',
          timelineImpact: 'Back on track',
          scopeImpact: 'Only baseline features',
          riskImpact: 'Low - maintains fiscal discipline'
        },
        recommendation: true,
        reasoning: 'Maintains fiscal discipline while delivering core value'
      },
      {
        option: 'Partial approval',
        description: `Approve partial funding ($${(detection.overrunAmount / 2).toLocaleString()}) for priority features`,
        pros: ['Compromise solution', 'Some stakeholder satisfaction', 'Prioritization exercise'],
        cons: ['Still over budget', 'Difficult prioritization', 'May not satisfy anyone'],
        impact: {
          budgetImpact: `+$${(detection.overrunAmount / 2).toLocaleString()}`,
          timelineImpact: '+1 month delay',
          scopeImpact: 'Partial feature delivery',
          riskImpact: 'Medium - partial scope creep rewarded'
        },
        recommendation: false,
        reasoning: 'Compromise may not fully satisfy any stakeholder'
      },
      {
        option: 'Cancel project',
        description: 'Cancel project and cut losses',
        pros: ['Stops further overrun', 'Reallocates resources', 'Sends strong message'],
        cons: [`$${detection.approvedBudget.toLocaleString()} sunk cost`, 'Major disruption', 'Lost opportunity'],
        impact: {
          budgetImpact: `Save $${detection.overrunAmount.toLocaleString()} future spend`,
          timelineImpact: 'N/A',
          scopeImpact: 'Nothing delivered',
          riskImpact: 'Extreme - major organizational impact'
        },
        recommendation: false,
        reasoning: 'Only if project no longer strategic'
      }
    ]
  }
  
  /**
   * Generate impact analysis
   */
  private generateImpactAnalysis(detection: BudgetOverrunDetection): any {
    return {
      financialImpact: {
        immediateImpact: detection.overrunAmount,
        quarterlyImpact: detection.overrunAmount,
        annualImpact: detection.overrunAmount,
        portfolioImpact: 'May affect other project funding'
      },
      projectImpact: {
        deliveryRisk: 'high',
        qualityRisk: 'medium',
        timelineRisk: 'high',
        teamMorale: 'at_risk'
      },
      organizationalImpact: {
        budgetPool: 'Strategic Initiatives Fund may be depleted',
        otherProjects: 'May need to delay lower-priority projects',
        stakeholderTrust: 'Damaged - requires rebuilding'
      }
    }
  }
  
  /**
   * Schedule emergency meeting for critical/emergency alerts
   */
  private async scheduleEmergencyMeetingForAlert(
    client: any,
    alertId: string,
    detection: BudgetOverrunDetection,
    severity: string,
    escalatedTo: string[],
    createdBy: string
  ): Promise<any> {
    // Get user IDs for escalation targets
    // In production, query the users table to get actual email addresses based on roles
    const emailDomain = process.env.COMPANY_EMAIL_DOMAIN || 'company.com'
    const attendees = escalatedTo.map(role => ({
      email: `${role.toLowerCase().replace('_', '.')}@${emailDomain}`,
      name: role.replace('_', ' '),
      role: role.includes('CEO') || role.includes('CFO') || role.includes('Sponsor') 
        ? 'decision_maker' as const
        : 'required' as const
    }))
    
    const meetingRequest: MeetingScheduleRequest = {
      projectId: detection.projectId,
      title: `${severity === 'emergency' ? '🚨 EMERGENCY' : '🚨 URGENT'}: Budget Review - ${detection.projectName}`,
      description: `Emergency meeting to review budget overrun of $${detection.overrunAmount.toLocaleString()} (${detection.overrunPercentage.toFixed(1)}% over baseline)`,
      meetingType: 'emergency_budget_overrun',
      severity: severity === 'emergency' ? 'emergency' : 'critical',
      urgency: severity === 'emergency' ? 'emergency' : 'urgent',
      durationMinutes: 60,
      attendees,
      alertId,
      driftRecordId: detection.driftRecordId,
      autoScheduledReason: `Auto-scheduled due to ${severity} budget overrun (${detection.overrunPercentage.toFixed(1)}% over budget)`
    }
    
    return await meetingSchedulerService.scheduleEmergencyMeeting(meetingRequest, createdBy)
  }
  
  /**
   * Send multi-channel notifications
   */
  private async sendAlertNotifications(
    client: any,
    alert: any,
    detection: BudgetOverrunDetection,
    severity: string,
    escalatedTo: string[],
    meetingId?: string
  ): Promise<void> {
    const priority = severity === 'emergency' ? 'emergency' : severity === 'critical' ? 'urgent' : 'high'
    const channels = severity === 'emergency' 
      ? ['email', 'slack', 'sms', 'dashboard']
      : ['email', 'slack', 'dashboard']
    
    // Send to each escalation target
    const emailDomain = process.env.COMPANY_EMAIL_DOMAIN || 'company.com'
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    
    for (const role of escalatedTo) {
      const email = `${role.toLowerCase().replace('_', '.')}@${emailDomain}`
      const alertUrl = `${frontendUrl}/projects/${detection.projectId}/alerts/${alert.id}`
      
      const emailBody = `
${alert.title}

You are receiving this ${severity} alert because ${detection.projectName} has exceeded its approved budget by ${detection.overrunPercentage.toFixed(1)}%.

BUDGET DETAILS:
- Approved Budget: $${detection.approvedBudget.toLocaleString()}
- Projected Cost: $${detection.projectedCost.toLocaleString()}
- Overrun: $${detection.overrunAmount.toLocaleString()} (${detection.overrunPercentage.toFixed(1)}%)

${meetingId ? `
EMERGENCY MEETING SCHEDULED:
An emergency meeting has been auto-scheduled to review this issue and make a decision.
Meeting ID: ${meetingId}
You will receive a separate meeting invitation shortly.
` : ''}

REQUIRED ACTION:
1. Review the budget overrun analysis
2. ${meetingId ? 'Attend the emergency meeting' : 'Schedule a review meeting'}
3. Review corrective options
4. Approve the auto-generated Change Request

View in ADPA: ${alertUrl}

This is an automated alert from ADPA Baseline & Drift Detection System.
      `.trim()
      
      await client.query(
        `INSERT INTO notification_queue (
          notification_type, recipient_email, recipient_name,
          subject, body, priority, channels, alert_id, project_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'budget_overrun_alert',
          email,
          role.replace('_', ' '),
          alert.title,
          emailBody,
          priority,
          JSON.stringify(channels),
          alert.id,
          detection.projectId,
          'pending'
        ]
      )
    }
  }
  
  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM budget_overrun_alerts WHERE id = $1`,
      [alertId]
    )
    return result.rows[0] || null
  }
  
  /**
   * List alerts for a project
   */
  async listAlerts(projectId: string, filters?: any): Promise<any[]> {
    let query = `SELECT * FROM budget_overrun_alerts WHERE project_id = $1`
    const params: any[] = [projectId]
    
    if (filters?.status) {
      params.push(filters.status)
      query += ` AND status = $${params.length}`
    }
    
    if (filters?.severity) {
      params.push(filters.severity)
      query += ` AND severity = $${params.length}`
    }
    
    query += ` ORDER BY created_at DESC`
    
    const result = await pool.query(query, params)
    return result.rows
  }
  
  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE budget_overrun_alerts 
       SET status = 'acknowledged', updated_at = NOW()
       WHERE id = $1`,
      [alertId]
    )
    
    logger.info('[BUDGET-ALERT] Alert acknowledged', { alertId, userId })
  }
  
  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, resolutionNotes: string): Promise<void> {
    await pool.query(
      `UPDATE budget_overrun_alerts 
       SET status = 'resolved', 
           resolved_at = NOW(),
           resolved_by = $2,
           resolution_notes = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [alertId, userId, resolutionNotes]
    )
    
    logger.info('[BUDGET-ALERT] Alert resolved', { alertId, userId })
  }
}

export const budgetOverrunAlertService = new BudgetOverrunAlertService()
