/**
 * Playbook Service
 * RISK_MANAGEMENT_ENHANCEMENT_DESIGN.md - Phase 1 Implementation
 * 
 * Provides CRUD operations and execution tracking for operational playbooks
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Playbook {
    id: string
    project_id: string
    title: string
    description?: string
    category: 'risk' | 'incident' | 'escalation' | 'resolution'
    trigger_type: 'auto' | 'manual' | 'threshold'
    applicable_risk_categories?: string[]
    applicable_severity_levels?: string[]
    applicable_priority_levels?: string[]
    is_active: boolean
    created_by?: string
    created_at: string
    updated_at: string
    version: number
    previous_version_id?: string
    // Joined data
    scenarios?: PlaybookScenario[]
    steps?: PlaybookResponseStep[]
}

/**
 * Update completion notes/evidence for an existing step execution
 */
export async function updateStepNotes(
    executionId: string,
    stepId: string,
    userId: string,
    notes?: string,
    evidence?: Record<string, any>
): Promise<PlaybookStepExecution> {
    const log = logger.child({ service: 'playbookService', method: 'updateStepNotes' })

    try {
        const result = await pool.query(`
      UPDATE playbook_step_executions
      SET
        completion_notes = $3,
        completion_evidence = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = $1 AND step_id = $2 AND status = 'completed'
      RETURNING *
    `, [
            executionId,
            stepId,
            notes || null,
            JSON.stringify(evidence || {})
        ])

        if (result.rows.length === 0) {
            throw new Error('Completed step execution not found')
        }

        log.info('[PLAYBOOKS] Updated step notes', { executionId, stepId, userId })
        return result.rows[0]
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to update step notes:', error)
        throw error
    }
}

export interface PlaybookScenario {
    id: string
    playbook_id: string
    scenario_condition: Record<string, any>
    trigger_type: 'auto' | 'manual'
    priority: number
    description?: string
    created_at: string
    updated_at: string
}

export interface PlaybookResponseStep {
    id: string
    playbook_id: string
    step_order: number
    step_title: string
    step_description?: string
    step_type: 'action' | 'approval' | 'notification' | 'escalation' | 'documentation' | 'wait'
    assigned_role?: string
    sla_hours?: number
    step_config: Record<string, any>
    step_condition?: Record<string, any>
    created_at: string
    updated_at: string
}

export interface PlaybookExecution {
    id: string
    playbook_id: string
    triggered_by_type: 'risk' | 'issue' | 'escalation' | 'manual'
    triggered_by_id: string
    trigger_type: 'auto' | 'manual'
    triggered_by_user_id?: string
    trigger_reason?: string
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed'
    current_step_id?: string
    current_step_order?: number
    completed_steps: number
    total_steps: number
    started_at?: string
    completed_at?: string
    cancelled_at?: string
    cancelled_by?: string
    cancellation_reason?: string
    execution_context: Record<string, any>
    created_at: string
    updated_at: string
    // Joined data
    playbook?: Playbook
    step_executions?: PlaybookStepExecution[]
}

export interface PlaybookStepExecution {
    id: string
    execution_id: string
    step_id: string
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
    assigned_to?: string
    completed_by?: string
    started_at?: string
    completed_at?: string
    sla_deadline?: string
    sla_breached: boolean
    completion_notes?: string
    completion_evidence: Record<string, any>
    created_at: string
    updated_at: string
    // Joined data
    step?: PlaybookResponseStep
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreatePlaybookInput {
    project_id: string
    title: string
    description?: string
    category: Playbook['category']
    trigger_type: Playbook['trigger_type']
    applicable_risk_categories?: string[]
    applicable_severity_levels?: string[]
    applicable_priority_levels?: string[]
    is_active?: boolean
}

export interface UpdatePlaybookInput {
    title?: string
    description?: string
    category?: Playbook['category']
    trigger_type?: Playbook['trigger_type']
    applicable_risk_categories?: string[]
    applicable_severity_levels?: string[]
    applicable_priority_levels?: string[]
    is_active?: boolean
}

export interface CreateScenarioInput {
    playbook_id: string
    scenario_condition: Record<string, any>
    trigger_type: PlaybookScenario['trigger_type']
    priority?: number
    description?: string
}

export interface CreateStepInput {
    playbook_id: string
    step_order: number
    step_title: string
    step_description?: string
    step_type: PlaybookResponseStep['step_type']
    assigned_role?: string
    sla_hours?: number
    step_config?: Record<string, any>
    step_condition?: Record<string, any>
}

export interface PlaybookFilters {
    project_id?: string
    category?: string[]
    trigger_type?: string[]
    is_active?: boolean
    search?: string
}

export interface ExecutePlaybookInput {
    playbook_id: string
    triggered_by_type: PlaybookExecution['triggered_by_type']
    triggered_by_id: string
    trigger_type: 'auto' | 'manual'
    trigger_reason?: string
}

export interface PlaybookMatchCriteria {
    project_id: string
    risk_category?: string
    severity_level?: string
    priority_level?: string
    impact?: string
    probability?: string
}

// ============================================================================
// PLAYBOOK CRUD OPERATIONS
// ============================================================================

/**
 * Get all playbooks with optional filters
 */
export async function getPlaybooks(
    filters: PlaybookFilters = {},
    userId?: string
): Promise<Playbook[]> {
    const log = logger.child({ service: 'playbookService', method: 'getPlaybooks' })

    try {
        let query = `
      SELECT 
        p.*,
        u.name as created_by_name
      FROM operational_playbooks p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `
        const params: any[] = []
        let paramIndex = 1

        if (filters.project_id) {
            query += ` AND p.project_id = $${paramIndex++}`
            params.push(filters.project_id)
        }

        if (filters.category && filters.category.length > 0) {
            query += ` AND p.category = ANY($${paramIndex++})`
            params.push(filters.category)
        }

        if (filters.trigger_type && filters.trigger_type.length > 0) {
            query += ` AND p.trigger_type = ANY($${paramIndex++})`
            params.push(filters.trigger_type)
        }

        if (filters.is_active !== undefined) {
            query += ` AND p.is_active = $${paramIndex++}`
            params.push(filters.is_active)
        }

        if (filters.search) {
            query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
            params.push(`%${filters.search}%`)
            paramIndex++
        }

        query += ` ORDER BY p.created_at DESC`

        const result = await pool.query(query, params)

        log.info('[PLAYBOOKS] Retrieved playbooks', { count: result.rows.length, filters })
        return result.rows
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to get playbooks:', error)
        throw error
    }
}

/**
 * Get a single playbook by ID with scenarios and steps
 */
export async function getPlaybookById(id: string): Promise<Playbook | null> {
    const log = logger.child({ service: 'playbookService', method: 'getPlaybookById' })

    try {
        // Get playbook
        const playbookResult = await pool.query(`
      SELECT 
        p.*,
        u.name as created_by_name
      FROM operational_playbooks p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [id])

        if (playbookResult.rows.length === 0) {
            return null
        }

        const playbook = playbookResult.rows[0]

        // Get scenarios
        const scenariosResult = await pool.query(`
      SELECT * FROM playbook_scenarios 
      WHERE playbook_id = $1 
      ORDER BY priority DESC, created_at ASC
    `, [id])
        playbook.scenarios = scenariosResult.rows

        // Get steps
        const stepsResult = await pool.query(`
      SELECT * FROM playbook_response_steps 
      WHERE playbook_id = $1 
      ORDER BY step_order ASC
    `, [id])
        playbook.steps = stepsResult.rows

        log.info('[PLAYBOOKS] Retrieved playbook', { id, scenarioCount: playbook.scenarios.length, stepCount: playbook.steps.length })
        return playbook
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to get playbook by ID:', error)
        throw error
    }
}

/**
 * Create a new playbook
 */
export async function createPlaybook(
    input: CreatePlaybookInput,
    userId: string
): Promise<Playbook> {
    const log = logger.child({ service: 'playbookService', method: 'createPlaybook' })

    try {
        const result = await pool.query(`
      INSERT INTO operational_playbooks (
        project_id,
        title,
        description,
        category,
        trigger_type,
        applicable_risk_categories,
        applicable_severity_levels,
        applicable_priority_levels,
        is_active,
        created_by,
        version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING *
    `, [
            input.project_id,
            input.title,
            input.description || null,
            input.category,
            input.trigger_type,
            input.applicable_risk_categories || null,
            input.applicable_severity_levels || null,
            input.applicable_priority_levels || null,
            input.is_active !== false,
            userId
        ])

        const playbook = result.rows[0]
        log.info('[PLAYBOOKS] Created playbook', { id: playbook.id, title: playbook.title })
        return playbook
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to create playbook:', error)
        throw error
    }
}

/**
 * Update an existing playbook
 */
export async function updatePlaybook(
    id: string,
    input: UpdatePlaybookInput,
    userId: string
): Promise<Playbook> {
    const log = logger.child({ service: 'playbookService', method: 'updatePlaybook' })

    try {
        const updates: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (input.title !== undefined) {
            updates.push(`title = $${paramIndex++}`)
            params.push(input.title)
        }
        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`)
            params.push(input.description)
        }
        if (input.category !== undefined) {
            updates.push(`category = $${paramIndex++}`)
            params.push(input.category)
        }
        if (input.trigger_type !== undefined) {
            updates.push(`trigger_type = $${paramIndex++}`)
            params.push(input.trigger_type)
        }
        if (input.applicable_risk_categories !== undefined) {
            updates.push(`applicable_risk_categories = $${paramIndex++}`)
            params.push(input.applicable_risk_categories)
        }
        if (input.applicable_severity_levels !== undefined) {
            updates.push(`applicable_severity_levels = $${paramIndex++}`)
            params.push(input.applicable_severity_levels)
        }
        if (input.applicable_priority_levels !== undefined) {
            updates.push(`applicable_priority_levels = $${paramIndex++}`)
            params.push(input.applicable_priority_levels)
        }
        if (input.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`)
            params.push(input.is_active)
        }

        if (updates.length === 0) {
            // No updates, return current playbook
            const current = await getPlaybookById(id)
            if (!current) throw new Error('Playbook not found')
            return current
        }

        params.push(id)
        const query = `
      UPDATE operational_playbooks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

        const result = await pool.query(query, params)

        if (result.rows.length === 0) {
            throw new Error('Playbook not found')
        }

        const playbook = result.rows[0]
        log.info('[PLAYBOOKS] Updated playbook', { id, updates: Object.keys(input) })
        return playbook
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to update playbook:', error)
        throw error
    }
}

/**
 * Delete a playbook
 */
export async function deletePlaybook(id: string): Promise<boolean> {
    const log = logger.child({ service: 'playbookService', method: 'deletePlaybook' })

    try {
        const result = await pool.query(
            'DELETE FROM operational_playbooks WHERE id = $1 RETURNING id',
            [id]
        )

        const deleted = result.rows.length > 0
        log.info('[PLAYBOOKS] Deleted playbook', { id, deleted })
        return deleted
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to delete playbook:', error)
        throw error
    }
}

// ============================================================================
// SCENARIO OPERATIONS
// ============================================================================

/**
 * Add a scenario to a playbook
 */
export async function addScenario(
    input: CreateScenarioInput,
    userId: string
): Promise<PlaybookScenario> {
    const log = logger.child({ service: 'playbookService', method: 'addScenario' })

    try {
        const result = await pool.query(`
      INSERT INTO playbook_scenarios (
        playbook_id,
        scenario_condition,
        trigger_type,
        priority,
        description
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
            input.playbook_id,
            JSON.stringify(input.scenario_condition),
            input.trigger_type,
            input.priority || 0,
            input.description || null
        ])

        const scenario = result.rows[0]
        log.info('[PLAYBOOKS] Added scenario', { id: scenario.id, playbook_id: input.playbook_id })
        return scenario
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to add scenario:', error)
        throw error
    }
}

/**
 * Delete a scenario
 */
export async function deleteScenario(scenarioId: string): Promise<boolean> {
    const log = logger.child({ service: 'playbookService', method: 'deleteScenario' })

    try {
        const result = await pool.query(
            'DELETE FROM playbook_scenarios WHERE id = $1 RETURNING id',
            [scenarioId]
        )
        const deleted = result.rows.length > 0
        log.info('[PLAYBOOKS] Deleted scenario', { scenarioId, deleted })
        return deleted
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to delete scenario:', error)
        throw error
    }
}

// ============================================================================
// STEP OPERATIONS
// ============================================================================

/**
 * Add a step to a playbook
 */
export async function addStep(
    input: CreateStepInput,
    userId: string
): Promise<PlaybookResponseStep> {
    const log = logger.child({ service: 'playbookService', method: 'addStep' })

    try {
        const result = await pool.query(`
      INSERT INTO playbook_response_steps (
        playbook_id,
        step_order,
        step_title,
        step_description,
        step_type,
        assigned_role,
        sla_hours,
        step_config,
        step_condition
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
            input.playbook_id,
            input.step_order,
            input.step_title,
            input.step_description || null,
            input.step_type,
            input.assigned_role || null,
            input.sla_hours || null,
            JSON.stringify(input.step_config || {}),
            input.step_condition ? JSON.stringify(input.step_condition) : null
        ])

        const step = result.rows[0]
        log.info('[PLAYBOOKS] Added step', { id: step.id, playbook_id: input.playbook_id, order: input.step_order })
        return step
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to add step:', error)
        throw error
    }
}

/**
 * Update a step
 */
export async function updateStep(
    stepId: string,
    input: Partial<CreateStepInput>,
    userId: string
): Promise<PlaybookResponseStep> {
    const log = logger.child({ service: 'playbookService', method: 'updateStep' })

    try {
        const updates: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (input.step_order !== undefined) {
            updates.push(`step_order = $${paramIndex++}`)
            params.push(input.step_order)
        }
        if (input.step_title !== undefined) {
            updates.push(`step_title = $${paramIndex++}`)
            params.push(input.step_title)
        }
        if (input.step_description !== undefined) {
            updates.push(`step_description = $${paramIndex++}`)
            params.push(input.step_description)
        }
        if (input.step_type !== undefined) {
            updates.push(`step_type = $${paramIndex++}`)
            params.push(input.step_type)
        }
        if (input.assigned_role !== undefined) {
            updates.push(`assigned_role = $${paramIndex++}`)
            params.push(input.assigned_role)
        }
        if (input.sla_hours !== undefined) {
            updates.push(`sla_hours = $${paramIndex++}`)
            params.push(input.sla_hours)
        }
        if (input.step_config !== undefined) {
            updates.push(`step_config = $${paramIndex++}`)
            params.push(JSON.stringify(input.step_config))
        }
        if (input.step_condition !== undefined) {
            updates.push(`step_condition = $${paramIndex++}`)
            params.push(JSON.stringify(input.step_condition))
        }

        if (updates.length === 0) {
            const result = await pool.query('SELECT * FROM playbook_response_steps WHERE id = $1', [stepId])
            return result.rows[0]
        }

        params.push(stepId)
        const query = `
      UPDATE playbook_response_steps 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

        const result = await pool.query(query, params)

        if (result.rows.length === 0) {
            throw new Error('Step not found')
        }

        log.info('[PLAYBOOKS] Updated step', { stepId, updates: Object.keys(input) })
        return result.rows[0]
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to update step:', error)
        throw error
    }
}

/**
 * Delete a step
 */
export async function deleteStep(stepId: string): Promise<boolean> {
    const log = logger.child({ service: 'playbookService', method: 'deleteStep' })

    try {
        const result = await pool.query(
            'DELETE FROM playbook_response_steps WHERE id = $1 RETURNING id',
            [stepId]
        )
        const deleted = result.rows.length > 0
        log.info('[PLAYBOOKS] Deleted step', { stepId, deleted })
        return deleted
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to delete step:', error)
        throw error
    }
}

// ============================================================================
// PLAYBOOK MATCHING
// ============================================================================

/**
 * Find playbooks matching given criteria
 */
export async function findMatchingPlaybooks(
    criteria: PlaybookMatchCriteria
): Promise<Playbook[]> {
    const log = logger.child({ service: 'playbookService', method: 'findMatchingPlaybooks' })

    try {
        log.info('[PLAYBOOKS] Starting playbook matching', { criteria })
        
        // Find active playbooks for the project that match criteria
        let query = `
      SELECT p.*, 
        (
          CASE WHEN $2::text IS NOT NULL AND p.applicable_risk_categories IS NOT NULL AND 
                EXISTS(SELECT 1 FROM unnest(p.applicable_risk_categories) as cat WHERE LOWER(cat) = LOWER($2::text)) THEN 1 ELSE 0 END +
          CASE WHEN $3::text IS NOT NULL AND p.applicable_severity_levels IS NOT NULL AND 
                EXISTS(SELECT 1 FROM unnest(p.applicable_severity_levels) as lvl WHERE LOWER(lvl) = LOWER($3::text)) THEN 1 ELSE 0 END +
          CASE WHEN $4::text IS NOT NULL AND p.applicable_priority_levels IS NOT NULL AND 
                EXISTS(SELECT 1 FROM unnest(p.applicable_priority_levels) as pri WHERE LOWER(pri) = LOWER($4::text)) THEN 1 ELSE 0 END +
          CASE WHEN $2::text IS NOT NULL AND LOWER(p.category) = LOWER($2::text) THEN 2 ELSE 0 END
        ) as match_score
      FROM operational_playbooks p
      WHERE p.project_id = $1
        AND p.is_active = true
        AND (
          p.applicable_risk_categories IS NULL OR $2::text IS NULL OR 
          EXISTS(SELECT 1 FROM unnest(p.applicable_risk_categories) as cat WHERE LOWER(cat) = LOWER($2::text)) OR
          p.applicable_severity_levels IS NULL OR $3::text IS NULL OR 
          EXISTS(SELECT 1 FROM unnest(p.applicable_severity_levels) as lvl WHERE LOWER(lvl) = LOWER($3::text)) OR
          p.applicable_priority_levels IS NULL OR $4::text IS NULL OR 
          EXISTS(SELECT 1 FROM unnest(p.applicable_priority_levels) as pri WHERE LOWER(pri) = LOWER($4::text)) OR
          LOWER(p.category) = LOWER($2::text)
        )
      ORDER BY match_score DESC, p.created_at DESC
    `

        const queryParams = [
            criteria.project_id,
            criteria.risk_category || null,
            criteria.severity_level || criteria.impact || null,
            criteria.priority_level || null
        ]
        
        log.info('[PLAYBOOKS] Executing query', { 
            projectId: criteria.project_id,
            riskCategory: criteria.risk_category,
            severityLevel: criteria.severity_level,
            priorityLevel: criteria.priority_level,
            queryParams
        })

        const result = await pool.query(query, queryParams)

        if (!result || !result.rows) {
            log.error('[PLAYBOOKS] Database query returned null or invalid result')
            return []
        }

        log.info('[PLAYBOOKS] Initial query results', { 
            totalPlaybooksFound: result.rows.length,
            playbookIds: result.rows.map(r => r.id)
        })

        // Also check scenario conditions for more precise matching
        // Optimize: Get all scenarios for matching playbooks in a single query
        const playbookIds = result.rows.map(row => row.id)
        let scenariosResult = null
        
        if (playbookIds.length > 0) {
            scenariosResult = await pool.query(`
                SELECT * FROM playbook_scenarios 
                WHERE playbook_id = ANY($1) 
                ORDER BY priority DESC
            `, [playbookIds])
        }

        // Group scenarios by playbook_id for efficient lookup
        const scenariosByPlaybook = new Map<string, any[]>()
        if (scenariosResult && scenariosResult.rows) {
            for (const scenario of scenariosResult.rows) {
                if (!scenariosByPlaybook.has(scenario.playbook_id)) {
                    scenariosByPlaybook.set(scenario.playbook_id, [])
                }
                scenariosByPlaybook.get(scenario.playbook_id)!.push(scenario)
            }
        }

        // Check scenario matches
        const playbooks: Playbook[] = []
        for (const row of result.rows) {
            const scenarios = scenariosByPlaybook.get(row.id) || []

            // Check if any scenario matches the criteria
            let matches = scenarios.length === 0 // If no scenarios, it's a general match

            for (const scenario of scenarios) {
                const condition = scenario.scenario_condition
                let scenarioMatches = true

                if (condition.risk_category && criteria.risk_category && criteria.risk_category.toLowerCase() !== condition.risk_category.toLowerCase()) {
                    scenarioMatches = false
                }
                if (condition.impact && criteria.severity_level && criteria.severity_level.toLowerCase() !== condition.impact.toLowerCase()) {
                    scenarioMatches = false
                }
                if (condition.severity && criteria.severity_level && criteria.severity_level.toLowerCase() !== condition.severity.toLowerCase()) {
                    scenarioMatches = false
                }
                if (condition.probability && criteria.probability && criteria.probability.toLowerCase() !== condition.probability.toLowerCase()) {
                    scenarioMatches = false
                }

                if (scenarioMatches) {
                    matches = true
                    break
                }
            }

            if (matches) {
                row.scenarios = scenarios
                playbooks.push(row)
            }
        }

        log.info('[PLAYBOOKS] Found matching playbooks', {
            criteria,
            matchCount: playbooks.length,
            playbookTitles: playbooks.map(p => ({ id: p.id, title: p.title, matchScore: (p as any).match_score }))
        })

        return playbooks
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to find matching playbooks:', error)
        throw error
    }
}

// ============================================================================
// PLAYBOOK EXECUTION
// ============================================================================

/**
 * Execute a playbook (start execution tracking)
 */
export async function executePlaybook(
    input: ExecutePlaybookInput,
    userId: string
): Promise<PlaybookExecution> {
    const log = logger.child({ service: 'playbookService', method: 'executePlaybook' })

    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        // Get playbook and its steps
        const playbookResult = await client.query(
            'SELECT * FROM operational_playbooks WHERE id = $1',
            [input.playbook_id]
        )

        if (playbookResult.rows.length === 0) {
            throw new Error('Playbook not found')
        }

        const stepsResult = await client.query(
            'SELECT * FROM playbook_response_steps WHERE playbook_id = $1 ORDER BY step_order ASC',
            [input.playbook_id]
        )

        const totalSteps = stepsResult.rows.length
        const firstStep = stepsResult.rows[0]

        // Create execution record
        const executionResult = await client.query(`
      INSERT INTO playbook_executions (
        playbook_id,
        triggered_by_type,
        triggered_by_id,
        trigger_type,
        triggered_by_user_id,
        trigger_reason,
        status,
        current_step_id,
        completed_steps,
        total_steps,
        started_at,
        execution_context
      ) VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, 0, $8, CURRENT_TIMESTAMP, $9)
      RETURNING *
    `, [
            input.playbook_id,
            input.triggered_by_type,
            input.triggered_by_id,
            input.trigger_type,
            userId,
            input.trigger_reason || null,
            firstStep?.id || null,
            totalSteps,
            JSON.stringify({})
        ])

        const execution = {
            ...executionResult.rows[0],
            current_step_order: firstStep?.step_order || (totalSteps > 0 ? 1 : null)
        }

        // Create step execution records for all steps
        for (const step of stepsResult.rows) {
            const slaDeadline = step.sla_hours
                ? new Date(Date.now() + step.sla_hours * 60 * 60 * 1000).toISOString()
                : null

            await client.query(`
        INSERT INTO playbook_step_executions (
          execution_id,
          step_id,
          status,
          sla_deadline
        ) VALUES ($1, $2, $3, $4)
      `, [
                execution.id,
                step.id,
                step.id === firstStep?.id ? 'in_progress' : 'pending',
                step.id === firstStep?.id ? slaDeadline : null
            ])
        }

        await client.query('COMMIT')

        log.info('[PLAYBOOKS] Started playbook execution', {
            executionId: execution.id,
            playbookId: input.playbook_id,
            totalSteps
        })

        return execution
    } catch (error: any) {
        await client.query('ROLLBACK')
        log.error('[PLAYBOOKS] Failed to execute playbook:', error)
        throw error
    } finally {
        client.release()
    }
}

/**
 * Complete a step in an execution
 */
export async function completeStep(
    executionId: string,
    stepId: string,
    userId: string,
    notes?: string,
    evidence?: Record<string, any>
): Promise<PlaybookStepExecution> {
    const log = logger.child({ service: 'playbookService', method: 'completeStep' })

    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        // Get the step execution
        const stepExecResult = await client.query(`
      SELECT pse.*, prs.sla_hours
      FROM playbook_step_executions pse
      JOIN playbook_response_steps prs ON pse.step_id = prs.id
      WHERE pse.execution_id = $1 AND pse.step_id = $2
    `, [executionId, stepId])

        if (stepExecResult.rows.length === 0) {
            throw new Error('Step execution not found')
        }

        const stepExec = stepExecResult.rows[0]

        // Check if SLA was breached
        const slaBreached = stepExec.sla_deadline
            ? new Date() > new Date(stepExec.sla_deadline)
            : false

        // Update step execution
        const updateResult = await client.query(`
      UPDATE playbook_step_executions
      SET 
        status = 'completed',
        completed_by = $3,
        completed_at = CURRENT_TIMESTAMP,
        completion_notes = $4,
        completion_evidence = $5,
        sla_breached = $6
      WHERE execution_id = $1 AND step_id = $2
      RETURNING *
    `, [
            executionId,
            stepId,
            userId,
            notes || null,
            JSON.stringify(evidence || {}),
            slaBreached
        ])

        // Find next step and update it to in_progress
        const nextStepResult = await client.query(`
      SELECT pse.*, prs.step_order, prs.sla_hours
      FROM playbook_step_executions pse
      JOIN playbook_response_steps prs ON pse.step_id = prs.id
      WHERE pse.execution_id = $1 AND pse.status = 'pending'
      ORDER BY prs.step_order ASC
      LIMIT 1
    `, [executionId])

        if (nextStepResult.rows.length > 0) {
            const nextStep = nextStepResult.rows[0]
            const slaDeadline = nextStep.sla_hours
                ? new Date(Date.now() + nextStep.sla_hours * 60 * 60 * 1000).toISOString()
                : null

            await client.query(`
        UPDATE playbook_step_executions
        SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, sla_deadline = $3
        WHERE execution_id = $1 AND step_id = $2
      `, [executionId, nextStep.step_id, slaDeadline])

            // Update current step on execution
            await client.query(`
        UPDATE playbook_executions
        SET current_step_id = $2
        WHERE id = $1
      `, [executionId, nextStep.step_id])
        }

        await client.query('COMMIT')

        log.info('[PLAYBOOKS] Completed step', {
            executionId,
            stepId,
            slaBreached,
            hasNextStep: nextStepResult.rows.length > 0
        })

        return updateResult.rows[0]
    } catch (error: any) {
        await client.query('ROLLBACK')
        log.error('[PLAYBOOKS] Failed to complete step:', error)
        throw error
    } finally {
        client.release()
    }
}

/**
 * Cancel a playbook execution
 */
export async function cancelExecution(
    executionId: string,
    userId: string,
    reason: string
): Promise<PlaybookExecution> {
    const log = logger.child({ service: 'playbookService', method: 'cancelExecution' })

    try {
        const result = await pool.query(`
      UPDATE playbook_executions
      SET 
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        cancelled_by = $2,
        cancellation_reason = $3
      WHERE id = $1 AND status IN ('pending', 'in_progress')
      RETURNING *
    `, [executionId, userId, reason])

        if (result.rows.length === 0) {
            throw new Error('Execution not found or already completed/cancelled')
        }

        log.info('[PLAYBOOKS] Cancelled execution', { executionId, reason })
        return result.rows[0]
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to cancel execution:', error)
        throw error
    }
}

/**
 * Get execution by ID with full details
 */
export async function getExecutionById(
    executionId: string
): Promise<PlaybookExecution | null> {
    const log = logger.child({ service: 'playbookService', method: 'getExecutionById' })

    try {
        // Get execution
        const execResult = await pool.query(`
      SELECT pe.*, 
        op.title as playbook_title,
        op.category as playbook_category,
        prs.step_order as current_step_order
      FROM playbook_executions pe
      JOIN operational_playbooks op ON pe.playbook_id = op.id
      LEFT JOIN playbook_response_steps prs ON pe.current_step_id = prs.id
      WHERE pe.id = $1
    `, [executionId])

        if (execResult.rows.length === 0) {
            return null
        }

        const execution = execResult.rows[0]

        // Get step executions with step details
        const stepExecsResult = await pool.query(`
      SELECT pse.*, 
        prs.step_title, 
        prs.step_type,
        prs.step_order,
        prs.assigned_role
      FROM playbook_step_executions pse
      JOIN playbook_response_steps prs ON pse.step_id = prs.id
      WHERE pse.execution_id = $1
      ORDER BY prs.step_order ASC
    `, [executionId])

        execution.step_executions = stepExecsResult.rows

        log.info('[PLAYBOOKS] Retrieved execution', { executionId })
        return execution
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to get execution:', error)
        throw error
    }
}

/**
 * Get executions with filters
 */
export async function getExecutions(
    filters: {
        playbook_id?: string
        triggered_by_type?: string
        triggered_by_id?: string
        status?: string[]
        project_id?: string
    } = {}
): Promise<PlaybookExecution[]> {
    const log = logger.child({ service: 'playbookService', method: 'getExecutions' })

    try {
        let query = `
      SELECT pe.*, 
        op.title as playbook_title,
        op.category as playbook_category,
        op.project_id,
        prs.step_order as current_step_order
      FROM playbook_executions pe
      JOIN operational_playbooks op ON pe.playbook_id = op.id
      LEFT JOIN playbook_response_steps prs ON pe.current_step_id = prs.id
      WHERE 1=1
    `
        const params: any[] = []
        let paramIndex = 1

        if (filters.playbook_id) {
            query += ` AND pe.playbook_id = $${paramIndex++}`
            params.push(filters.playbook_id)
        }
        if (filters.triggered_by_type) {
            query += ` AND pe.triggered_by_type = $${paramIndex++}`
            params.push(filters.triggered_by_type)
        }
        if (filters.triggered_by_id) {
            query += ` AND pe.triggered_by_id = $${paramIndex++}`
            params.push(filters.triggered_by_id)
        }
        if (filters.status && filters.status.length > 0) {
            query += ` AND pe.status = ANY($${paramIndex++})`
            params.push(filters.status)
        }
        if (filters.project_id) {
            query += ` AND op.project_id = $${paramIndex++}`
            params.push(filters.project_id)
        }

        query += ` ORDER BY pe.created_at DESC`

        const result = await pool.query(query, params)

        log.info('[PLAYBOOKS] Retrieved executions', { count: result.rows.length, filters })
        return result.rows
    } catch (error: any) {
        log.error('[PLAYBOOKS] Failed to get executions:', error)
        throw error
    }
}

// ============================================================================
// EXPORTED SERVICE OBJECT
// ============================================================================

export const playbookService = {
    // Playbook CRUD
    getPlaybooks,
    getPlaybookById,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,

    // Scenarios
    addScenario,
    deleteScenario,

    // Steps
    addStep,
    updateStep,
    deleteStep,

    // Matching
    findMatchingPlaybooks,

    // Execution
    executePlaybook,
    completeStep,
    updateStepNotes,
    cancelExecution,
    getExecutionById,
    getExecutions
}

export default playbookService
