/**
 * WBS Import Service
 * 
 * Converts AI-extracted entities (Activities, Deliverables, Dependencies)
 * from project documents into structured project_tasks
 * 
 * Flow: AI Document → Extraction → WBS Import → Project Tasks → Resource Scheduling
 * 
 * Features:
 * - Import activities as tasks
 * - Parse WBS codes (5.1.1, 5.1.2, etc.)
 * - Extract estimated hours from descriptions
 * - Map to required roles
 * - Create task dependencies
 * - Maintain traceability to source document
 * 
 * Migration: 208_tasks_scheduling_wbs_import.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

interface ExtractedEntity {
  id: string;
  entityType: 'activity' | 'deliverable' | 'milestone' | 'phase' | 'work_item' | 'checklist_item';
  name: string;
  description?: string;
  parent_task_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  cost?: number;
  estimated_hours?: number;
  assignee_id?: string;
  sequence?: number;
  sourceDocument?: string;
  metadata?: any;
}

interface WBSImportOptions {
  createHierarchy?: boolean
  importDependencies?: boolean
  autoMatchRoles?: boolean
  overwriteExisting?: boolean
}

interface WBSImportResult {
  tasksCreated: number
  tasksUpdated: number
  dependenciesCreated: number
  totalEstimatedHours: number
  totalEstimatedCost: number
  tasksNeedingRoleAssignment: number
  errors: string[]
}

/**
 * Parse estimated hours from activity description or name
 * Looks for patterns like: "40 hours", "40h", "40 hrs", "(40)", "40-50 hours"
 */
function parseEstimatedHours(text: string): number | null {
  if (!text) return null
  
  const patterns = [
    /(\d+)\s*hours?/i,
    /(\d+)\s*hrs?/i,
    /\((\d+)\s*h/i,
    /(\d+)-\d+\s*hours?/i,  // Range - take first number
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1])
    }
  }
  
  return null
}

/**
 * Parse WBS code from activity name or description
 * Looks for patterns like: "5.1.1", "5.1.2", "1.2.3.4"
 * Security: Limited to max 5 levels to prevent ReDoS attacks
 */
function parseWBSCode(text: string): string | null {
  if (!text) return null
  // Safe pattern: Max 5 levels deep to prevent ReDoS (e.g., "1.2.3.4.5")
  
  // Safe pattern: Max 5 levels deep to prevent ReDoS (e.g., "1.2.3.4.5")
  const pattern = /\b(\d+(?:\.\d+){1,4})\b/
  const match = text.match(pattern)
  return match ? match[1] : null
}

/**
 * Extract role name from activity description
 * Looks for common role keywords
 */
function extractRequiredRole(text: string): string | null {
  if (!text) return null
  
  const roleKeywords = [
    'Senior Developer', 'Developer', 'Senior Dev',
    'Business Analyst', 'BA',
    'Project Manager', 'PM',
    'Database Architect', 'DBA',
    'UX Designer', 'UI Designer', 'Designer',
    'QA Engineer', 'Tester',
    'DevOps Engineer',
    'Technical Lead', 'Team Lead',
    'Architect', 'Consultant'
  ]
  
  const lowerText = text.toLowerCase()
  
  for (const role of roleKeywords) {
    if (lowerText.includes(role.toLowerCase())) {
      return role
    }
  }
  
  return null
}

/**
 * Get extracted entities from a document
 */
async function getExtractedEntities(documentId: string): Promise<ExtractedEntity[]> {
  try {
    const result = await pool.query(`
      SELECT 
        extracted_data
      FROM extraction_jobs
      WHERE document_id = $1 
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `, [documentId])
    
    if (result.rows.length === 0) {
      return []
    }
    
    const extractedData = result.rows[0].extracted_data
    
    // Handle different extraction data formats
    let entities: ExtractedEntity[] = []
    if (extractedData.entities) {
        entities = extractedData.entities
    } else if (Array.isArray(extractedData)) {
        entities = extractedData
    } else if (extractedData.activities) {
        entities = extractedData.activities.map((a: any) => ({
          id: a.id,
          entityType: 'activity',
          name: a.activity_name || a.name,
          description: a.description,
          parent_task_id: a.parent_task_id || a.parentId || a.parent_id,
          start_date: a.start_date,
          end_date: a.end_date,
          status: a.status,
          cost: a.cost,
          estimated_hours: a.estimated_hours || null,
          assignee_id: a.assigned_to || a.assignee_id || null,
          sequence: a.sequence || null,
          sourceDocument: a.extracted_from_document_id || null,
          metadata: a.metadata || null
        }))
    }
    
    return entities
  } catch (error) {
    logger.error('getExtractedEntities error', { error, documentId })
    throw error
  }
}

/**
 * Find matching role ID by role name
 */
async function findRoleByName(roleName: string): Promise<string | null> {
  try {
    const result = await pool.query(`
      SELECT id 
      FROM project_roles 
      WHERE role_name ILIKE $1 
         OR role_code ILIKE $1
         OR role_category ILIKE $1
      ORDER BY 
        CASE WHEN role_name ILIKE $1 THEN 1 ELSE 2 END
      LIMIT 1
    `, [roleName])
    
    return result.rows.length > 0 ? result.rows[0].id : null
  } catch (error) {
    logger.error('findRoleByName error', { error, roleName })
    return null
  }
}

/**
 * Import WBS from project-level AI-extracted entities to project tasks
 */
export async function importWBSFromProjectEntities(
  projectId: string,
  userId: string,
  options: WBSImportOptions = {}
): Promise<WBSImportResult> {
  const result: WBSImportResult = {
    tasksCreated: 0,
    tasksUpdated: 0,
    dependenciesCreated: 0,
    totalEstimatedHours: 0,
    totalEstimatedCost: 0,
    tasksNeedingRoleAssignment: 0,
    errors: []
  }
  
  try {
    logger.info('Starting WBS import from project entities', { projectId, options })
    
    // 1. Get extracted activities, deliverables, phases, milestones and work_items from project tables
    const activitiesResult = await pool.query(`
      SELECT id, name, activity_name, description, category, start_date, end_date, 
             assigned_to, status, extracted_from_document_id
      FROM activities
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])
    
    const deliverablesResult = await pool.query(`
      SELECT id, name, description, type, due_date, status, owner, 
             acceptance_criteria, extracted_from_document_id
      FROM deliverables
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])

    const phasesResult = await pool.query(`
      SELECT id, name, description, start_date, end_date, status, source_document_id
      FROM phases
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])

    const milestonesResult = await pool.query(`
      SELECT id, name, description, due_date, status, source_document_id
      FROM milestones
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])

    const workItemsResult = await pool.query(`
      SELECT id, name, description, activity_id, activity_name, status, estimated_hours, assigned_to as assignee_id, source_document_id
      FROM work_items
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])
    
    const activities = activitiesResult.rows
    const deliverables = deliverablesResult.rows
    const phases = phasesResult.rows
    const milestones = milestonesResult.rows
    const workItems = workItemsResult.rows
    const totalItems = activities.length + deliverables.length + phases.length + milestones.length + workItems.length
    
    if (totalItems === 0) {
      throw new Error('No activities or deliverables found in extracted data. Please run extraction first.')
    }
    
    logger.info('Found items to import', { 
      activities: activities.length, 
      deliverables: deliverables.length,
      phases: phases.length,
      milestones: milestones.length,
      work_items: workItems.length,
      total: totalItems
    })
    
    // 3. Import deliverables, phases and milestones as parent tasks
    // Keep a map of source entity id -> created project_task.id so child work_items can be linked
    const sourceToTaskId: Record<string, string> = {}
    for (let i = 0; i < deliverables.length; i++) {
      const deliverable = deliverables[i]
      
      try {
        const fullText = `${deliverable.name} ${deliverable.description || ''}`
        const estimatedHours = parseEstimatedHours(fullText) || 40 // Default 40h for deliverables
        
        const taskNumber = `DEL-${String(i + 1).padStart(3, '0')}`
        
        // Map deliverable status to project_tasks allowed values
        const deliverableStatusMap: Record<string, string> = {
          'not_started': 'planned',
          'in_progress': 'in_progress',
          'completed': 'completed',
          'cancelled': 'cancelled',
          'on_hold': 'on_hold',
          'proposed': 'planned',
          'approved': 'planned',
          'delivered': 'completed'
        }
        const mappedDeliverableStatus = deliverableStatusMap[(deliverable.status || 'not_started').toLowerCase()] || 'planned'
        
        const taskResult = await pool.query(`
          INSERT INTO project_tasks (
            project_id,
            task_number,
            task_name,
            description,
            estimated_hours,
            status,
            source_entity_id,
            source_document_id,
            imported_from_wbs,
            created_by,
            parent_task_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (project_id, task_number) DO UPDATE SET
            task_name = EXCLUDED.task_name,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, estimated_hours
        `, [
          projectId,
          taskNumber,
          deliverable.name,
          deliverable.description,
          estimatedHours,
          mappedDeliverableStatus,
          deliverable.id,
          deliverable.extracted_from_document_id || deliverable.source_document_id || null,
          true,
          userId,
          (deliverable.parent_task_id && sourceToTaskId[deliverable.parent_task_id]) ? sourceToTaskId[deliverable.parent_task_id] : deliverable.parent_task_id || null
        ])
        
        const created = taskResult.rows[0]
        if (created && deliverable.id) {
          sourceToTaskId[deliverable.id] = created.id
        }
        result.tasksCreated++
        if (estimatedHours) {
          result.totalEstimatedHours += estimatedHours
        }
        
      } catch (error: any) {
        result.errors.push(`Failed to import deliverable ${deliverable.name}: ${error.message}`)
        logger.error('Failed to import deliverable', { error, deliverable: deliverable.name })
      }
    }

    // Import phases as parent tasks
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]
      try {
        const fullText = `${phase.name} ${phase.description || ''}`
        const estimatedHours = parseEstimatedHours(fullText) || 0
        const taskNumber = `PHASE-${String(i + 1).padStart(3, '0')}`

        const taskResult = await pool.query(`
          INSERT INTO project_tasks (
            project_id,
            task_number,
            task_name,
            description,
            estimated_hours,
            status,
            source_entity_id,
            source_document_id,
            imported_from_wbs,
            created_by,
            parent_task_id,
            entity_type
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (project_id, task_number) DO UPDATE SET
            task_name = EXCLUDED.task_name,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, estimated_hours
        `, [
          projectId,
          taskNumber,
          phase.name,
          phase.description,
          estimatedHours,
          (phase.status || 'not_started'),
          phase.id,
          phase.source_document_id || phase.extracted_from_document_id || null,
          true,
          userId,
          (phase.parent_task_id && sourceToTaskId[phase.parent_task_id]) ? sourceToTaskId[phase.parent_task_id] : phase.parent_task_id || null,
          'phase'
        ])

        const created = taskResult.rows[0]
        if (created && phase.id) sourceToTaskId[phase.id] = created.id
        result.tasksCreated++
        if (estimatedHours) result.totalEstimatedHours += estimatedHours
      } catch (error: any) {
        result.errors.push(`Failed to import phase ${phase.name}: ${error.message}`)
        logger.error('Failed to import phase', { error, phase: phase.name })
      }
    }

    // Import milestones as parent tasks
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i]
      try {
        const fullText = `${milestone.name} ${milestone.description || ''}`
        const estimatedHours = parseEstimatedHours(fullText) || 0
        const taskNumber = `MILE-${String(i + 1).padStart(3, '0')}`

        const taskResult = await pool.query(`
          INSERT INTO project_tasks (
            project_id,
            task_number,
            task_name,
            description,
            estimated_hours,
            status,
            source_entity_id,
            source_document_id,
            imported_from_wbs,
            created_by,
            parent_task_id,
            entity_type
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (project_id, task_number) DO UPDATE SET
            task_name = EXCLUDED.task_name,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, estimated_hours
        `, [
          projectId,
          taskNumber,
          milestone.name,
          milestone.description,
          estimatedHours,
          (milestone.status || 'pending'),
          milestone.id,
          milestone.source_document_id || milestone.extracted_from_document_id || null,
          true,
          userId,
          (milestone.parent_task_id && sourceToTaskId[milestone.parent_task_id]) ? sourceToTaskId[milestone.parent_task_id] : milestone.parent_task_id || null,
          'milestone'
        ])

        const created = taskResult.rows[0]
        if (created && milestone.id) sourceToTaskId[milestone.id] = created.id
        result.tasksCreated++
        if (estimatedHours) result.totalEstimatedHours += estimatedHours
      } catch (error: any) {
        result.errors.push(`Failed to import milestone ${milestone.name}: ${error.message}`)
        logger.error('Failed to import milestone', { error, milestone: milestone.name })
      }
    }
    
    // 4. Import activities as tasks
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      
      try {
        const activityName = activity.activity_name || activity.name
        const fullText = `${activityName} ${activity.description || ''}`
        const wbsCode = parseWBSCode(fullText) || parseWBSCode(activityName)
        const estimatedHours = parseEstimatedHours(fullText) || 8 // Default 8 hours if not found
        const requiredRole = extractRequiredRole(fullText)
        
        // Find role ID if role name found
        let roleId = null
        if (requiredRole && options.autoMatchRoles) {
          roleId = await findRoleByName(requiredRole)
        }
        
        const taskNumber = wbsCode || `ACT-${String(i + 1).padStart(3, '0')}`
        
        // Map activity status to project_tasks allowed values
        // activities table uses: not_started, in_progress, completed, cancelled
        // project_tasks table uses: planned, in_progress, completed, on_hold, cancelled
        const statusMap: Record<string, string> = {
          'not_started': 'planned',
          'in_progress': 'in_progress',
          'completed': 'completed',
          'cancelled': 'cancelled',
          'on_hold': 'on_hold'
        }
        const mappedStatus = statusMap[(activity.status || 'not_started').toLowerCase()] || 'planned'
        
        const taskResult = await pool.query(`
          INSERT INTO project_tasks (
            project_id,
            task_number,
            wbs_code,
            task_name,
            description,
            estimated_hours,
            required_role_id,
            required_role_name,
            status,
            source_entity_id,
            source_document_id,
            imported_from_wbs,
            created_by,
            parent_task_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (project_id, task_number) DO UPDATE SET
            task_name = EXCLUDED.task_name,
            description = EXCLUDED.description,
            estimated_hours = EXCLUDED.estimated_hours,
            updated_at = NOW()
          RETURNING id, estimated_hours
        `, [
          projectId,
          taskNumber,
          wbsCode,
          activityName,
          activity.description,
          estimatedHours,
          roleId,
          requiredRole,
          mappedStatus,
          activity.id,
          activity.extracted_from_document_id || activity.source_document_id || null,
          true,
          userId,
          (activity.parent_task_id && sourceToTaskId[activity.parent_task_id]) ? sourceToTaskId[activity.parent_task_id] : activity.parent_task_id || null
        ])
        
        const task = taskResult.rows[0]
        if (task && activity.id) sourceToTaskId[activity.id] = task.id
        result.tasksCreated++
        
        if (estimatedHours) {
          result.totalEstimatedHours += estimatedHours
        }
        
        if (!roleId && requiredRole) {
          result.tasksNeedingRoleAssignment++
        }
        
      } catch (error: any) {
        result.errors.push(`Failed to import activity ${activity.name}: ${error.message}`)
        logger.error('Failed to import activity', { error, activity: activity.name })
      }
    }

    // 5. Import work_items as checklist_items (use activity_id to find parent task)
    for (let i = 0; i < workItems.length; i++) {
      const item = workItems[i]
      try {
        // Find the task that was created from the parent activity
        // work_items are linked to activities via activity_id, and activities were imported as tasks
        const parentTaskId = item.activity_id && sourceToTaskId[item.activity_id] 
          ? sourceToTaskId[item.activity_id] 
          : null
        
        if (!parentTaskId) {
          logger.warn('Skipping work item - no parent task found', { 
            workItemId: item.id, 
            workItemName: item.name, 
            activityId: item.activity_id,
            activityName: item.activity_name 
          })
          continue
        }
        
        await pool.query(`
          INSERT INTO checklist_items (
            id, task_id, name, description, cost, status, assignee_id, estimated_hours, source_document_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            cost = EXCLUDED.cost,
            status = EXCLUDED.status,
            assignee_id = EXCLUDED.assignee_id,
            estimated_hours = EXCLUDED.estimated_hours,
            updated_at = NOW()
        `, [
          item.id,
          parentTaskId,
          item.name,
          item.description,
          null,
          item.status,
          item.assignee_id,
          item.estimated_hours,
          item.source_document_id || null,
        ])
      } catch (error: any) {
        result.errors.push(`Failed to import work_item ${item.name}: ${error.message}`)
        logger.error('Failed to import work_item', { error, item: item.name })
      }
    }
    
    logger.info('WBS import from project entities completed', { result })
    
    return result
    
  } catch (error) {
    logger.error('WBS import from project entities failed', { error, projectId })
    throw error
  }
}

/**
 * Import WBS from AI-extracted document entities to project tasks
 */

export async function importWBSFromDocument(
  projectId: string,
  documentId: string,
  userId: string,
  options: WBSImportOptions = {}
): Promise<WBSImportResult> {
  const result: WBSImportResult = {
    tasksCreated: 0,
    tasksUpdated: 0,
    dependenciesCreated: 0,
    totalEstimatedHours: 0,
    totalEstimatedCost: 0,
    tasksNeedingRoleAssignment: 0,
    errors: []
  }

  try {
    logger.info('Starting WBS import', { projectId, documentId, options })

    // 1. Get extracted entities
    const entities: ExtractedEntity[] = await getExtractedEntities(documentId)
    if (!entities.length) {
      throw new Error('No extracted entities found in document')
    }

    // 2. Import each entity by type
    // Keep a mapping of source entity id -> created project_task.id so child work_items can be linked
    const sourceToTaskId: Record<string, string> = {}
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const fullText = `${entity.name} ${entity.description || ''}`
      const wbsCode = parseWBSCode(fullText) || parseWBSCode(entity.name)
      const estimatedHours = parseEstimatedHours(fullText) || entity.estimated_hours || (entity.metadata?.estimated_hours) || (entity.metadata?.duration_hours)
      const requiredRole = extractRequiredRole(fullText) || (entity.metadata?.required_role)
      let roleId = null
      if (requiredRole && options.autoMatchRoles) {
        roleId = await findRoleByName(requiredRole)
      }

      // Map status
      const statusMap: Record<string, string> = {
        'not_started': 'planned',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'on_hold': 'on_hold',
        'proposed': 'planned',
        'approved': 'planned',
        'delivered': 'completed'
      }
      const mappedStatus = statusMap[(entity.status || 'not_started').toLowerCase()] || 'planned'

      try {
        if (['activity', 'deliverable', 'milestone', 'phase'].includes(entity.entityType)) {
          // Insert as project_task (with parent_task_id if present)
          const taskResult = await pool.query(`
            INSERT INTO project_tasks (
              project_id,
              task_number,
              wbs_code,
              task_name,
              description,
              estimated_hours,
              required_role_id,
              required_role_name,
              status,
              source_document_id,
              source_entity_id,
              imported_from_wbs,
              created_by,
              parent_task_id,
              entity_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (project_id, task_number) DO UPDATE SET
              task_name = EXCLUDED.task_name,
              description = EXCLUDED.description,
              estimated_hours = EXCLUDED.estimated_hours,
              updated_at = NOW()
            RETURNING id, estimated_hours
          `, [
            projectId,
            wbsCode || `TASK-${String(i + 1).padStart(3, '0')}`,
            wbsCode,
            entity.name,
            entity.description,
            estimatedHours,
            roleId,
            requiredRole,
            mappedStatus,
            documentId,
            entity.id,
            true,
            userId,
            (entity.parent_task_id && sourceToTaskId[entity.parent_task_id]) ? sourceToTaskId[entity.parent_task_id] : entity.parent_task_id || null,
            entity.entityType
          ])
          const created = taskResult.rows[0]
          if (created && entity.id) sourceToTaskId[entity.id] = created.id
          result.tasksCreated++
          if (estimatedHours) result.totalEstimatedHours += estimatedHours
          if (!roleId && requiredRole) result.tasksNeedingRoleAssignment++
        } else if (['work_item', 'checklist_item'].includes(entity.entityType)) {
          // Insert as checklist_item (with task_id = parent_task_id)
          await pool.query(`
            INSERT INTO checklist_items (
              id, task_id, name, description, cost, status, assignee_id, estimated_hours, sequence, source_document_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            ) ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              cost = EXCLUDED.cost,
              status = EXCLUDED.status,
              assignee_id = EXCLUDED.assignee_id,
              estimated_hours = EXCLUDED.estimated_hours,
              sequence = EXCLUDED.sequence,
              updated_at = NOW()
          `, [
            entity.id,
            (entity.parent_task_id && sourceToTaskId[entity.parent_task_id]) ? sourceToTaskId[entity.parent_task_id] : entity.parent_task_id,
            entity.name,
            entity.description,
            entity.cost,
            mappedStatus,
            entity.assignee_id,
            entity.estimated_hours,
            entity.sequence,
            documentId
          ])
        }
      } catch (error: any) {
        result.errors.push(`Failed to import ${entity.entityType} ${entity.name}: ${error.message}`)
        logger.error('Failed to import entity', { error, entity: entity.name, type: entity.entityType })
      }
    }

    // 3. Import dependencies (if enabled)
    if (options.importDependencies) {
      // TODO: Parse dependencies from extracted data
    }

    logger.info('WBS import completed', { result })
    return result
  } catch (error) {
    logger.error('WBS import failed', { error, projectId, documentId })
    throw error
  }
}

/**
 * Get tasks imported from WBS for a project
 */
export async function getWBSImportedTasks(projectId: string): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM task_summary
      WHERE project_id = $1 AND imported_from_wbs = TRUE
      ORDER BY wbs_code NULLS LAST, task_number
    `, [projectId])
    
    return result.rows
  } catch (error) {
    logger.error('getWBSImportedTasks error', { error, projectId })
    throw error
  }
}

/**
 * Get import history for a project
 */
export async function getWBSImportHistory(projectId: string): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        d.id as document_id,
        d.title as document_title,
        COUNT(DISTINCT t.id) as tasks_created,
        COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
        MIN(t.created_at) as imported_at
      FROM documents d
      JOIN project_tasks t ON d.id = t.source_document_id
      WHERE t.project_id = $1 AND t.imported_from_wbs = TRUE
      GROUP BY d.id, d.title
      ORDER BY imported_at DESC
    `, [projectId])
    
    return result.rows
  } catch (error) {
    logger.error('getWBSImportHistory error', { error, projectId })
    throw error
  }
}

