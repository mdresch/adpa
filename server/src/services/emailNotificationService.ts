/**
 * Email Notification Service
 * TASK-739: Email notification system
 * 
 * Handles email notifications for drift detection, change requests, and alerts
 * Based on DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md specification
 */

import * as nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

export interface EmailRecipient {
  email: string
  name?: string
  role?: string
}

export interface EmailOptions {
  to: EmailRecipient[]
  cc?: EmailRecipient[]
  subject: string
  text?: string
  html?: string
  priority?: 'high' | 'normal' | 'low'
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface NotificationContext {
  projectId?: string
  projectName?: string
  driftDetectionId?: string
  changeRequestId?: string
  severity?: string
  driftType?: string
  variance?: number
  deadline?: Date
  metadata?: Record<string, any>
}

export interface PositiveDriftEmailData extends NotificationContext {
  title: string
  description: string
  costSavings?: number
  timeAcceleration?: number
  qualityImprovement?: number
  potentialValue?: number
  replicableProjects?: number
  recommendations?: string[]
}

export interface BudgetOverrunEmailData extends NotificationContext {
  approvedBudget: number
  projectedCost: number
  overrunAmount: number
  overrunPercentage: number
  rootCause?: string
  options?: Array<{
    option: string
    impact: string
    recommendation: boolean
  }>
}

export interface ScopeCreepEmailData extends NotificationContext {
  baselineScope: string[]
  currentScope: string[]
  scopeIncrease: number
  unapprovedFeatures?: string[]
}

export class EmailNotificationService {
  private transporter: Transporter | null = null
  private enabled: boolean = false
  private fromAddress: string = 'ADPA Framework <noreply@adpa.com>'

  constructor() {
    this.initialize()
  }

  /**
   * Initialize email transporter
   */
  private initialize(): void {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM

    if (!smtpHost || !smtpUser || !smtpPass) {
      logger.warn('[EMAIL] SMTP configuration not found, email notifications disabled')
      this.enabled = false
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })

      if (smtpFrom) {
        this.fromAddress = smtpFrom
      }

      this.enabled = true
      logger.info('[EMAIL] Email notification service initialized', { host: smtpHost, port: smtpPort })
    } catch (error) {
      logger.error('[EMAIL] Failed to initialize email service', error)
      this.enabled = false
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.warn('[EMAIL] Email service not enabled, skipping notification')
      return false
    }

    try {
      const mailOptions = {
        from: this.fromAddress,
        to: options.to.map(r => r.email).join(', '),
        cc: options.cc?.map(r => r.email).join(', '),
        subject: options.subject,
        text: options.text,
        html: options.html,
        priority: options.priority || 'normal',
        attachments: options.attachments
      }

      const info = await this.transporter.sendMail(mailOptions)
      
      logger.info('[EMAIL] Email sent successfully', {
        messageId: info.messageId,
        recipients: options.to.length,
        subject: options.subject
      })

      return true
    } catch (error) {
      logger.error('[EMAIL] Failed to send email', {
        error,
        subject: options.subject,
        recipients: options.to.length
      })
      return false
    }
  }

  /**
   * Get user email addresses by roles
   */
  async getUsersByRoles(roles: string[]): Promise<EmailRecipient[]> {
    try {
      const result = await pool.query(
        `SELECT email, first_name, last_name, role 
         FROM users 
         WHERE role = ANY($1) 
         AND email IS NOT NULL 
         AND email != ''`,
        [roles]
      )

      return result.rows.map(row => ({
        email: row.email,
        name: `${row.first_name} ${row.last_name}`.trim(),
        role: row.role
      }))
    } catch (error) {
      logger.error('[EMAIL] Failed to get users by roles', { error, roles })
      return []
    }
  }

  /**
   * Get project stakeholder emails
   */
  async getProjectStakeholders(projectId: string): Promise<EmailRecipient[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT u.email, u.first_name, u.last_name, u.role
         FROM users u
         INNER JOIN project_stakeholders ps ON u.id = ps.user_id
         WHERE ps.project_id = $1
         AND u.email IS NOT NULL
         AND u.email != ''`,
        [projectId]
      )

      return result.rows.map(row => ({
        email: row.email,
        name: `${row.first_name} ${row.last_name}`.trim(),
        role: row.role
      }))
    } catch (error) {
      logger.error('[EMAIL] Failed to get project stakeholders', { error, projectId })
      return []
    }
  }

  /**
   * Send positive drift opportunity notification
   */
  async sendPositiveDriftNotification(data: PositiveDriftEmailData): Promise<boolean> {
    const subject = `✨ Opportunity: ${data.title}`
    
    const html = this.generatePositiveDriftEmailHTML(data)
    const text = this.generatePositiveDriftEmailText(data)

    // Get recipients based on severity
    const recipients = await this.getUsersByRoles(['project_sponsor', 'innovation_lead', 'admin'])

    if (recipients.length === 0) {
      logger.warn('[EMAIL] No recipients found for positive drift notification')
      return false
    }

    return this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
      priority: 'normal'
    })
  }

  /**
   * Send budget overrun critical alert
   */
  async sendBudgetOverrunAlert(data: BudgetOverrunEmailData): Promise<boolean> {
    const severity = data.overrunPercentage >= 25 ? '🚨🚨 EMERGENCY' : '🚨 CRITICAL'
    const subject = `${severity}: Budget Overrun $${data.overrunAmount.toLocaleString()} - ${data.projectName}`
    
    const html = this.generateBudgetOverrunEmailHTML(data)
    const text = this.generateBudgetOverrunEmailText(data)

    // Get recipients based on severity
    const roles = data.overrunPercentage >= 25 
      ? ['ceo', 'cfo', 'admin'] 
      : ['cfo', 'project_sponsor', 'admin']

    const recipients = await this.getUsersByRoles(roles)

    if (recipients.length === 0) {
      logger.warn('[EMAIL] No recipients found for budget overrun alert')
      return false
    }

    return this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
      priority: 'high'
    })
  }

  /**
   * Send scope creep alert
   */
  async sendScopeCreepAlert(data: ScopeCreepEmailData): Promise<boolean> {
    const severity = data.scopeIncrease >= 25 ? '🚨 CRITICAL' : '⚠️ WARNING'
    const subject = `${severity}: Scope Creep Detected (${data.scopeIncrease}%) - ${data.projectName}`
    
    const html = this.generateScopeCreepEmailHTML(data)
    const text = this.generateScopeCreepEmailText(data)

    const roles = data.scopeIncrease >= 25 
      ? ['project_sponsor', 'cfo', 'cto', 'admin'] 
      : ['project_sponsor', 'project_manager', 'admin']

    const recipients = await this.getUsersByRoles(roles)

    if (recipients.length === 0) {
      logger.warn('[EMAIL] No recipients found for scope creep alert')
      return false
    }

    return this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
      priority: data.scopeIncrease >= 25 ? 'high' : 'normal'
    })
  }

  /**
   * Generate positive drift email HTML
   */
  private generatePositiveDriftEmailHTML(data: PositiveDriftEmailData): string {
    const value = data.potentialValue ? `$${data.potentialValue.toLocaleString()}` : 'TBD'
    const replicable = data.replicableProjects ? `${data.replicableProjects} projects` : 'Multiple projects'

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .highlight { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
    .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .recommendations { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✨ Positive Drift Detected - Opportunity!</h1>
  </div>
  
  <div class="content">
    <h2>${data.title}</h2>
    
    <div class="highlight">
      <h3>What Happened:</h3>
      <p>${data.description}</p>
    </div>

    <div class="metrics">
      ${data.costSavings ? `
      <div class="metric">
        <div class="metric-label">Cost Savings</div>
        <div class="metric-value">$${data.costSavings.toLocaleString()}</div>
      </div>
      ` : ''}
      ${data.timeAcceleration ? `
      <div class="metric">
        <div class="metric-label">Time Acceleration</div>
        <div class="metric-value">${data.timeAcceleration} days</div>
      </div>
      ` : ''}
      ${data.qualityImprovement ? `
      <div class="metric">
        <div class="metric-label">Quality Improvement</div>
        <div class="metric-value">${data.qualityImprovement}%</div>
      </div>
      ` : ''}
    </div>

    <div class="highlight">
      <h3>Value:</h3>
      <ul>
        <li><strong>Potential Value:</strong> ${value}</li>
        <li><strong>Replication Potential:</strong> ${replicable}</li>
        ${data.changeRequestId ? `<li><strong>Auto-Generated CR:</strong> ${data.changeRequestId}</li>` : ''}
      </ul>
    </div>

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="recommendations">
      <h3>Recommended Actions:</h3>
      <ul>
        ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${data.changeRequestId ? `<a href="${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}" class="btn">Review Change Request</a>` : ''}
      ${data.projectId ? `<a href="${process.env.FRONTEND_URL}/projects/${data.projectId}" class="btn">View Project</a>` : ''}
    </div>

    <div class="footer">
      <p>This is an automated notification from ADPA Drift Detection System</p>
      <p>Project: ${data.projectName || 'N/A'} | Severity: ${data.severity || 'medium'}</p>
      ${data.deadline ? `<p>Action Required By: ${new Date(data.deadline).toLocaleString()}</p>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate positive drift email plain text
   */
  private generatePositiveDriftEmailText(data: PositiveDriftEmailData): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSITIVE DRIFT DETECTED - Opportunity!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.title}

What Happened:
${data.description}

Results:
${data.costSavings ? `├─ Cost Savings: $${data.costSavings.toLocaleString()}` : ''}
${data.timeAcceleration ? `├─ Time Acceleration: ${data.timeAcceleration} days faster` : ''}
${data.qualityImprovement ? `├─ Quality Improvement: ${data.qualityImprovement}%` : ''}

Value:
├─ Potential Value: ${data.potentialValue ? `$${data.potentialValue.toLocaleString()}` : 'TBD'}
├─ Replication Potential: ${data.replicableProjects ? `${data.replicableProjects} projects` : 'Multiple projects'}
${data.changeRequestId ? `└─ Auto-Generated CR: ${data.changeRequestId}` : ''}

${data.recommendations && data.recommendations.length > 0 ? `
Recommended Actions:
${data.recommendations.map(rec => `☑ ${rec}`).join('\n')}
` : ''}

Project: ${data.projectName || 'N/A'}
Severity: ${data.severity || 'medium'}
${data.deadline ? `Deadline: ${new Date(data.deadline).toLocaleString()}` : ''}

${data.changeRequestId ? `Review CR: ${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}` : ''}
${data.projectId ? `View Project: ${process.env.FRONTEND_URL}/projects/${data.projectId}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from ADPA Drift Detection System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * Generate budget overrun email HTML
   */
  private generateBudgetOverrunEmailHTML(data: BudgetOverrunEmailData): string {
    const emergencyLevel = data.overrunPercentage >= 25
    const headerColor = emergencyLevel ? '#dc2626' : '#ea580c'

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
    .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #dc2626; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .options { background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .option { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #f59e0b; }
    .recommended { border-left-color: #10b981; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.overrunPercentage >= 25 ? '🚨🚨 EMERGENCY' : '🚨 CRITICAL'}: Budget Overrun Alert</h1>
  </div>
  
  <div class="content">
    <h2>${data.projectName}</h2>
    
    <div class="alert">
      <h3>⚠️ Project Exceeding Budget by ${data.overrunPercentage.toFixed(1)}%</h3>
      <p>Immediate action required to address budget overrun.</p>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Approved Budget</div>
        <div class="metric-value" style="color: #10b981;">$${data.approvedBudget.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Projected Cost</div>
        <div class="metric-value">$${data.projectedCost.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Overrun</div>
        <div class="metric-value">$${data.overrunAmount.toLocaleString()}</div>
      </div>
    </div>

    ${data.rootCause ? `
    <div class="alert">
      <h3>Root Cause:</h3>
      <p>${data.rootCause}</p>
    </div>
    ` : ''}

    ${data.options && data.options.length > 0 ? `
    <div class="options">
      <h3>Options for Immediate Action:</h3>
      ${data.options.map((opt, idx) => `
        <div class="option ${opt.recommendation ? 'recommended' : ''}">
          <strong>${idx + 1}. ${opt.option}</strong>
          ${opt.recommendation ? ' <span style="color: #10b981;">✓ RECOMMENDED</span>' : ''}
          <p>${opt.impact}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${data.changeRequestId ? `<a href="${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}" class="btn">Review Change Request</a>` : ''}
      ${data.projectId ? `<a href="${process.env.FRONTEND_URL}/projects/${data.projectId}" class="btn">View Project</a>` : ''}
    </div>

    <div class="footer">
      <p><strong>DECISION REQUIRED: Within ${data.deadline ? Math.round((new Date(data.deadline).getTime() - Date.now()) / (1000 * 60 * 60)) : 24} hours</strong></p>
      ${data.changeRequestId ? `<p>Change Request: ${data.changeRequestId}</p>` : ''}
      <p>This is an automated emergency alert from ADPA Drift Detection System</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate budget overrun email plain text
   */
  private generateBudgetOverrunEmailText(data: BudgetOverrunEmailData): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.overrunPercentage >= 25 ? '🚨🚨 EMERGENCY' : '🚨 CRITICAL'}: BUDGET OVERRUN ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${data.projectName}
Severity: ${data.overrunPercentage >= 25 ? 'EMERGENCY' : 'CRITICAL'} (${data.overrunPercentage.toFixed(1)}% over budget)

APPROVED BUDGET:   $${data.approvedBudget.toLocaleString()}
PROJECTED COST:    $${data.projectedCost.toLocaleString()}
OVERRUN:           $${data.overrunAmount.toLocaleString()} (${data.overrunPercentage.toFixed(1)}%)

${data.rootCause ? `
Root Cause:
${data.rootCause}
` : ''}

${data.options && data.options.length > 0 ? `
Options for Immediate Action:
${data.options.map((opt, idx) => `
${idx + 1}. ${opt.option} ${opt.recommendation ? '✓ RECOMMENDED' : ''}
   ${opt.impact}
`).join('\n')}
` : ''}

DECISION REQUIRED: Within ${data.deadline ? Math.round((new Date(data.deadline).getTime() - Date.now()) / (1000 * 60 * 60)) : 24} hours
${data.changeRequestId ? `Change Request: ${data.changeRequestId}` : ''}

${data.changeRequestId ? `Review CR: ${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}` : ''}
${data.projectId ? `View Project: ${process.env.FRONTEND_URL}/projects/${data.projectId}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated emergency alert from ADPA Drift Detection System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * Generate scope creep email HTML
   */
  private generateScopeCreepEmailHTML(data: ScopeCreepEmailData): string {
    const isCritical = data.scopeIncrease >= 25
    const headerColor = isCritical ? '#dc2626' : '#f59e0b'

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert { background-color: ${isCritical ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${headerColor}; padding: 15px; margin: 15px 0; }
    .scope-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .scope-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
    .scope-box h4 { margin-top: 0; color: #64748b; }
    .scope-item { padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .added { color: #dc2626; font-weight: bold; }
    .btn { display: inline-block; background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isCritical ? '🚨 CRITICAL' : '⚠️ WARNING'}: Scope Creep Detected</h1>
  </div>
  
  <div class="content">
    <h2>${data.projectName}</h2>
    
    <div class="alert">
      <h3>Scope Increased by ${data.scopeIncrease}% Without Approval</h3>
      <p>Project scope has deviated from the approved baseline.</p>
    </div>

    <div class="scope-comparison">
      <div class="scope-box">
        <h4>Baseline Scope (${data.baselineScope.length} items)</h4>
        ${data.baselineScope.map(item => `<div class="scope-item">${item}</div>`).join('')}
      </div>
      <div class="scope-box">
        <h4>Current Scope (${data.currentScope.length} items)</h4>
        ${data.currentScope.map(item => {
          const isNew = !data.baselineScope.includes(item)
          return `<div class="scope-item ${isNew ? 'added' : ''}">${item} ${isNew ? '(NEW)' : ''}</div>`
        }).join('')}
      </div>
    </div>

    ${data.unapprovedFeatures && data.unapprovedFeatures.length > 0 ? `
    <div class="alert">
      <h3>Unapproved Features:</h3>
      <ul>
        ${data.unapprovedFeatures.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${data.changeRequestId ? `<a href="${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}" class="btn">Review Change Request</a>` : ''}
      ${data.projectId ? `<a href="${process.env.FRONTEND_URL}/projects/${data.projectId}" class="btn">View Project</a>` : ''}
    </div>

    <div class="footer">
      <p><strong>Action Required</strong></p>
      ${data.changeRequestId ? `<p>Change Request: ${data.changeRequestId}</p>` : ''}
      <p>This is an automated alert from ADPA Drift Detection System</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate scope creep email plain text
   */
  private generateScopeCreepEmailText(data: ScopeCreepEmailData): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.scopeIncrease >= 25 ? '🚨 CRITICAL' : '⚠️ WARNING'}: SCOPE CREEP DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${data.projectName}
Scope Increase: ${data.scopeIncrease}%

Baseline Scope (${data.baselineScope.length} items):
${data.baselineScope.map(item => `  • ${item}`).join('\n')}

Current Scope (${data.currentScope.length} items):
${data.currentScope.map(item => {
  const isNew = !data.baselineScope.includes(item)
  return `  ${isNew ? '→' : '•'} ${item}${isNew ? ' (NEW - UNAPPROVED)' : ''}`
}).join('\n')}

${data.unapprovedFeatures && data.unapprovedFeatures.length > 0 ? `
Unapproved Features:
${data.unapprovedFeatures.map(f => `  ⚠ ${f}`).join('\n')}
` : ''}

Action Required
${data.changeRequestId ? `Change Request: ${data.changeRequestId}` : ''}

${data.changeRequestId ? `Review CR: ${process.env.FRONTEND_URL}/change-requests/${data.changeRequestId}` : ''}
${data.projectId ? `View Project: ${process.env.FRONTEND_URL}/projects/${data.projectId}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated alert from ADPA Drift Detection System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.error('[EMAIL] Email service not configured')
      return false
    }

    try {
      await this.transporter.verify()
      logger.info('[EMAIL] Email configuration verified successfully')
      return true
    } catch (error) {
      logger.error('[EMAIL] Email configuration verification failed', error)
      return false
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService()
