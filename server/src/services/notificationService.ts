/**
 * Multi-Channel Notification Service
 * TASK-741: Implements email, Slack, SMS, and Microsoft Teams notifications
 * 
 * Supports:
 * - Email via SMTP
 * - Slack via Webhook/Bot API
 * - SMS via Twilio
 * - Microsoft Teams via Webhook with Adaptive Cards
 */

import { Pool } from 'pg';
import axios from 'axios';
import nodemailer from 'nodemailer';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface NotificationChannel {
    id: string;
    name: 'email' | 'slack' | 'teams' | 'sms';
    display_name: string;
    is_enabled: boolean;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    notification_type: string;
    channel_id: string;
    subject_template?: string;
    body_template: string;
    adaptive_card_template?: any;
    slack_blocks_template?: any;
    variables?: Record<string, string>;
}

export interface NotificationRecipient {
    user_id?: string;
    destination: string; // email, phone, webhook URL
    channel: 'email' | 'slack' | 'teams' | 'sms';
}

export interface NotificationPayload {
    notification_type: string;
    reference_type: string;
    reference_id: string;
    project_id?: string;
    recipients: NotificationRecipient[];
    variables: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationResult {
    success: boolean;
    notification_log_id?: string;
    channel: string;
    destination: string;
    error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

interface NotificationConfig {
    email: {
        enabled: boolean;
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        smtp_pass: string;
        from: string;
    };
    slack: {
        enabled: boolean;
        bot_token?: string;
        webhook_url?: string;
    };
    teams: {
        enabled: boolean;
        webhook_url: string;
    };
    sms: {
        enabled: boolean;
        twilio_account_sid?: string;
        twilio_auth_token?: string;
        twilio_phone_number?: string;
    };
}

// ============================================================================
// Notification Service Class
// ============================================================================

export class NotificationService {
    private pool: Pool;
    private config: NotificationConfig;
    private emailTransporter?: nodemailer.Transporter;

    constructor(pool: Pool) {
        this.pool = pool;
        this.config = this.loadConfig();
        this.initializeEmailTransporter();
    }

    /**
     * Load notification configuration from environment variables
     */
    private loadConfig(): NotificationConfig {
        return {
            email: {
                enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
                smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
                smtp_port: parseInt(process.env.SMTP_PORT || '587'),
                smtp_user: process.env.SMTP_USER || '',
                smtp_pass: process.env.SMTP_PASS || '',
                from: process.env.SMTP_FROM || 'ADPA Framework <noreply@adpa.com>',
            },
            slack: {
                enabled: !!(process.env.SLACK_BOT_TOKEN || process.env.SLACK_WEBHOOK_URL),
                bot_token: process.env.SLACK_BOT_TOKEN,
                webhook_url: process.env.SLACK_WEBHOOK_URL,
            },
            teams: {
                enabled: !!process.env.TEAMS_WEBHOOK_URL,
                webhook_url: process.env.TEAMS_WEBHOOK_URL || '',
            },
            sms: {
                enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
                twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
                twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
                twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
            },
        };
    }

    /**
     * Initialize email transporter
     */
    private initializeEmailTransporter(): void {
        if (this.config.email.enabled) {
            this.emailTransporter = nodemailer.createTransport({
                host: this.config.email.smtp_host,
                port: this.config.email.smtp_port,
                secure: this.config.email.smtp_port === 465,
                auth: {
                    user: this.config.email.smtp_user,
                    pass: this.config.email.smtp_pass,
                },
            });
        }
    }

    /**
     * Send notification through specified channel
     */
    async sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
        const results: NotificationResult[] = [];

        for (const recipient of payload.recipients) {
            try {
                // Get template for this channel and notification type
                const template = await this.getTemplate(
                    payload.notification_type,
                    recipient.channel
                );

                if (!template) {
                    results.push({
                        success: false,
                        channel: recipient.channel,
                        destination: recipient.destination,
                        error: 'Template not found',
                    });
                    continue;
                }

                // Render template with variables
                const renderedContent = this.renderTemplate(template, payload.variables);

                // Create notification log entry
                const logId = await this.createNotificationLog({
                    reference_type: payload.reference_type,
                    reference_id: payload.reference_id,
                    project_id: payload.project_id,
                    notification_type: payload.notification_type,
                    channel: recipient.channel,
                    recipient_user_id: recipient.user_id,
                    destination: recipient.destination,
                    subject: renderedContent.subject,
                    body: renderedContent.body,
                });

                // Send via appropriate channel
                let result: NotificationResult;
                switch (recipient.channel) {
                    case 'email':
                        result = await this.sendEmail(
                            recipient.destination,
                            renderedContent.subject || '',
                            renderedContent.body
                        );
                        break;
                    case 'slack':
                        result = await this.sendSlack(
                            recipient.destination,
                            renderedContent.body,
                            template.slack_blocks_template,
                            payload.variables
                        );
                        break;
                    case 'teams':
                        result = await this.sendTeams(
                            recipient.destination,
                            template.adaptive_card_template,
                            payload.variables
                        );
                        break;
                    case 'sms':
                        result = await this.sendSMS(
                            recipient.destination,
                            renderedContent.body
                        );
                        break;
                    default:
                        result = {
                            success: false,
                            channel: recipient.channel,
                            destination: recipient.destination,
                            error: 'Unsupported channel',
                        };
                }

                result.notification_log_id = logId;

                // Update log with result
                await this.updateNotificationLog(logId, result);

                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    channel: recipient.channel,
                    destination: recipient.destination,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return results;
    }

    /**
     * Get notification template from database
     */
    private async getTemplate(
        notificationType: string,
        channel: string
    ): Promise<NotificationTemplate | null> {
        const query = `
            SELECT nt.*
            FROM notification_templates nt
            JOIN notification_channels nc ON nt.channel_id = nc.id
            WHERE nt.notification_type = $1
              AND nc.name = $2
              AND nt.is_active = true
            ORDER BY nt.created_at DESC
            LIMIT 1
        `;
        const result = await this.pool.query(query, [notificationType, channel]);
        return result.rows[0] || null;
    }

    /**
     * Render template with variables
     */
    private renderTemplate(
        template: NotificationTemplate,
        variables: Record<string, any>
    ): { subject?: string; body: string } {
        const renderString = (str: string): string => {
            return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                const value = variables[key];
                if (value === undefined || value === null) {
                    return match; // Keep placeholder if variable not found
                }
                return String(value);
            });
        };

        return {
            subject: template.subject_template
                ? renderString(template.subject_template)
                : undefined,
            body: renderString(template.body_template),
        };
    }

    /**
     * Send email notification
     */
    private async sendEmail(
        to: string,
        subject: string,
        body: string
    ): Promise<NotificationResult> {
        if (!this.config.email.enabled || !this.emailTransporter) {
            return {
                success: false,
                channel: 'email',
                destination: to,
                error: 'Email service not configured',
            };
        }

        try {
            await this.emailTransporter.sendMail({
                from: this.config.email.from,
                to,
                subject,
                text: body,
                html: this.markdownToHtml(body),
            });

            return {
                success: true,
                channel: 'email',
                destination: to,
            };
        } catch (error) {
            return {
                success: false,
                channel: 'email',
                destination: to,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send Slack notification
     */
    private async sendSlack(
        destination: string,
        body: string,
        blocksTemplate?: any,
        variables?: Record<string, any>
    ): Promise<NotificationResult> {
        if (!this.config.slack.enabled) {
            return {
                success: false,
                channel: 'slack',
                destination,
                error: 'Slack service not configured',
            };
        }

        try {
            // Use webhook URL from destination or config
            const webhookUrl = destination.startsWith('http') 
                ? destination 
                : this.config.slack.webhook_url;

            if (!webhookUrl) {
                throw new Error('Slack webhook URL not configured');
            }

            // Prepare payload
            let payload: any = {};
            
            if (blocksTemplate && variables) {
                // Render blocks with variables
                const renderedBlocks = JSON.parse(
                    JSON.stringify(blocksTemplate).replace(
                        /\{\{(\w+)\}\}/g,
                        (match, key) => variables[key] !== undefined ? String(variables[key]) : match
                    )
                );
                payload = { blocks: renderedBlocks };
            } else {
                payload = { text: body };
            }

            await axios.post(webhookUrl, payload);

            return {
                success: true,
                channel: 'slack',
                destination,
            };
        } catch (error) {
            return {
                success: false,
                channel: 'slack',
                destination,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send Microsoft Teams notification with Adaptive Card
     */
    private async sendTeams(
        destination: string,
        adaptiveCardTemplate?: any,
        variables?: Record<string, any>
    ): Promise<NotificationResult> {
        if (!this.config.teams.enabled) {
            return {
                success: false,
                channel: 'teams',
                destination,
                error: 'Teams service not configured',
            };
        }

        try {
            // Use webhook URL from destination or config
            const webhookUrl = destination.startsWith('http') 
                ? destination 
                : this.config.teams.webhook_url;

            if (!webhookUrl) {
                throw new Error('Teams webhook URL not configured');
            }

            // Prepare adaptive card
            let payload: any = {};

            if (adaptiveCardTemplate && variables) {
                // Render adaptive card with variables
                const renderedCard = JSON.parse(
                    JSON.stringify(adaptiveCardTemplate).replace(
                        /\{\{(\w+)\}\}/g,
                        (match, key) => variables[key] !== undefined ? String(variables[key]) : match
                    )
                );

                payload = {
                    type: 'message',
                    attachments: [
                        {
                            contentType: 'application/vnd.microsoft.card.adaptive',
                            content: renderedCard,
                        },
                    ],
                };
            } else {
                // Fallback to simple text message
                payload = {
                    text: variables?.body || 'Notification from ADPA',
                };
            }

            await axios.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return {
                success: true,
                channel: 'teams',
                destination,
            };
        } catch (error) {
            return {
                success: false,
                channel: 'teams',
                destination,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send SMS notification via Twilio
     */
    private async sendSMS(
        to: string,
        body: string
    ): Promise<NotificationResult> {
        if (!this.config.sms.enabled) {
            return {
                success: false,
                channel: 'sms',
                destination: to,
                error: 'SMS service not configured',
            };
        }

        try {
            // Create Twilio client
            const accountSid = this.config.sms.twilio_account_sid;
            const authToken = this.config.sms.twilio_auth_token;
            const fromNumber = this.config.sms.twilio_phone_number;

            if (!accountSid || !authToken || !fromNumber) {
                throw new Error('Twilio credentials not configured');
            }

            // Send SMS via Twilio API
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                new URLSearchParams({
                    To: to,
                    From: fromNumber,
                    Body: body.substring(0, 1600), // SMS limit
                }),
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return {
                success: true,
                channel: 'sms',
                destination: to,
            };
        } catch (error) {
            return {
                success: false,
                channel: 'sms',
                destination: to,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Create notification log entry
     */
    private async createNotificationLog(data: {
        reference_type: string;
        reference_id: string;
        project_id?: string;
        notification_type: string;
        channel: string;
        recipient_user_id?: string;
        destination: string;
        subject?: string;
        body: string;
    }): Promise<string> {
        const query = `
            INSERT INTO notification_log (
                reference_type, reference_id, project_id,
                notification_type, channel_id, recipient_user_id,
                destination, subject, body, status
            )
            VALUES (
                $1, $2, $3, $4,
                (SELECT id FROM notification_channels WHERE name = $5),
                $6, $7, $8, $9, 'pending'
            )
            RETURNING id
        `;
        const result = await this.pool.query(query, [
            data.reference_type,
            data.reference_id,
            data.project_id,
            data.notification_type,
            data.channel,
            data.recipient_user_id,
            data.destination,
            data.subject,
            data.body,
        ]);
        return result.rows[0].id;
    }

    /**
     * Update notification log with result
     */
    private async updateNotificationLog(
        logId: string,
        result: NotificationResult
    ): Promise<void> {
        const status = result.success ? 'sent' : 'failed';
        const query = `
            UPDATE notification_log
            SET status = $1,
                sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE NULL END,
                failed_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE NULL END,
                error_message = $2,
                updated_at = NOW()
            WHERE id = $3
        `;
        await this.pool.query(query, [status, result.error, logId]);
    }

    /**
     * Convert Markdown to HTML (simple conversion)
     */
    private markdownToHtml(markdown: string): string {
        return markdown
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^\- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            .replace(/<\/p><p><h/g, '</p><h')
            .replace(/<\/h[1-6]><\/p>/g, '</h1>');
    }

    /**
     * Get notification preferences for a user
     */
    async getUserNotificationPreferences(
        userId: string,
        notificationType: string,
        projectId?: string
    ): Promise<NotificationRecipient[]> {
        const query = `
            SELECT 
                np.user_id,
                np.destination,
                nc.name as channel,
                np.is_enabled,
                np.severity_filter
            FROM notification_preferences np
            JOIN notification_channels nc ON np.channel_id = nc.id
            WHERE np.user_id = $1
              AND np.notification_type = $2
              AND (np.project_id IS NULL OR np.project_id = $3)
              AND np.is_enabled = true
              AND nc.is_enabled = true
        `;
        const result = await this.pool.query(query, [userId, notificationType, projectId]);
        
        return result.rows.map(row => ({
            user_id: row.user_id,
            destination: row.destination,
            channel: row.channel as 'email' | 'slack' | 'teams' | 'sms',
        }));
    }

    /**
     * Check if channel is configured and enabled
     */
    isChannelEnabled(channel: 'email' | 'slack' | 'teams' | 'sms'): boolean {
        return this.config[channel]?.enabled || false;
    }

    /**
     * Get channel status
     */
    getChannelStatus(): Record<string, boolean> {
        return {
            email: this.config.email.enabled,
            slack: this.config.slack.enabled,
            teams: this.config.teams.enabled,
            sms: this.config.sms.enabled,
        };
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

let notificationServiceInstance: NotificationService | null = null;

export function initializeNotificationService(pool: Pool): NotificationService {
    notificationServiceInstance = new NotificationService(pool);
    return notificationServiceInstance;
}

export function getNotificationService(): NotificationService {
    if (!notificationServiceInstance) {
        throw new Error('NotificationService not initialized. Call initializeNotificationService first.');
    }
    return notificationServiceInstance;
}
