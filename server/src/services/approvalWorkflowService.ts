;(async function(){ try{ await (require('../lib/db')).initDb() } catch(e){} })();
/**
 * Approval Workflow Service
 * TASK-745: Approval workflow integration
 * 
 * Manages approval workflows for change requests from drift detection
 * Implements state machine, routing, notifications, and SLA tracking
 */

import { pool, getDatabasePool } from '../database/connection'
import { logger } from '../utils/logger'
import { emailNotificationService } from './emailNotificationService'
import { v4 as uuidv4 } from 'uuid'
import { PoolClient } from 'pg'

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalWorkflow {
  id: string
  name: string
  description?: string
  workflow_type: 'positive_drift' | 'negative_drift' | 'budget_overrun' | 'scope_change' | 'timeline_change' | 'technical_change' | 'general_cr'
  routing_rules: any
  approval_stages: ApprovalStage[]
  sla_hours: number
  critical_sla_hours?: number
  emergency_sla_hours?: number
  escalation_enabled: boolean
  escalation_after_hours?: number
  escalation_to?: string[]
  notification_channels: NotificationChannel[]
  is_active: boolean
}

export interface ApprovalStage {
  stage: number
  role: string
  required: boolean
  required_if?: string  // Conditional expression
}

export type NotificationChannel = 'email' | 'slack' | 'sms' | 'dashboard' | 'webhook'

export type ApprovalRequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'escalated'

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped' | 'delegated'

export type Priority = 'low' | 'medium' | 'high' | 'critical' | 'emergency'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface ApprovalRequest {
  id: string
  workflow_id?: string
  request_type: string
  change_request_id?: string
  drift_record_id?: string
  project_id: string
  title: string
  description: string
  impact_summary?: any
  current_stage: number
  total_stages: number
  status: ApprovalRequestStatus
  priority: Priority
  severity: Severity
  sla_deadline?: Date
  escalation_deadline?: Date
  requested_by: string
  requested_at: Date
  completed_at?: Date
  final_decision?: string
  decision_notes?: string
  decided_by?: string
  decided_at?: Date
  metadata?: any
}

export interface ApprovalStep {
  id: string
  approval_request_id: string
  step_order: number
  step_name: string
  step_description?: string
  approver_role?: string
  approver_user_id?: string
  is_required: boolean
  is_conditional: boolean
  condition_expression?: string
  status: ApprovalStepStatus
  decision?: string
  decision_notes?: string
  conditions?: string[]
  assigned_at: Date
  responded_at?: Date
  delegated_to?: string
  delegated_at?: Date
  delegated_reason?: string
  metadata?: any
}

export interface CreateApprovalRequestParams {
  request_type: string
  change_request_id?: string
  drift_record_id?: string
  project_id: string
  title: string
  description: string
  impact_summary?: any
  priority?: Priority
  severity?: Severity
  requested_by: string
  metadata?: any
}

export interface ApproveStepParams {
  approval_step_id: string
  approver_user_id: string
  decision: 'approved' | 'rejected'
  decision_notes?: string
  conditions?: string[]
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ApprovalWorkflowService {
  /**
   * Create a new approval request
   */
  async createApprovalRequest(params: CreateApprovalRequestParams): Promise<ApprovalRequest> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      logger.info('[APPROVAL-WORKFLOW] Creating approval request', {
        request_type: params.request_type,
        project_id: params.project_id
      })

      // 1. Find appropriate workflow
      const workflow = await this.findWorkflow(client, params.request_type)
      
      if (!workflow) {
        throw new Error(`No active workflow found for type: ${params.request_type}`)
      }

      // 2. Calculate SLA deadline
      const priority = params.priority || 'medium'
      const sla_hours = this.getSLAHours(workflow, priority)
      const sla_deadline = new Date(Date.now() + sla_hours * 60 * 60 * 1000)
      const escalation_deadline = workflow.escalation_after_hours
        ? new Date(Date.now() + workflow.escalation_after_hours * 60 * 60 * 1000)
        : null

      // 3. Create approval request
      const requestId = uuidv4()
      const total_stages = workflow.approval_stages.length

      const requestResult = await client.query(
        `INSERT INTO approval_requests (
          id, workflow_id, request_type, change_request_id, drift_record_id, project_id,
          title, description, impact_summary, current_stage, total_stages,
          status, priority, severity, sla_deadline, escalation_deadline,
          requested_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          requestId,
          workflow.id,
          params.request_type,
          params.change_request_id,
          params.drift_record_id,
          params.project_id,
          params.title,
          params.description,
          JSON.stringify(params.impact_summary || {}),
          1,  // Start at stage 1
          total_stages,
          'pending',
          priority,
          params.severity || 'medium',
          sla_deadline,
          escalation_deadline,
          params.requested_by,
          JSON.stringify(params.metadata || {})
        ]
      )

      const approvalRequest = requestResult.rows[0]

      // 4. Create approval steps from workflow stages
      await this.createApprovalSteps(client, requestId, workflow.approval_stages, params)

      // 5. Send initial notifications
      await this.sendApprovalNotifications(client, requestId, 'approval_requested')

      // 6. Create audit log entry
      await this.createAuditLog(client, requestId, null, 'request_created', 
        'Approval request created', params.requested_by, false)

      await client.query('COMMIT')

      logger.info('[APPROVAL-WORKFLOW] Approval request created', {
        request_id: requestId,
        workflow_id: workflow.id,
        sla_deadline
      })

      return approvalRequest
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[APPROVAL-WORKFLOW] Error creating approval request:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Approve or reject an approval step
   */
  async processApprovalStep(params: ApproveStepParams): Promise<ApprovalRequest> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      logger.info('[APPROVAL-WORKFLOW] Processing approval step', {
        step_id: params.approval_step_id,
        decision: params.decision
      })

      // 1. Get approval step
      const stepResult = await client.query(
        'SELECT * FROM approval_steps WHERE id = $1',
        [params.approval_step_id]
      )

      if (stepResult.rows.length === 0) {
        throw new Error(`Approval step not found: ${params.approval_step_id}`)
      }

      const step = stepResult.rows[0]

      // 2. Verify approver authorization
      if (step.approver_user_id && step.approver_user_id !== params.approver_user_id) {
        throw new Error('User not authorized to approve this step')
      }

      // 3. Update approval step
      await client.query(
        `UPDATE approval_steps
         SET status = $1,
             decision = $2,
             decision_notes = $3,
             conditions = $4,
             responded_at = NOW()
         WHERE id = $5`,
        [
          params.decision === 'approved' ? 'approved' : 'rejected',
          params.decision,
          params.decision_notes,
          params.conditions || null,
          params.approval_step_id
        ]
      )

      // 4. Get approval request
      const requestResult = await client.query(
        'SELECT * FROM approval_requests WHERE id = $1',
        [step.approval_request_id]
      )

      const request = requestResult.rows[0]

      // 5. Handle decision
      if (params.decision === 'rejected') {
        // Rejection stops the entire approval process
        await client.query(
          `UPDATE approval_requests
           SET status = 'rejected',
               final_decision = 'rejected',
               decision_notes = $1,
               decided_by = $2,
               decided_at = NOW(),
               completed_at = NOW()
           WHERE id = $3`,
          [params.decision_notes, params.approver_user_id, request.id]
        )

        // Send rejection notification
        await this.sendApprovalNotifications(client, request.id, 'approval_rejected')
      } else {
        // Check if current stage is complete
        const stageComplete = await this.isStageComplete(client, request.id, request.current_stage)

        if (stageComplete) {
          // Advance to next stage or complete approval
          const hasMoreStages = request.current_stage < request.total_stages

          if (hasMoreStages) {
            await client.query(
              `UPDATE approval_requests
               SET current_stage = current_stage + 1,
                   status = 'in_progress'
               WHERE id = $1`,
              [request.id]
            )

            // Send notification for next stage
            await this.sendApprovalNotifications(client, request.id, 'approval_requested')
          } else {
            // All stages complete
            await client.query(
              `UPDATE approval_requests
               SET status = 'approved',
                   final_decision = 'approved',
                   decided_by = $1,
                   decided_at = NOW(),
                   completed_at = NOW()
               WHERE id = $2`,
              [params.approver_user_id, request.id]
            )

            // Send approval notification
            await this.sendApprovalNotifications(client, request.id, 'approval_approved')

            // Update change request status if linked
            if (request.change_request_id) {
              await client.query(
                `UPDATE documents
                 SET status = 'approved',
                     updated_by = $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [params.approver_user_id, request.change_request_id]
              )
            }
          }
        }
      }

      // 6. Create audit log
      await this.createAuditLog(
        client,
        request.id,
        params.approval_step_id,
        params.decision === 'approved' ? 'approval_granted' : 'approval_rejected',
        `Step ${step.step_order}: ${params.decision}`,
        params.approver_user_id,
        false
      )

      // 7. Get updated request
      const updatedResult = await client.query(
        'SELECT * FROM approval_requests WHERE id = $1',
        [request.id]
      )

      await client.query('COMMIT')

      logger.info('[APPROVAL-WORKFLOW] Approval step processed', {
        request_id: request.id,
        step_id: params.approval_step_id,
        decision: params.decision,
        new_status: updatedResult.rows[0].status
      })

      return updatedResult.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[APPROVAL-WORKFLOW] Error processing approval step:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    try {
      const result = await getDatabasePool().query(
        'SELECT * FROM approval_requests WHERE id = $1',
        [requestId]
      )

      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      logger.error('[APPROVAL-WORKFLOW] Error fetching approval request:', error)
      throw error
    }
  }

  /**
   * Get approval steps for a request
   */
  async getApprovalSteps(requestId: string): Promise<ApprovalStep[]> {
    try {
      const result = await getDatabasePool().query(
        `SELECT * FROM approval_steps 
         WHERE approval_request_id = $1 
         ORDER BY step_order ASC`,
        [requestId]
      )

      return result.rows
    } catch (error) {
      logger.error('[APPROVAL-WORKFLOW] Error fetching approval steps:', error)
      throw error
    }
  }

  /**
   * Get pending approvals for a user
   * Returns approvals that:
   * 1. Are assigned to the user (for approval)
   * 2. Were created by the user (for tracking)
   */
  async getPendingApprovalsForUser(userId: string): Promise<ApprovalRequest[]> {
    try {
      const result = await getDatabasePool().query(
        `SELECT DISTINCT ar.*
         FROM approval_requests ar
         WHERE (
             -- Approvals assigned to the user (for approval)
             EXISTS (
               SELECT 1 FROM approval_steps astep
               WHERE astep.approval_request_id = ar.id
                 AND astep.status = 'pending'
                 AND astep.approver_user_id = $1
             )
             OR
             -- Approvals created by the user (for tracking)
             ar.requested_by = $1
             OR
             -- Approvals for projects owned/managed by the user
             EXISTS (
               SELECT 1 FROM projects p
               WHERE p.id = ar.project_id
                 AND p.owner_id = $1
             )
           )
         ORDER BY ar.priority DESC, ar.sla_deadline ASC, ar.created_at DESC`,
        [userId]
      )

      return result.rows
    } catch (error) {
      logger.error('[APPROVAL-WORKFLOW] Error fetching pending approvals:', error)
      throw error
    }
  }

  /**
   * Check for SLA breaches and send reminders
   */
  async checkSLABreaches(): Promise<void> {
    try {
      logger.info('[APPROVAL-WORKFLOW] Checking for SLA breaches')

      // Find requests approaching or past SLA
      const result = await getDatabasePool().query(
        `SELECT * FROM approval_requests
         WHERE status IN ('pending', 'in_progress')
           AND sla_deadline IS NOT NULL
           AND sla_deadline < NOW() + INTERVAL '2 hours'`
      )

      for (const request of result.rows) {
        if (new Date(request.sla_deadline) < new Date()) {
          // SLA breached
          await this.handleSLABreach(request)
        } else {
          // Send reminder
          await this.sendReminder(request)
        }
      }
    } catch (error) {
      logger.error('[APPROVAL-WORKFLOW] Error checking SLA breaches:', error)
      throw error
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Find appropriate workflow for request type
   */
  private async findWorkflow(client: PoolClient, requestType: string): Promise<ApprovalWorkflow | null> {
    const result = await client.query(
      `SELECT * FROM approval_workflows
       WHERE workflow_type = $1
         AND is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 1`,
      [requestType]
    )

    return result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Get SLA hours based on workflow and priority
   */
  private getSLAHours(workflow: ApprovalWorkflow, priority: Priority): number {
    switch (priority) {
      case 'emergency':
        return workflow.emergency_sla_hours || workflow.critical_sla_hours || workflow.sla_hours
      case 'critical':
        return workflow.critical_sla_hours || workflow.sla_hours
      default:
        return workflow.sla_hours
    }
  }

  /**
   * Create approval steps from workflow stages
   */
  private async createApprovalSteps(
    client: PoolClient,
    requestId: string,
    stages: ApprovalStage[],
    requestParams: CreateApprovalRequestParams
  ): Promise<void> {
    for (const stage of stages) {
      // Find users with the required role, ordered by created date for consistency
      const userResult = await client.query(
        `SELECT id FROM users WHERE role = $1 ORDER BY created_at ASC LIMIT 1`,
        [stage.role]
      )

      const approverUserId = userResult.rows.length > 0 ? userResult.rows[0].id : null

      await client.query(
        `INSERT INTO approval_steps (
          approval_request_id, step_order, step_name, approver_role, approver_user_id,
          is_required, is_conditional, condition_expression, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          requestId,
          stage.stage,
          `Approval by ${stage.role}`,
          stage.role,
          approverUserId,
          stage.required,
          !!stage.required_if,
          stage.required_if || null,
          'pending'
        ]
      )
    }
  }

  /**
   * Check if current stage is complete
   */
  private async isStageComplete(client: PoolClient, requestId: string, currentStage: number): Promise<boolean> {
    const result = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
              COUNT(CASE WHEN is_required = TRUE THEN 1 END) as required,
              COUNT(CASE WHEN is_required = TRUE AND status = 'approved' THEN 1 END) as required_approved
       FROM approval_steps
       WHERE approval_request_id = $1
         AND step_order = $2`,
      [requestId, currentStage]
    )

    const stats = result.rows[0]
    
    // All required steps must be approved
    return parseInt(stats.required_approved) === parseInt(stats.required)
  }

  /**
   * Send approval notifications
   */
  private async sendApprovalNotifications(
    client: PoolClient,
    requestId: string,
    notificationType: string
  ): Promise<void> {
    // Get request details
    const requestResult = await client.query(
      `SELECT ar.*, p.name as project_name
       FROM approval_requests ar
       LEFT JOIN projects p ON ar.project_id = p.id
       WHERE ar.id = $1`,
      [requestId]
    )

    if (requestResult.rows.length === 0) return

    const request = requestResult.rows[0]

    // Get current stage approvers
    const approversResult = await client.query(
      `SELECT astep.*, u.email, u.name as user_name
       FROM approval_steps astep
       LEFT JOIN users u ON astep.approver_user_id = u.id
       WHERE astep.approval_request_id = $1
         AND astep.step_order = $2
         AND astep.status = 'pending'`,
      [requestId, request.current_stage]
    )

    for (const approver of approversResult.rows) {
      if (!approver.email) continue

      const subject = this.getNotificationSubject(notificationType, request)
      const message = this.getNotificationMessage(notificationType, request, approver)

      // Send email
      try {
        await emailNotificationService.sendEmail({
          to: approver.email,
          subject,
          text: message
        })

        // Log notification
        await client.query(
          `INSERT INTO approval_notifications (
            approval_request_id, approval_step_id, notification_type,
            channel, recipient_user_id, recipient_email, subject, message, status, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            requestId,
            approver.id,
            notificationType,
            'email',
            approver.approver_user_id,
            approver.email,
            subject,
            message,
            'sent'
          ]
        )
      } catch (error) {
        logger.error('[APPROVAL-WORKFLOW] Error sending notification:', error)
      }
    }
  }

  /**
   * Get notification subject
   */
  private getNotificationSubject(notificationType: string, request: ApprovalRequest): string {
    const priorityEmoji = {
      emergency: '🚨🚨',
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '📋'
    }

    const emoji = priorityEmoji[request.priority] || 'ℹ️'

    switch (notificationType) {
      case 'approval_requested':
        return `${emoji} Approval Required: ${request.title}`
      case 'approval_reminder':
        return `⏰ Reminder: Pending Approval - ${request.title}`
      case 'approval_escalated':
        return `🚨 ESCALATED: Approval Required - ${request.title}`
      case 'approval_approved':
        return `✅ Approved: ${request.title}`
      case 'approval_rejected':
        return `❌ Rejected: ${request.title}`
      default:
        return `Approval Notification: ${request.title}`
    }
  }

  /**
   * Get notification message
   */
  private getNotificationMessage(notificationType: string, request: any, approver: any): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const approvalUrl = `${baseUrl}/approvals/${request.id}`

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPROVAL REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request: ${request.title}
Type: ${request.request_type}
Priority: ${request.priority.toUpperCase()}
Project: ${request.project_name || 'N/A'}

Description:
${request.description}

SLA Deadline: ${new Date(request.sla_deadline).toLocaleString()}

Your Action Required:
You have been assigned to approve this request as: ${approver.approver_role}

[Review and Approve/Reject in ADPA]
${approvalUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from ADPA Approval Workflow System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    client: PoolClient,
    requestId: string,
    stepId: string | null,
    actionType: string,
    description: string,
    performedBy: string,
    isSystem: boolean
  ): Promise<void> {
    await client.query(
      `INSERT INTO approval_audit_log (
        approval_request_id, approval_step_id, action_type, action_description,
        performed_by, performed_by_system
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [requestId, stepId, actionType, description, isSystem ? null : performedBy, isSystem]
    )
  }

  /**
   * Handle SLA breach
   */
  private async handleSLABreach(request: ApprovalRequest): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      logger.warn('[APPROVAL-WORKFLOW] SLA breach detected', {
        request_id: request.id,
        sla_deadline: request.sla_deadline
      })

      // Update request status
      await client.query(
        `UPDATE approval_requests
         SET status = 'expired'
         WHERE id = $1`,
        [request.id]
      )

      // Create escalation record
      await client.query(
        `INSERT INTO approval_escalations (
          approval_request_id, escalation_type, reason, escalated_by
        ) VALUES ($1, $2, $3, $4)`,
        [
          request.id,
          'sla_breach',
          `SLA deadline ${request.sla_deadline} exceeded`,
          null  // System escalation
        ]
      )

      // Send escalation notifications
      await this.sendApprovalNotifications(client, request.id, 'approval_escalated')

      // Create audit log
      await this.createAuditLog(
        client,
        request.id,
        null,
        'sla_breached',
        'SLA deadline exceeded',
        '',
        true
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[APPROVAL-WORKFLOW] Error handling SLA breach:', error)
    } finally {
      client.release()
    }
  }

  /**
   * Send reminder for pending approval
   */
  private async sendReminder(request: ApprovalRequest): Promise<void> {
    const client = await pool.connect()

    try {
      await this.sendApprovalNotifications(client, request.id, 'approval_reminder')
    } catch (error) {
      logger.error('[APPROVAL-WORKFLOW] Error sending reminder:', error)
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const approvalWorkflowService = new ApprovalWorkflowService()
