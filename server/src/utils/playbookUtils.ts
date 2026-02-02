/**
 * Playbook Utilities
 * Shared utility functions for playbook operations
 */

import { pool } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

export interface PlaybookStep {
    title: string
    type: 'action' | 'approval' | 'notification' | 'escalation' | 'documentation' | 'wait'
    description: string
}

export interface CreatePlaybookData {
    title: string
    description: string
    category: 'risk' | 'incident' | 'escalation' | 'resolution'
    trigger_type: 'auto' | 'manual' | 'threshold'
    applicable_risk_categories?: string[]
    applicable_severity_levels?: string[]
    applicable_priority_levels?: string[]
    steps: PlaybookStep[]
}

/**
 * Create a playbook with steps in a single transaction
 */
export async function createPlaybookWithSteps(
    client: any,
    projectId: string,
    userId: string,
    data: CreatePlaybookData
): Promise<string> {
    const playbookId = uuidv4()

    try {
        // Create Playbook
        await client.query(`
            INSERT INTO operational_playbooks (
                id, project_id, title, description, category, trigger_type, 
                applicable_risk_categories, applicable_severity_levels, applicable_priority_levels,
                is_active, created_by, created_at, updated_at, version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW(), 1)
        `, [
            playbookId,
            projectId,
            data.title,
            data.description,
            data.category,
            data.trigger_type,
            data.applicable_risk_categories || null,
            data.applicable_severity_levels || null,
            data.applicable_priority_levels || null,
            userId
        ])

        // Create Steps
        for (let i = 0; i < data.steps.length; i++) {
            const step = data.steps[i]
            await client.query(`
                INSERT INTO playbook_response_steps (
                    id, playbook_id, step_order, step_title, step_description, 
                    step_type, step_config, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `, [
                uuidv4(),
                playbookId,
                i + 1,
                step.title,
                step.description,
                step.type,
                '{}'
            ])
        }

        return playbookId
    } catch (error) {
        logger.error('[PLAYBOOK_UTILS] Failed to create playbook with steps:', error)
        throw error
    }
}

/**
 * NATO IT Security Compliance playbook definition
 */
export const NATO_COMPLIANCE_PLAYBOOK: CreatePlaybookData = {
    title: 'NATO IT Security Compliance Protocol',
    description: 'Comprehensive workflow for addressing NATO IT security standard compliance issues and implementing required remediation.',
    category: 'risk',
    trigger_type: 'manual',
    applicable_risk_categories: ['technical', 'security', 'compliance'],
    applicable_severity_levels: ['high', 'critical'],
    applicable_priority_levels: ['high', 'critical'],
    steps: [
        { title: 'Security Assessment', type: 'action', description: 'Conduct comprehensive security assessment to identify compliance gaps.' },
        { title: 'NATO IT Department Notification', type: 'notification', description: 'Notify NATO IT Department of compliance issues and request guidance.' },
        { title: 'Compliance Gap Analysis', type: 'documentation', description: 'Document specific NATO IT security standard violations and required changes.' },
        { title: 'Remediation Planning', type: 'action', description: 'Develop detailed remediation plan with timelines and resource requirements.' },
        { title: 'Implementation', type: 'action', description: 'Execute security fixes and compliance improvements according to NATO standards.' },
        { title: 'Security Review', type: 'approval', description: 'Obtain approval from NATO IT Department for implemented changes.' },
        { title: 'Documentation Update', type: 'documentation', description: 'Update all technical documentation and security policies.' },
        { title: 'Compliance Verification', type: 'approval', description: 'Final verification that all NATO IT security standards are met.' }
    ]
}
