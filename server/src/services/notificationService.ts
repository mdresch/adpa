/**
 * Notification Service
 * Handles email notifications for quality issues, weekly digests, and template improvements
 * 
 * Features:
 * - Low-quality document alerts (< 70%)
 * - Weekly quality digest for admins
 * - Template improvement notifications
 * - SLA threshold breach alerts
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import nodemailer from 'nodemailer'

interface EmailRecipient {
  email: string
  name: string
}

interface LowQualityAlert {
  documentId: string
  documentTitle: string
  projectName: string
  qualityScore: number
  templateName: string
  auditedAt: Date
  issues: any[]
}

interface WeeklyDigest {
  avgQuality: number
  totalAudits: number
  lowQualityCount: number
  templatesWithIssues: number
  topIssues: any[]
  slaCompliance: number
}

interface TemplateImprovementNotification {
  templateName: string
  currentQuality: number
  expectedGain: number
  priority: string
  suggestionId: string
}

class NotificationService {
  private transporter: nodemailer.Transporter | null = null
  private enabled: boolean = false

  constructor() {
    this.initializeEmailTransport()
  }

  /**
   * Initialize email transport
   */
  private initializeEmailTransport() {
    try {
      // Check if email configuration is provided
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        })

        this.enabled = true
        logger.info('[NOTIFICATION] Email service initialized')
      } else {
        logger.warn('[NOTIFICATION] Email service disabled - SMTP configuration missing')
        logger.warn('[NOTIFICATION] Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email notifications')
      }
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to initialize email service', { error })
      this.enabled = false
    }
  }

  /**
   * Send low-quality document alert
   */
  async sendLowQualityAlert(alert: LowQualityAlert, recipients: EmailRecipient[]) {
    if (!this.enabled) {
      logger.debug('[NOTIFICATION] Email disabled, skipping low-quality alert')
      return
    }

    try {
      const emailContent = this.buildLowQualityEmailHTML(alert)

      await this.sendEmail({
        to: recipients.map(r => r.email).join(', '),
        subject: `⚠️ Low Quality Document Alert: ${alert.documentTitle}`,
        html: emailContent
      })

      logger.info('[NOTIFICATION] Low-quality alert sent', {
        documentId: alert.documentId,
        score: alert.qualityScore,
        recipientCount: recipients.length
      })

      // Log notification in database
      await this.logNotification({
        type: 'low_quality_alert',
        recipientEmails: recipients.map(r => r.email),
        metadata: {
          documentId: alert.documentId,
          qualityScore: alert.qualityScore,
          templateName: alert.templateName
        }
      })

    } catch (error) {
      logger.error('[NOTIFICATION] Failed to send low-quality alert', {
        documentId: alert.documentId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Send weekly quality digest to admins
   */
  async sendWeeklyDigest(digest: WeeklyDigest) {
    if (!this.enabled) {
      logger.debug('[NOTIFICATION] Email disabled, skipping weekly digest')
      return
    }

    try {
      // Get admin users
      const admins = await this.getAdminUsers()

      if (admins.length === 0) {
        logger.warn('[NOTIFICATION] No admin users found for weekly digest')
        return
      }

      const emailContent = this.buildWeeklyDigestHTML(digest)

      await this.sendEmail({
        to: admins.map(a => a.email).join(', '),
        subject: `📊 Weekly Quality Report: ${digest.avgQuality}% Avg Quality`,
        html: emailContent
      })

      logger.info('[NOTIFICATION] Weekly digest sent', {
        recipientCount: admins.length,
        avgQuality: digest.avgQuality
      })

      // Log notification
      await this.logNotification({
        type: 'weekly_digest',
        recipientEmails: admins.map(a => a.email),
        metadata: {
          avgQuality: digest.avgQuality,
          totalAudits: digest.totalAudits,
          slaCompliance: digest.slaCompliance
        }
      })

    } catch (error) {
      logger.error('[NOTIFICATION] Failed to send weekly digest', { error })
    }
  }

  /**
   * Send template improvement notification
   */
  async sendTemplateImprovementNotification(notification: TemplateImprovementNotification) {
    if (!this.enabled) {
      logger.debug('[NOTIFICATION] Email disabled, skipping template improvement notification')
      return
    }

    try {
      const admins = await this.getAdminUsers()

      if (admins.length === 0) {
        logger.warn('[NOTIFICATION] No admin users for template improvement notification')
        return
      }

      const emailContent = this.buildTemplateImprovementHTML(notification)

      await this.sendEmail({
        to: admins.map(a => a.email).join(', '),
        subject: `🎯 Template Improvement Suggestion: ${notification.templateName} (${notification.priority.toUpperCase()})`,
        html: emailContent
      })

      logger.info('[NOTIFICATION] Template improvement notification sent', {
        templateName: notification.templateName,
        priority: notification.priority,
        recipientCount: admins.length
      })

      // Log notification
      await this.logNotification({
        type: 'template_improvement',
        recipientEmails: admins.map(a => a.email),
        metadata: {
          templateName: notification.templateName,
          suggestionId: notification.suggestionId,
          priority: notification.priority,
          expectedGain: notification.expectedGain
        }
      })

    } catch (error) {
      logger.error('[NOTIFICATION] Failed to send template improvement notification', { error })
    }
  }

  /**
   * Send SLA threshold breach alert
   */
  async sendSLABreachAlert(templateName: string, currentQuality: number, threshold: number) {
    if (!this.enabled) {
      logger.debug('[NOTIFICATION] Email disabled, skipping SLA breach alert')
      return
    }

    try {
      const admins = await this.getAdminUsers()

      if (admins.length === 0) {
        logger.warn('[NOTIFICATION] No admin users for SLA breach alert')
        return
      }

      const emailContent = this.buildSLABreachHTML(templateName, currentQuality, threshold)

      await this.sendEmail({
        to: admins.map(a => a.email).join(', '),
        subject: `🚨 SLA Breach Alert: ${templateName} Quality Below Threshold`,
        html: emailContent
      })

      logger.info('[NOTIFICATION] SLA breach alert sent', {
        templateName,
        currentQuality,
        threshold,
        recipientCount: admins.length
      })

      // Log notification
      await this.logNotification({
        type: 'sla_breach',
        recipientEmails: admins.map(a => a.email),
        metadata: {
          templateName,
          currentQuality,
          threshold
        }
      })

    } catch (error) {
      logger.error('[NOTIFICATION] Failed to send SLA breach alert', { error })
    }
  }

  /**
   * Get admin users for notifications
   */
  private async getAdminUsers(): Promise<EmailRecipient[]> {
    const result = await pool.query(
      `SELECT id, email, name 
       FROM users 
       WHERE role = 'admin' 
       AND email IS NOT NULL
       AND deleted_at IS NULL`
    )

    return result.rows.map(row => ({
      email: row.email,
      name: row.name || row.email
    }))
  }

  /**
   * Build HTML for low-quality alert email
   */
  private buildLowQualityEmailHTML(alert: LowQualityAlert): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .score { font-size: 48px; font-weight: bold; color: #dc2626; }
    .issue { background: white; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 3px solid #f59e0b; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Low Quality Document Alert</h1>
      <p>A document has fallen below quality standards and requires attention.</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2>Document: ${alert.documentTitle}</h2>
        <p><strong>Project:</strong> ${alert.projectName}</p>
        <p><strong>Template:</strong> ${alert.templateName}</p>
        <p><strong>Quality Score:</strong> <span class="score">${alert.qualityScore}%</span></p>
        <p><em>Threshold: 70%</em></p>
      </div>

      <h3>Issues Found:</h3>
      ${alert.issues.map(issue => `
        <div class="issue">
          <strong>${issue.severity}</strong> - ${issue.dimension}<br>
          ${issue.description}
        </div>
      `).join('')}

      <p><strong>Action Required:</strong> Review the document and address the identified issues to improve quality.</p>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${alert.documentId}" class="button">
        View Document
      </a>

      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
        This is an automated notification from ADPA Quality Control System.<br>
        Audited: ${new Date(alert.auditedAt).toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for weekly digest email
   */
  private buildWeeklyDigestHTML(digest: WeeklyDigest): string {
    const statusColor = digest.avgQuality >= 85 ? '#10b981' : digest.avgQuality >= 70 ? '#f59e0b' : '#dc2626'
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .metric { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid ${statusColor}; }
    .metric-value { font-size: 36px; font-weight: bold; color: ${statusColor}; }
    .issue { background: #fef3c7; padding: 10px; margin: 10px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Quality Report</h1>
      <p>Quality performance summary for the past 7 days</p>
    </div>
    <div class="content">
      <div class="metric">
        <h3>Average Quality Score</h3>
        <div class="metric-value">${digest.avgQuality}%</div>
        <p>${digest.totalAudits} documents audited</p>
      </div>

      <div class="metric">
        <h3>SLA Compliance</h3>
        <div class="metric-value">${digest.slaCompliance}%</div>
        <p>Target: 90% of documents above 85% quality</p>
      </div>

      <div class="metric">
        <h3>Low Quality Documents</h3>
        <div class="metric-value" style="color: #dc2626;">${digest.lowQualityCount}</div>
        <p>Documents below 70% quality threshold</p>
      </div>

      <div class="metric">
        <h3>Templates Needing Attention</h3>
        <div class="metric-value" style="color: #f59e0b;">${digest.templatesWithIssues}</div>
        <p>Templates with quality issues</p>
      </div>

      <h3>Top Issues This Week:</h3>
      ${digest.topIssues.map((issue, idx) => `
        <div class="issue">
          ${idx + 1}. ${issue.description} (${issue.count} occurrences)
        </div>
      `).join('')}

      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
        This is an automated weekly report from ADPA Quality Control System.
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for template improvement notification
   */
  private buildTemplateImprovementHTML(notification: TemplateImprovementNotification): string {
    const priorityColor = notification.priority === 'critical' ? '#dc2626' : 
                         notification.priority === 'high' ? '#f59e0b' : '#3b82f6'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .priority { background: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; text-transform: uppercase; }
    .gain { font-size: 42px; font-weight: bold; color: #10b981; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Template Improvement Suggestion</h1>
      <p>AI has identified an opportunity to improve template quality</p>
    </div>
    <div class="content">
      <h2>${notification.templateName}</h2>
      <p><span class="priority">${notification.priority} Priority</span></p>

      <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Current Quality</h3>
        <p style="font-size: 32px; font-weight: bold; color: #6b7280;">${notification.currentQuality}%</p>
      </div>

      <div style="background: #d1fae5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
        <h3>Expected Quality Gain</h3>
        <div class="gain">+${notification.expectedGain}%</div>
        <p>Predicted improvement after applying AI-generated optimizations</p>
      </div>

      <p><strong>Action Required:</strong> Review the AI-generated template improvements in the admin dashboard.</p>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/templates" class="button">
        Review Suggestion
      </a>

      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
        This is an automated notification from ADPA Quality Control System.
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for SLA breach alert
   */
  private buildSLABreachHTML(templateName: string, currentQuality: number, threshold: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert { background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .score { font-size: 48px; font-weight: bold; color: #dc2626; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 SLA Threshold Breach Alert</h1>
      <p>Template quality has fallen below SLA requirements</p>
    </div>
    <div class="content">
      <div class="alert">
        <h2>${templateName}</h2>
        <p><strong>Current Quality:</strong> <span class="score">${currentQuality}%</span></p>
        <p><strong>SLA Threshold:</strong> ${threshold}%</p>
        <p><strong>Breach Amount:</strong> ${threshold - currentQuality}% below threshold</p>
      </div>

      <p><strong>Immediate Action Required:</strong></p>
      <ul>
        <li>Review recent documents generated from this template</li>
        <li>Investigate quality issues and common problems</li>
        <li>Consider applying AI-generated template improvements</li>
        <li>Update template content or system prompts as needed</li>
      </ul>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/quality-trends" class="button">
        View Quality Dashboard
      </a>

      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
        This is an automated alert from ADPA Quality Control System.
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Send email
   */
  private async sendEmail(options: { to: string; subject: string; html: string }) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized')
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'ADPA Quality Control <noreply@adpa.com>',
      ...options
    })
  }

  /**
   * Log notification in database for audit trail
   */
  private async logNotification(data: {
    type: string
    recipientEmails: string[]
    metadata: any
  }) {
    try {
      await pool.query(
        `INSERT INTO notification_logs (
          type,
          recipient_emails,
          metadata,
          sent_at
        ) VALUES ($1, $2, $3, NOW())`,
        [data.type, data.recipientEmails, JSON.stringify(data.metadata)]
      )
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to log notification', { error })
    }
  }
}

export const notificationService = new NotificationService()

