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
  id: string
  entityType: string
  name: string
  description?: string
  sourceDocument?: string
  metadata?: any
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
 */
function parseWBSCode(text: string): string | null {
  if (!text) return null
  
  const pattern = /(\d+(?:\.\d+)+)/
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
    let entities = []
    if (extractedData.entities) {
      entities = extractedData.entities
    } else if (Array.isArray(extractedData)) {
      entities = extractedData
    } else if (extractedData.activities) {
      entities = extractedData.activities.map((a: any) => ({
        ...a,
        entityType: 'activity'
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
    const entities = await getExtractedEntities(documentId)
    const activities = entities.filter(e => 
      e.entityType === 'activity' || 
      e.entityType === 'deliverable' ||
      e.entityType === 'milestone'
    )
    
    if (activities.length === 0) {
      throw new Error('No activities found in extracted data')
    }
    
    logger.info('Found activities to import', { count: activities.length })
    
    // 2. Import each activity as a task
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      
      try {
        // Parse data from activity
        const fullText = `${activity.name} ${activity.description || ''}`
        const wbsCode = parseWBSCode(fullText) || parseWBSCode(activity.name)
        const estimatedHours = parseEstimatedHours(fullText) || 
                              (activity.metadata?.estimated_hours) ||
                              (activity.metadata?.duration_hours)
        const requiredRole = extractRequiredRole(fullText) ||
                            (activity.metadata?.required_role)
        
        // Find role ID if role name found
        let roleId = null
        if (requiredRole && options.autoMatchRoles) {
          roleId = await findRoleByName(requiredRole)
        }
        
        // Generate task number
        const taskNumber = wbsCode || `TASK-${String(i + 1).padStart(3, '0')}`
        
        // Create task
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
            phase,
            status,
            source_document_id,
            source_entity_id,
            imported_from_wbs,
            created_by
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
          activity.name,
          activity.description,
          estimatedHours,
          roleId,
          requiredRole,
          activity.metadata?.phase || 'Execution',
          'planned',
          documentId,
          activity.id,
          true,
          userId
        ])
        
        const task = taskResult.rows[0]
        result.tasksCreated++
        
        if (estimatedHours) {
          result.totalEstimatedHours += estimatedHours
        }
        
        if (!roleId && requiredRole) {
          result.tasksNeedingRoleAssignment++
        }
        
        logger.info('Task imported from WBS', {
          taskId: task.id,
          taskName: activity.name,
          hours: estimatedHours
        })
        
      } catch (error: any) {
        result.errors.push(`Failed to import ${activity.name}: ${error.message}`)
        logger.error('Failed to import activity', { error, activity: activity.name })
      }
    }
    
    // 3. Import dependencies (if enabled)
    if (options.importDependencies) {
      // TODO: Parse dependencies from extracted data
      // Look for dependency information in entities
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

