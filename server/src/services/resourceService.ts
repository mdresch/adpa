/**
 * Program Resource Management Service
 * 
 * Handles:
 * - Resource planning and requirements
 * - Resource allocation to projects
 * - Capacity forecasting
 * - Skills inventory management
 * - Resource performance tracking
 * - Resource risk management
 * - Conflict detection and resolution
 * 
 * Reference: PROGRAM_RESOURCE_COST_MANAGEMENT.md
 * Migration: 338_program_resource_management.sql
 * Task: TASK-1141 / Issue #415
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

// ================================================================
// INTERFACES
// ================================================================

export interface ResourcePlan {
  id?: string
  programId: string
  resourceType: 'human' | 'financial' | 'technological' | 'physical' | 'other'
  resourceName: string
  resourceRole?: string
  requiredQuantity: number
  unitOfMeasure?: string
  neededFrom: Date | string
  neededUntil?: Date | string
  hoursPerWeek?: number
  requiredSkills?: string[]
  seniorityLevel?: 'junior' | 'mid' | 'senior' | 'expert' | 'lead' | 'principal'
  planningStatus?: 'identified' | 'requested' | 'approved' | 'allocated' | 'cancelled'
  description?: string
  priority?: number
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourceAllocation {
  id?: string
  programId: string
  projectId?: string
  resourceId: string
  resourceName: string
  resourceType: 'human' | 'financial' | 'technological' | 'physical' | 'other'
  allocatedAmount: number
  allocationPercentage?: number
  allocationStart: Date | string
  allocationEnd?: Date | string
  priorityScore?: number
  isCriticalResource?: boolean
  hasConflicts?: boolean
  conflictProjects?: string[]
  conflictDetails?: any
  allocationStatus?: 'planned' | 'active' | 'completed' | 'released' | 'cancelled'
  notes?: string
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CapacityForecast {
  id?: string
  programId: string
  forecastPeriod: Date | string
  humanCapacityFte?: number
  humanDemandFte?: number
  humanUtilization?: number
  financialCapacity?: number
  financialDemand?: number
  financialUtilization?: number
  isBottleneckPeriod?: boolean
  bottleneckResources?: string[]
  bottleneckSeverity?: 'low' | 'medium' | 'high' | 'critical'
  capacityRecommendations?: any
  forecastMethod?: string
  confidenceLevel?: 'low' | 'medium' | 'high'
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface SkillsInventory {
  id?: string
  programId: string
  userId: string
  skillName: string
  skillCategory: 'technical' | 'leadership' | 'domain' | 'tool' | 'soft' | 'certification' | 'other'
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  proficiencyScore?: number
  isCertified?: boolean
  certificationName?: string
  certificationExpiry?: Date | string
  certificationIssuer?: string
  yearsExperience?: number
  projectsUsedIn?: string[]
  lastUsedDate?: Date | string
  availableForAllocation?: boolean
  preferredAllocationType?: 'full-time' | 'part-time' | 'consulting'
  verifiedBy?: string
  verifiedAt?: Date | string
  verificationNotes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourcePerformance {
  id?: string
  programId: string
  resourceId: string
  reportingPeriod: Date | string
  availableHours?: number
  billableHours?: number
  utilizationRate?: number
  tasksAssigned?: number
  tasksCompleted?: number
  completionRate?: number
  qualityScore?: number
  reworkPercentage?: number
  overallPerformance?: 'exceeds' | 'meets' | 'below-expectations' | 'needs-improvement'
  performanceScore?: number
  managerFeedback?: string
  peerFeedback?: any
  selfAssessment?: string
  reviewedBy?: string
  reviewedAt?: Date | string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourceRisk {
  id?: string
  programId: string
  resourceId?: string
  riskTitle: string
  riskDescription?: string
  riskCategory?: 'availability' | 'capability' | 'capacity' | 'cost' | 'conflict' | 'retention' | 'other'
  probability?: 'low' | 'medium' | 'high' | 'very-high'
  impact?: 'low' | 'medium' | 'high' | 'critical'
  riskScore?: number
  mitigationPlan?: string
  mitigationStatus?: 'planned' | 'in-progress' | 'completed' | 'cancelled'
  mitigationOwnerId?: string
  riskStatus?: 'open' | 'mitigated' | 'accepted' | 'closed'
  identifiedDate?: Date | string
  mitigationDueDate?: Date | string
  resolvedDate?: Date | string
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourceConflict {
  resourceId: string
  resourceName: string
  programId: string
  conflictingProjects: number
  totalAllocation: number
  conflictSeverity: 'over-allocated' | 'near-capacity' | 'ok'
  projectIds?: string[]
  earliestAllocation?: Date
  latestAllocation?: Date
}

export interface SkillsGap {
  programId: string
  skillName: string
  requiredCount: number
  availableExperts: number
  availableResources: number
  gapStatus: 'met' | 'partial' | 'gap'
}

export interface ResourceUtilizationSummary {
  programId: string
  avgUtilization: number
  overUtilizedCount: number
  underUtilizedCount: number
  optimalCount: number
  totalResources: number
  utilizationStatus: 'Efficient' | 'Over-utilized' | 'Under-utilized' | 'Acceptable'
}

// ================================================================
// RESOURCE PLANNING
// ================================================================

/**
 * Create a resource plan entry
 */
export async function createResourcePlan(
  plan: Omit<ResourcePlan, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<ResourcePlan> {
  try {
    const result = await pool.query(
      `INSERT INTO program_resource_plan (
        program_id, resource_type, resource_name, resource_role,
        required_quantity, unit_of_measure, needed_from, needed_until,
        hours_per_week, required_skills, seniority_level,
        planning_status, description, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING 
        id, program_id as "programId", resource_type as "resourceType",
        resource_name as "resourceName", resource_role as "resourceRole",
        required_quantity as "requiredQuantity", unit_of_measure as "unitOfMeasure",
        needed_from as "neededFrom", needed_until as "neededUntil",
        hours_per_week as "hoursPerWeek", required_skills as "requiredSkills",
        seniority_level as "seniorityLevel", planning_status as "planningStatus",
        description, priority, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        plan.programId,
        plan.resourceType,
        plan.resourceName,
        plan.resourceRole || null,
        plan.requiredQuantity,
        plan.unitOfMeasure || 'FTE',
        plan.neededFrom,
        plan.neededUntil || null,
        plan.hoursPerWeek || null,
        plan.requiredSkills || null,
        plan.seniorityLevel || null,
        plan.planningStatus || 'identified',
        plan.description || null,
        plan.priority || 0,
        userId
      ]
    )

    logger.info('[RESOURCE] Created resource plan', {
      planId: result.rows[0].id,
      programId: plan.programId,
      resourceName: plan.resourceName
    })

    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to create resource plan', { error: error.message, plan })
    throw error
  }
}

/**
 * Get resource plans for a program
 */
export async function getResourcePlans(
  programId: string,
  filters?: {
    resourceType?: string
    planningStatus?: string
    dateRange?: { from?: Date; until?: Date }
  }
): Promise<ResourcePlan[]> {
  try {
    let query = `
      SELECT 
        id, program_id as "programId", resource_type as "resourceType",
        resource_name as "resourceName", resource_role as "resourceRole",
        required_quantity as "requiredQuantity", unit_of_measure as "unitOfMeasure",
        needed_from as "neededFrom", needed_until as "neededUntil",
        hours_per_week as "hoursPerWeek", required_skills as "requiredSkills",
        seniority_level as "seniorityLevel", planning_status as "planningStatus",
        description, priority, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_resource_plan
      WHERE program_id = $1
    `
    const params: any[] = [programId]
    let paramCount = 1

    if (filters?.resourceType) {
      paramCount++
      query += ` AND resource_type = $${paramCount}`
      params.push(filters.resourceType)
    }

    if (filters?.planningStatus) {
      paramCount++
      query += ` AND planning_status = $${paramCount}`
      params.push(filters.planningStatus)
    }

    if (filters?.dateRange?.from) {
      paramCount++
      query += ` AND needed_from >= $${paramCount}`
      params.push(filters.dateRange.from)
    }

    if (filters?.dateRange?.until) {
      paramCount++
      query += ` AND (needed_until IS NULL OR needed_until <= $${paramCount})`
      params.push(filters.dateRange.until)
    }

    query += ` ORDER BY priority DESC, needed_from ASC`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource plans', { error: error.message, programId })
    throw error
  }
}

/**
 * Update resource plan status
 */
export async function updateResourcePlanStatus(
  planId: string,
  status: ResourcePlan['planningStatus'],
  userId: string
): Promise<ResourcePlan> {
  try {
    const result = await pool.query(
      `UPDATE program_resource_plan
      SET planning_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id, program_id as "programId", resource_type as "resourceType",
        resource_name as "resourceName", resource_role as "resourceRole",
        required_quantity as "requiredQuantity", unit_of_measure as "unitOfMeasure",
        needed_from as "neededFrom", needed_until as "neededUntil",
        hours_per_week as "hoursPerWeek", required_skills as "requiredSkills",
        seniority_level as "seniorityLevel", planning_status as "planningStatus",
        description, priority, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [status, planId]
    )

    if (result.rows.length === 0) {
      throw new Error(`Resource plan not found: ${planId}`)
    }

    logger.info('[RESOURCE] Updated resource plan status', { planId, status })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to update resource plan status', { error: error.message, planId })
    throw error
  }
}

// ================================================================
// RESOURCE ALLOCATIONS
// ================================================================

/**
 * Allocate resource to a project
 */
export async function allocateResource(
  allocation: Omit<ResourceAllocation, 'id' | 'createdAt' | 'updatedAt' | 'hasConflicts'>,
  userId: string
): Promise<ResourceAllocation> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insert allocation
    const result = await client.query(
      `INSERT INTO program_resource_allocations (
        program_id, project_id, resource_id, resource_name, resource_type,
        allocated_amount, allocation_percentage, allocation_start, allocation_end,
        priority_score, is_critical_resource, allocation_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING 
        id, program_id as "programId", project_id as "projectId",
        resource_id as "resourceId", resource_name as "resourceName",
        resource_type as "resourceType", allocated_amount as "allocatedAmount",
        allocation_percentage as "allocationPercentage",
        allocation_start as "allocationStart", allocation_end as "allocationEnd",
        priority_score as "priorityScore", is_critical_resource as "isCriticalResource",
        has_conflicts as "hasConflicts", conflict_projects as "conflictProjects",
        conflict_details as "conflictDetails", allocation_status as "allocationStatus",
        notes, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        allocation.programId,
        allocation.projectId || null,
        allocation.resourceId,
        allocation.resourceName,
        allocation.resourceType,
        allocation.allocatedAmount,
        allocation.allocationPercentage || null,
        allocation.allocationStart,
        allocation.allocationEnd || null,
        allocation.priorityScore || null,
        allocation.isCriticalResource || false,
        allocation.allocationStatus || 'planned',
        allocation.notes || null,
        userId
      ]
    )

    const newAllocation = result.rows[0]

    // Detect conflicts automatically (trigger will handle this, but we can also call function)
    await client.query('SELECT detect_resource_conflicts($1)', [allocation.programId])

    await client.query('COMMIT')

    logger.info('[RESOURCE] Allocated resource', {
      allocationId: newAllocation.id,
      programId: allocation.programId,
      resourceId: allocation.resourceId,
      hasConflicts: newAllocation.hasConflicts
    })

    return newAllocation
  } catch (error: any) {
    await client.query('ROLLBACK')
    logger.error('[RESOURCE] Failed to allocate resource', { error: error.message, allocation })
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get resource allocations for a program
 */
export async function getResourceAllocations(
  programId: string,
  filters?: {
    projectId?: string
    resourceId?: string
    allocationStatus?: string
    showConflictsOnly?: boolean
  }
): Promise<ResourceAllocation[]> {
  try {
    let query = `
      SELECT 
        id, program_id as "programId", project_id as "projectId",
        resource_id as "resourceId", resource_name as "resourceName",
        resource_type as "resourceType", allocated_amount as "allocatedAmount",
        allocation_percentage as "allocationPercentage",
        allocation_start as "allocationStart", allocation_end as "allocationEnd",
        priority_score as "priorityScore", is_critical_resource as "isCriticalResource",
        has_conflicts as "hasConflicts", conflict_projects as "conflictProjects",
        conflict_details as "conflictDetails", allocation_status as "allocationStatus",
        notes, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_resource_allocations
      WHERE program_id = $1
    `
    const params: any[] = [programId]
    let paramCount = 1

    if (filters?.projectId) {
      paramCount++
      query += ` AND project_id = $${paramCount}`
      params.push(filters.projectId)
    }

    if (filters?.resourceId) {
      paramCount++
      query += ` AND resource_id = $${paramCount}`
      params.push(filters.resourceId)
    }

    if (filters?.allocationStatus) {
      paramCount++
      query += ` AND allocation_status = $${paramCount}`
      params.push(filters.allocationStatus)
    }

    if (filters?.showConflictsOnly) {
      query += ` AND has_conflicts = TRUE`
    }

    query += ` ORDER BY allocation_start ASC, priority_score DESC NULLS LAST`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource allocations', { error: error.message, programId })
    throw error
  }
}

/**
 * Get resource conflicts for a program
 */
export async function getResourceConflicts(programId: string): Promise<ResourceConflict[]> {
  try {
    // Check if the view exists first
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'program_resource_conflicts'
      )
    `)
    
    if (!viewCheck.rows[0].exists) {
      logger.warn('[RESOURCE] View program_resource_conflicts does not exist. Run migration 338 to create it.')
      return []
    }
    
    const result = await pool.query(
      `SELECT 
        resource_id as "resourceId", resource_name as "resourceName",
        program_id as "programId", conflicting_projects as "conflictingProjects",
        total_allocation as "totalAllocation", conflict_severity as "conflictSeverity",
        project_ids as "projectIds", earliest_allocation as "earliestAllocation",
        latest_allocation as "latestAllocation"
      FROM program_resource_conflicts
      WHERE program_id = $1
      ORDER BY 
        CASE conflict_severity
          WHEN 'over-allocated' THEN 1
          WHEN 'near-capacity' THEN 2
          ELSE 3
        END,
        total_allocation DESC
      `,
      [programId]
    )

    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource conflicts', { error: error.message, programId })
    throw error
  }
}

/**
 * Update allocation status
 */
export async function updateAllocationStatus(
  allocationId: string,
  status: ResourceAllocation['allocationStatus'],
  userId: string
): Promise<ResourceAllocation> {
  try {
    const result = await pool.query(
      `UPDATE program_resource_allocations
      SET allocation_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id, program_id as "programId", project_id as "projectId",
        resource_id as "resourceId", resource_name as "resourceName",
        resource_type as "resourceType", allocated_amount as "allocatedAmount",
        allocation_percentage as "allocationPercentage",
        allocation_start as "allocationStart", allocation_end as "allocationEnd",
        priority_score as "priorityScore", is_critical_resource as "isCriticalResource",
        has_conflicts as "hasConflicts", conflict_projects as "conflictProjects",
        conflict_details as "conflictDetails", allocation_status as "allocationStatus",
        notes, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [status, allocationId]
    )

    if (result.rows.length === 0) {
      throw new Error(`Resource allocation not found: ${allocationId}`)
    }

    // Re-detect conflicts after status change
    const allocation = result.rows[0]
    await pool.query('SELECT detect_resource_conflicts($1)', [allocation.programId])

    logger.info('[RESOURCE] Updated allocation status', { allocationId, status })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to update allocation status', { error: error.message, allocationId })
    throw error
  }
}

// ================================================================
// CAPACITY FORECASTING
// ================================================================

/**
 * Calculate capacity forecast for a program
 */
export async function calculateCapacityForecast(
  programId: string,
  forecastPeriod: Date | string,
  userId: string
): Promise<CapacityForecast> {
  try {
    // Call the database function to calculate forecast
    await pool.query('SELECT calculate_capacity_forecast($1, $2)', [programId, forecastPeriod])

    // Retrieve the calculated forecast
    const result = await pool.query(
      `SELECT 
        id, program_id as "programId", forecast_period as "forecastPeriod",
        human_capacity_fte as "humanCapacityFte", human_demand_fte as "humanDemandFte",
        human_utilization as "humanUtilization",
        financial_capacity as "financialCapacity", financial_demand as "financialDemand",
        financial_utilization as "financialUtilization",
        is_bottleneck_period as "isBottleneckPeriod",
        bottleneck_resources as "bottleneckResources",
        bottleneck_severity as "bottleneckSeverity",
        capacity_recommendations as "capacityRecommendations",
        forecast_method as "forecastMethod", confidence_level as "confidenceLevel",
        created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_capacity_forecast
      WHERE program_id = $1 AND forecast_period = $2
      `,
      [programId, forecastPeriod]
    )

    if (result.rows.length === 0) {
      throw new Error(`Capacity forecast not found for program ${programId} and period ${forecastPeriod}`)
    }

    logger.info('[RESOURCE] Calculated capacity forecast', { programId, forecastPeriod })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to calculate capacity forecast', { error: error.message, programId })
    throw error
  }
}

/**
 * Get capacity forecasts for a program
 */
export async function getCapacityForecasts(
  programId: string,
  startDate?: Date | string,
  endDate?: Date | string
): Promise<CapacityForecast[]> {
  try {
    let query = `
      SELECT 
        id, program_id as "programId", forecast_period as "forecastPeriod",
        human_capacity_fte as "humanCapacityFte", human_demand_fte as "humanDemandFte",
        human_utilization as "humanUtilization",
        financial_capacity as "financialCapacity", financial_demand as "financialDemand",
        financial_utilization as "financialUtilization",
        is_bottleneck_period as "isBottleneckPeriod",
        bottleneck_resources as "bottleneckResources",
        bottleneck_severity as "bottleneckSeverity",
        capacity_recommendations as "capacityRecommendations",
        forecast_method as "forecastMethod", confidence_level as "confidenceLevel",
        created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_capacity_forecast
      WHERE program_id = $1
    `
    const params: any[] = [programId]
    let paramCount = 1

    if (startDate) {
      paramCount++
      query += ` AND forecast_period >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      query += ` AND forecast_period <= $${paramCount}`
      params.push(endDate)
    }

    query += ` ORDER BY forecast_period ASC`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get capacity forecasts', { error: error.message, programId })
    throw error
  }
}

// ================================================================
// SKILLS INVENTORY
// ================================================================

/**
 * Add or update skill in inventory
 */
export async function upsertSkill(
  skill: Omit<SkillsInventory, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<SkillsInventory> {
  try {
    const result = await pool.query(
      `INSERT INTO program_skills_inventory (
        program_id, user_id, skill_name, skill_category, proficiency_level,
        proficiency_score, is_certified, certification_name, certification_expiry,
        certification_issuer, years_experience, projects_used_in, last_used_date,
        available_for_allocation, preferred_allocation_type, verified_by, verified_at,
        verification_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (program_id, user_id, skill_name) DO UPDATE SET
        skill_category = EXCLUDED.skill_category,
        proficiency_level = EXCLUDED.proficiency_level,
        proficiency_score = EXCLUDED.proficiency_score,
        is_certified = EXCLUDED.is_certified,
        certification_name = EXCLUDED.certification_name,
        certification_expiry = EXCLUDED.certification_expiry,
        certification_issuer = EXCLUDED.certification_issuer,
        years_experience = EXCLUDED.years_experience,
        projects_used_in = EXCLUDED.projects_used_in,
        last_used_date = EXCLUDED.last_used_date,
        available_for_allocation = EXCLUDED.available_for_allocation,
        preferred_allocation_type = EXCLUDED.preferred_allocation_type,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        verification_notes = EXCLUDED.verification_notes
      RETURNING 
        id, program_id as "programId", user_id as "userId",
        skill_name as "skillName", skill_category as "skillCategory",
        proficiency_level as "proficiencyLevel", proficiency_score as "proficiencyScore",
        is_certified as "isCertified", certification_name as "certificationName",
        certification_expiry as "certificationExpiry", certification_issuer as "certificationIssuer",
        years_experience as "yearsExperience", projects_used_in as "projectsUsedIn",
        last_used_date as "lastUsedDate", available_for_allocation as "availableForAllocation",
        preferred_allocation_type as "preferredAllocationType",
        verified_by as "verifiedBy", verified_at as "verifiedAt",
        verification_notes as "verificationNotes",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        skill.programId,
        skill.userId,
        skill.skillName,
        skill.skillCategory,
        skill.proficiencyLevel,
        skill.proficiencyScore || null,
        skill.isCertified || false,
        skill.certificationName || null,
        skill.certificationExpiry || null,
        skill.certificationIssuer || null,
        skill.yearsExperience || 0,
        skill.projectsUsedIn || null,
        skill.lastUsedDate || null,
        skill.availableForAllocation !== false,
        skill.preferredAllocationType || null,
        skill.verifiedBy || null,
        skill.verifiedAt || null,
        skill.verificationNotes || null
      ]
    )

    logger.info('[RESOURCE] Upserted skill', {
      skillId: result.rows[0].id,
      programId: skill.programId,
      userId: skill.userId,
      skillName: skill.skillName
    })

    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to upsert skill', { error: error.message, skill })
    throw error
  }
}

/**
 * Get skills inventory for a program
 */
export async function getSkillsInventory(
  programId: string,
  filters?: {
    userId?: string
    skillCategory?: string
    proficiencyLevel?: string
    skillName?: string
  }
): Promise<SkillsInventory[]> {
  try {
    let query = `
      SELECT 
        id, program_id as "programId", user_id as "userId",
        skill_name as "skillName", skill_category as "skillCategory",
        proficiency_level as "proficiencyLevel", proficiency_score as "proficiencyScore",
        is_certified as "isCertified", certification_name as "certificationName",
        certification_expiry as "certificationExpiry", certification_issuer as "certificationIssuer",
        years_experience as "yearsExperience", projects_used_in as "projectsUsedIn",
        last_used_date as "lastUsedDate", available_for_allocation as "availableForAllocation",
        preferred_allocation_type as "preferredAllocationType",
        verified_by as "verifiedBy", verified_at as "verifiedAt",
        verification_notes as "verificationNotes",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_skills_inventory
      WHERE program_id = $1
    `
    const params: any[] = [programId]
    let paramCount = 1

    if (filters?.userId) {
      paramCount++
      query += ` AND user_id = $${paramCount}`
      params.push(filters.userId)
    }

    if (filters?.skillCategory) {
      paramCount++
      query += ` AND skill_category = $${paramCount}`
      params.push(filters.skillCategory)
    }

    if (filters?.proficiencyLevel) {
      paramCount++
      query += ` AND proficiency_level = $${paramCount}`
      params.push(filters.proficiencyLevel)
    }

    if (filters?.skillName) {
      paramCount++
      query += ` AND skill_name ILIKE $${paramCount}`
      params.push(`%${filters.skillName}%`)
    }

    query += ` ORDER BY skill_category, proficiency_level DESC, skill_name ASC`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get skills inventory', { error: error.message, programId })
    throw error
  }
}

/**
 * Get skills gap analysis
 */
export async function getSkillsGap(programId: string): Promise<SkillsGap[]> {
  try {
    const result = await pool.query(
      `SELECT 
        program_id as "programId", skill_name as "skillName",
        required_count as "requiredCount", available_experts as "availableExperts",
        available_resources as "availableResources", gap_status as "gapStatus"
      FROM program_skills_gap
      WHERE program_id = $1
      ORDER BY 
        CASE gap_status
          WHEN 'gap' THEN 1
          WHEN 'partial' THEN 2
          WHEN 'met' THEN 3
        END,
        required_count DESC
      `,
      [programId]
    )

    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get skills gap', { error: error.message, programId })
    throw error
  }
}

// ================================================================
// RESOURCE PERFORMANCE
// ================================================================

/**
 * Create or update resource performance record
 */
export async function upsertResourcePerformance(
  performance: Omit<ResourcePerformance, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<ResourcePerformance> {
  try {
    const result = await pool.query(
      `INSERT INTO program_resource_performance (
        program_id, resource_id, reporting_period,
        available_hours, billable_hours, tasks_assigned, tasks_completed,
        quality_score, rework_percentage, overall_performance, performance_score,
        manager_feedback, peer_feedback, self_assessment, reviewed_by, reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (program_id, resource_id, reporting_period) DO UPDATE SET
        available_hours = EXCLUDED.available_hours,
        billable_hours = EXCLUDED.billable_hours,
        tasks_assigned = EXCLUDED.tasks_assigned,
        tasks_completed = EXCLUDED.tasks_completed,
        quality_score = EXCLUDED.quality_score,
        rework_percentage = EXCLUDED.rework_percentage,
        overall_performance = EXCLUDED.overall_performance,
        performance_score = EXCLUDED.performance_score,
        manager_feedback = EXCLUDED.manager_feedback,
        peer_feedback = EXCLUDED.peer_feedback,
        self_assessment = EXCLUDED.self_assessment,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        updated_at = NOW()
      RETURNING 
        id, program_id as "programId", resource_id as "resourceId",
        reporting_period as "reportingPeriod", available_hours as "availableHours",
        billable_hours as "billableHours", utilization_rate as "utilizationRate",
        tasks_assigned as "tasksAssigned", tasks_completed as "tasksCompleted",
        completion_rate as "completionRate", quality_score as "qualityScore",
        rework_percentage as "reworkPercentage",
        overall_performance as "overallPerformance", performance_score as "performanceScore",
        manager_feedback as "managerFeedback", peer_feedback as "peerFeedback",
        self_assessment as "selfAssessment", reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        performance.programId,
        performance.resourceId,
        performance.reportingPeriod,
        performance.availableHours || null,
        performance.billableHours || null,
        performance.tasksAssigned || 0,
        performance.tasksCompleted || 0,
        performance.qualityScore || null,
        performance.reworkPercentage || 0,
        performance.overallPerformance || null,
        performance.performanceScore || null,
        performance.managerFeedback || null,
        performance.peerFeedback ? JSON.stringify(performance.peerFeedback) : null,
        performance.selfAssessment || null,
        performance.reviewedBy || null,
        performance.reviewedAt || null
      ]
    )

    logger.info('[RESOURCE] Upserted resource performance', {
      performanceId: result.rows[0].id,
      programId: performance.programId,
      resourceId: performance.resourceId
    })

    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to upsert resource performance', { error: error.message, performance })
    throw error
  }
}

/**
 * Get resource utilization summary
 */
export async function getResourceUtilizationSummary(programId: string): Promise<ResourceUtilizationSummary | null> {
  try {
    const result = await pool.query(
      `SELECT 
        program_id as "programId", avg_utilization as "avgUtilization",
        over_utilized_count as "overUtilizedCount",
        under_utilized_count as "underUtilizedCount",
        optimal_count as "optimalCount", total_resources as "totalResources",
        utilization_status as "utilizationStatus"
      FROM program_resource_utilization_summary
      WHERE program_id = $1
      `,
      [programId]
    )

    return result.rows[0] || null
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource utilization summary', { error: error.message, programId })
    throw error
  }
}

// ================================================================
// RESOURCE RISKS
// ================================================================

/**
 * Create resource risk
 */
export async function createResourceRisk(
  risk: Omit<ResourceRisk, 'id' | 'createdAt' | 'updatedAt' | 'riskScore'>,
  userId: string
): Promise<ResourceRisk> {
  try {
    // Calculate risk score from probability and impact
    const probabilityScores: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'very-high': 4
    }
    const impactScores: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    }
    const riskScore = (probabilityScores[risk.probability || 'low'] || 1) * 
                      (impactScores[risk.impact || 'low'] || 1)

    const result = await pool.query(
      `INSERT INTO program_resource_risks (
        program_id, resource_id, risk_title, risk_description, risk_category,
        probability, impact, risk_score, mitigation_plan, mitigation_status,
        mitigation_owner_id, risk_status, identified_date, mitigation_due_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING 
        id, program_id as "programId", resource_id as "resourceId",
        risk_title as "riskTitle", risk_description as "riskDescription",
        risk_category as "riskCategory", probability, impact, risk_score as "riskScore",
        mitigation_plan as "mitigationPlan", mitigation_status as "mitigationStatus",
        mitigation_owner_id as "mitigationOwnerId", risk_status as "riskStatus",
        identified_date as "identifiedDate", mitigation_due_date as "mitigationDueDate",
        resolved_date as "resolvedDate", created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        risk.programId,
        risk.resourceId || null,
        risk.riskTitle,
        risk.riskDescription || null,
        risk.riskCategory || null,
        risk.probability || 'low',
        risk.impact || 'low',
        riskScore,
        risk.mitigationPlan || null,
        risk.mitigationStatus || 'planned',
        risk.mitigationOwnerId || null,
        risk.riskStatus || 'open',
        risk.identifiedDate || new Date(),
        risk.mitigationDueDate || null,
        userId
      ]
    )

    logger.info('[RESOURCE] Created resource risk', {
      riskId: result.rows[0].id,
      programId: risk.programId,
      riskTitle: risk.riskTitle
    })

    return result.rows[0]
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to create resource risk', { error: error.message, risk })
    throw error
  }
}

/**
 * Get resource risks for a program
 */
export async function getResourceRisks(
  programId: string,
  filters?: {
    riskStatus?: string
    riskCategory?: string
    resourceId?: string
  }
): Promise<ResourceRisk[]> {
  try {
    let query = `
      SELECT 
        id, program_id as "programId", resource_id as "resourceId",
        risk_title as "riskTitle", risk_description as "riskDescription",
        risk_category as "riskCategory", probability, impact, risk_score as "riskScore",
        mitigation_plan as "mitigationPlan", mitigation_status as "mitigationStatus",
        mitigation_owner_id as "mitigationOwnerId", risk_status as "riskStatus",
        identified_date as "identifiedDate", mitigation_due_date as "mitigationDueDate",
        resolved_date as "resolvedDate", created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM program_resource_risks
      WHERE program_id = $1
    `
    const params: any[] = [programId]
    let paramCount = 1

    if (filters?.riskStatus) {
      paramCount++
      query += ` AND risk_status = $${paramCount}`
      params.push(filters.riskStatus)
    }

    if (filters?.riskCategory) {
      paramCount++
      query += ` AND risk_category = $${paramCount}`
      params.push(filters.riskCategory)
    }

    if (filters?.resourceId) {
      paramCount++
      query += ` AND resource_id = $${paramCount}`
      params.push(filters.resourceId)
    }

    query += ` ORDER BY risk_score DESC, identified_date DESC`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource risks', { error: error.message, programId })
    throw error
  }
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Detect and update resource conflicts for a program
 */
export async function detectConflicts(programId: string): Promise<number> {
  try {
    const result = await pool.query('SELECT detect_resource_conflicts($1) as conflict_count', [programId])
    const conflictCount = parseInt(result.rows[0].conflict_count, 10)
    
    logger.info('[RESOURCE] Detected resource conflicts', { programId, conflictCount })
    return conflictCount
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to detect conflicts', { error: error.message, programId })
    throw error
  }
}

/**
 * Get resource demand summary (from view)
 */
export async function getResourceDemand(programId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        program_id as "programId", resource_type as "resourceType",
        total_demand as "totalDemand", earliest_need as "earliestNeed",
        latest_need as "latestNeed", requirement_count as "requirementCount"
      FROM program_resource_demand
      WHERE program_id = $1
      ORDER BY resource_type
      `,
      [programId]
    )

    return result.rows
  } catch (error: any) {
    logger.error('[RESOURCE] Failed to get resource demand', { error: error.message, programId })
    throw error
  }
}

