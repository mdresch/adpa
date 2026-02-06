/**
 * Teams Service
 * Handles outgoing notifications to Microsoft Teams via Incoming Webhooks
 * Uses Adaptive Cards for rich formatting
 */

import axios from 'axios'
import { logger } from '../utils/logger'

export interface TeamsMessageOptions {
    webhookUrl: string
    title: string
    text?: string
    summary: string
    sections?: any[]
    actions?: any[]
    severity?: 'normal' | 'warning' | 'critical' | 'emergency'
}

class TeamsService {
    /**
     * Send a notification to a Teams channel via Incoming Webhook
     */
    async sendNotification(options: TeamsMessageOptions): Promise<boolean> {
        try {
            if (!options.webhookUrl) {
                logger.error('[TEAMS] No webhook URL provided')
                return false
            }

            // Determine theme color based on severity
            let themeColor = '0078D7' // Default Teams Blue
            if (options.severity === 'warning') themeColor = 'F59E0B' // Amber
            if (options.severity === 'critical') themeColor = 'DC2626' // Red
            if (options.severity === 'emergency') themeColor = '991B1B' // Dark Red

            const payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": themeColor,
                "summary": options.summary,
                "sections": [
                    {
                        "activityTitle": options.title,
                        "activitySubtitle": options.text || options.summary,
                        "facts": options.sections || [],
                        "markdown": true
                    }
                ],
                "potentialAction": options.actions || []
            }

            const response = await axios.post(options.webhookUrl, payload)

            if (response.status === 200) {
                logger.info('[TEAMS] Notification sent successfully')
                return true
            } else {
                logger.error('[TEAMS] Failed to send notification', { status: response.status, data: response.data })
                return false
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('[TEAMS] Axios error sending notification', {
                    message: error.message,
                    response: error.response?.data
                })
            } else {
                logger.error('[TEAMS] Unknown error sending notification', { error })
            }
            return false
        }
    }

    /**
     * Test a Teams connection by sending a ping
     */
    async testConnection(webhookUrl: string): Promise<boolean> {
        return this.sendNotification({
            webhookUrl,
            title: '🔌 Teams Integration Test',
            summary: 'Testing connection from ADPA Framework',
            text: 'This is a test message to verify the webhook connection. If you see this, the integration is working correctly!',
            severity: 'normal'
        })
    }

    /**
     * Format a list of facts for a Teams card
     */
    formatFacts(data: Record<string, string | number | boolean>): Array<{ name: string; value: string }> {
        return Object.entries(data).map(([name, value]) => ({
            name: this.formatLabel(name),
            value: String(value)
        }))
    }

    private formatLabel(key: string): string {
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }
}

export const teamsService = new TeamsService()
