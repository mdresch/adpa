;(async function(){ try{ await (require('../lib/db')).initDb() } catch(e){} })();
/**
 * Drift Detection Notification Integration
 * TASK-741: Integrates notification service with drift detection
 * 
 * Automatically sends notifications when drift is detected
 */

import { Pool } from 'pg'
import { pool as defaultPool } from '../database/connection'
import { logger } from '../utils/logger'
import { notificationService, NotificationPayload } from '../services/notificationService'

// ============================================================================
// Types
// ============================================================================

interface DriftDetectionData {
    id: string;
    project_id: string;
    baseline_id: string;
    detection_type: string;
    drift_severity: 'low' | 'medium' | 'high' | 'critical';
    drift_description: string;
    drift_impact?: string;
    ai_confidence: number;
}

interface BudgetOverrunData extends DriftDetectionData {
    approved_budget: number;
    projected_cost: number;
    overrun_amount: number;
    overrun_percentage: number;
    root_cause: string;
    change_request_id?: string;
}

interface PositiveDriftData extends DriftDetectionData {
    cost_savings?: number;
    time_acceleration?: number;
    quality_improvement?: number;
    innovation_value?: number;
    replicable_project_count?: number;
    change_request_id?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get notification recipients for a project
 */
async function getProjectNotificationRecipients(
    pool: Pool,
    projectId: string,
    notificationType: string,
    severity: string
): Promise<Array<{ user_id: string; destination: string; channel: string }>> {
    const query = `
        SELECT DISTINCT
            np.user_id,
            np.destination,
            nc.name as channel
        FROM notification_preferences np
        JOIN notification_channels nc ON np.channel_id = nc.id
        JOIN project_members pm ON pm.user_id = np.user_id
        WHERE pm.project_id = $1
          AND np.notification_type = $2
          AND np.is_enabled = true
          AND nc.is_enabled = true
          AND (
            np.severity_filter IS NULL 
            OR $3 = ANY(np.severity_filter)
          )
    `;

    const result = await (pool || defaultPool).query(query, [projectId, notificationType, severity]);
    return result.rows;
}

/**
 * Get project stakeholders (fallback if no preferences set)
 */
async function getProjectStakeholders(
    pool: Pool,
    projectId: string
): Promise<Array<{ user_id: string; email: string; role: string }>> {
    const query = `
        SELECT 
            u.id as user_id,
            u.email,
            pm.role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
          AND pm.role IN ('sponsor', 'manager', 'admin')
        ORDER BY 
            CASE pm.role
                WHEN 'sponsor' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'manager' THEN 3
                ELSE 4
            END
    `;

    const result = await (pool || defaultPool).query(query, [projectId]);
    return result.rows;
}

/**
 * Get project name
 */
async function getProjectName(pool: Pool, projectId: string): Promise<string> {
    const result = await (pool || defaultPool).query(
        'SELECT name FROM projects WHERE id = $1',
        [projectId]
    );
    return result.rows[0]?.name || 'Unknown Project';
}

// ============================================================================
// Notification Triggers
// ============================================================================

/**
 * Send budget overrun alert
 */
export async function sendBudgetOverrunAlert(
    pool: Pool,
    driftData: BudgetOverrunData
): Promise<void> {
    try {
        // Use the imported notificationService
        
        // Get recipients
        let recipients = await getProjectNotificationRecipients(
            pool,
            driftData.project_id,
            'budget_overrun',
            driftData.drift_severity
        );

        // Fallback to stakeholders if no preferences
        if (recipients.length === 0) {
            const stakeholders = await getProjectStakeholders(pool, driftData.project_id);
            recipients = stakeholders.map(s => ({
                user_id: s.user_id,
                destination: s.email,
                channel: 'email',
            }));
        }

        if (recipients.length === 0) {
            console.warn(`No recipients found for budget overrun alert: ${driftData.id}`);
            return;
        }

        const projectName = await getProjectName(pool, driftData.project_id);

        // Prepare notification variables
        const variables = {
            projectName,
            severity: driftData.drift_severity.toUpperCase(),
            detectionDate: new Date().toLocaleDateString(),
            approvedBudget: driftData.approved_budget.toLocaleString(),
            projectedCost: driftData.projected_cost.toLocaleString(),
            overrunAmount: driftData.overrun_amount.toLocaleString(),
            overrunPercentage: driftData.overrun_percentage.toFixed(1),
            impactDescription: driftData.drift_impact || 'Project exceeding approved budget',
            rootCause: driftData.root_cause,
            recommendations: 'Review corrective options and approve change request',
            changeRequestId: driftData.change_request_id || 'Pending',
            deadline: getDeadlineBySevernty(driftData.drift_severity),
            reviewUrl: `${process.env.FRONTEND_URL}/projects/${driftData.project_id}/drift/${driftData.id}`,
        };

        const payload: NotificationPayload = {
            notification_type: 'budget_overrun',
            reference_type: 'drift_detection',
            reference_id: driftData.id,
            project_id: driftData.project_id,
            recipients,
            variables,
            severity: driftData.drift_severity,
        };

        const results = await notificationService.sendNotification(payload);
        
        console.log(`Budget overrun alert sent for drift ${driftData.id}:`, results);

        // Update drift detection record
        await (pool || defaultPool).query(
            `UPDATE baseline_drift_detection 
             SET alert_sent = true, alert_sent_at = NOW() 
             WHERE id = $1`,
            [driftData.id]
        );
    } catch (error) {
        logger.error('Error sending budget overrun alert:', error);
        throw error;
    }
}

/**
 * Send positive drift notification
 */
export async function sendPositiveDriftNotification(
    pool: Pool,
    driftData: PositiveDriftData
): Promise<void> {
    try {
        // Use the imported notificationService
        
        // Get recipients
        let recipients = await getProjectNotificationRecipients(
            pool,
            driftData.project_id,
            'positive_drift',
            'medium' // Positive drift is typically medium priority
        );

        // Fallback to stakeholders if no preferences
        if (recipients.length === 0) {
            const stakeholders = await getProjectStakeholders(pool, driftData.project_id);
            recipients = stakeholders
                .filter(s => s.role === 'sponsor' || s.role === 'manager')
                .map(s => ({
                    user_id: s.user_id,
                    destination: s.email,
                    channel: 'email',
                }));
        }

        if (recipients.length === 0) {
            console.warn(`No recipients found for positive drift alert: ${driftData.id}`);
            return;
        }

        const projectName = await getProjectName(pool, driftData.project_id);

        // Prepare notification variables
        const variables = {
            projectName,
            driftType: formatDriftType(driftData.detection_type),
            detectionDate: new Date().toLocaleDateString(),
            description: driftData.drift_description,
            costImpact: driftData.cost_savings 
                ? `$${driftData.cost_savings.toLocaleString()} saved`
                : 'N/A',
            qualityImpact: driftData.quality_improvement
                ? `${driftData.quality_improvement}% improvement`
                : 'Maintained or improved',
            timelineImpact: driftData.time_acceleration
                ? `${driftData.time_acceleration} days faster`
                : 'On schedule',
            currentValue: driftData.cost_savings
                ? `$${driftData.cost_savings.toLocaleString()}`
                : 'TBD',
            replicationValue: driftData.cost_savings && driftData.replicable_project_count
                ? `$${(driftData.cost_savings * driftData.replicable_project_count).toLocaleString()}`
                : 'TBD',
            replicableProjectCount: driftData.replicable_project_count || 0,
            recommendations: 'Review opportunity and consider formalizing for replication',
            changeRequestId: driftData.change_request_id || 'Pending',
            deadline: '72 hours',
            reviewUrl: `${process.env.FRONTEND_URL}/projects/${driftData.project_id}/drift/${driftData.id}`,
        };

        const payload: NotificationPayload = {
            notification_type: 'positive_drift',
            reference_type: 'drift_detection',
            reference_id: driftData.id,
            project_id: driftData.project_id,
            recipients,
            variables,
        };

        const results = await notificationService.sendNotification(payload);
        
        console.log(`Positive drift notification sent for drift ${driftData.id}:`, results);

        // Update drift detection record
        await (pool || defaultPool).query(
            `UPDATE baseline_drift_detection 
             SET alert_sent = true, alert_sent_at = NOW() 
             WHERE id = $1`,
            [driftData.id]
        );
    } catch (error) {
        logger.error('Error sending positive drift notification:', error);
        throw error;
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get deadline based on severity
 */
function getDeadlineBySevernty(severity: string): string {
    switch (severity) {
        case 'critical':
            return '24 hours';
        case 'high':
            return '48 hours';
        case 'medium':
            return '72 hours';
        default:
            return '1 week';
    }
}

/**
 * Format drift type for display
 */
function formatDriftType(driftType: string): string {
    return driftType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Send general drift alert
 */
export async function sendDriftAlert(
    pool: Pool,
    driftData: DriftDetectionData
): Promise<void> {
    // Route to appropriate notification based on drift type
    if (driftData.detection_type === 'cost_drift' && 'approved_budget' in driftData) {
        await sendBudgetOverrunAlert(pool, driftData as BudgetOverrunData);
    } else if (
        driftData.drift_severity === 'low' &&
        ('cost_savings' in driftData || 'innovation_value' in driftData)
    ) {
        await sendPositiveDriftNotification(pool, driftData as PositiveDriftData);
    } else {
        // Generic drift notification
        console.log(`Generic drift alert for ${driftData.detection_type}: ${driftData.id}`);
        // TODO: Implement generic drift notification if needed
    }
}
