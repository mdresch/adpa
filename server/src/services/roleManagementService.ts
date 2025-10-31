/**
 * Role Management Service
 * 
 * Manages project roles and hourly rates for labor cost tracking
 * 
 * Features:
 * - CRUD operations for roles
 * - Rate management and history
 * - Role → Rate assignment
 * - Internal vs External role classification
 * 
 * Migration: 206_cost_management_system.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface ProjectRole {
  id: string
  roleName: string
  roleCode: string
  description?: string
  roleType: 'internal' | 'external' | 'contractor' | 'vendor'
  roleCategory?: string
  seniorityLevel?: string
  defaultHourlyRate: number
  currency: string
  rateEffectiveDate?: Date
  requiredSkills?: string[]
  certifications?: string[]
  displayOrder: number
  isActive: boolean
  isBillable: boolean
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateRoleInput {
  roleName: string
  roleCode: string
  description?: string
  roleType: 'internal' | 'external' | 'contractor' | 'vendor'
  roleCategory?: string
  seniorityLevel?: string
  defaultHourlyRate: number
  currency?: string
  requiredSkills?: string[]
  certifications?: string[]
  isBillable?: boolean
}

/**
 * Get all active roles
 */
export async function getAllRoles(includeInactive: boolean = false): Promise<ProjectRole[]> {
  try {
    const query = `
      SELECT 
        id,
        role_name as "roleName",
        role_code as "roleCode",
        description,
        role_type as "roleType",
        role_category as "roleCategory",
        seniority_level as "seniorityLevel",
        default_hourly_rate as "defaultHourlyRate",
        currency,
        rate_effective_date as "rateEffectiveDate",
        required_skills as "requiredSkills",
        certifications,
        display_order as "displayOrder",
        is_active as "isActive",
        is_billable as "isBillable",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM project_roles
      ${includeInactive ? '' : 'WHERE is_active = TRUE'}
      ORDER BY display_order ASC, role_name ASC
    `
    
    const result = await pool.query(query)
    
    logger.info('Retrieved roles', { count: result.rows.length })
    
    return result.rows
  } catch (error) {
    logger.error('getAllRoles error', { error })
    throw error
  }
}

/**
 * Get roles by type (internal, external, contractor)
 */
export async function getRolesByType(roleType: string): Promise<ProjectRole[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM project_roles 
       WHERE role_type = $1 AND is_active = TRUE
       ORDER BY display_order ASC`,
      [roleType]
    )
    
    return result.rows
  } catch (error) {
    logger.error('getRolesByType error', { error, roleType })
    throw error
  }
}

/**
 * Create new role
 */
export async function createRole(
  input: CreateRoleInput,
  userId: string
): Promise<ProjectRole> {
  try {
    const result = await pool.query(
      `INSERT INTO project_roles (
        role_name,
        role_code,
        description,
        role_type,
        role_category,
        seniority_level,
        default_hourly_rate,
        currency,
        required_skills,
        certifications,
        is_billable,
        display_order,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM project_roles),
        $12)
      RETURNING 
        id,
        role_name as "roleName",
        role_code as "roleCode",
        role_type as "roleType",
        default_hourly_rate as "defaultHourlyRate"`,
      [
        input.roleName,
        input.roleCode,
        input.description,
        input.roleType,
        input.roleCategory,
        input.seniorityLevel,
        input.defaultHourlyRate,
        input.currency || 'USD',
        input.requiredSkills,
        input.certifications,
        input.isBillable !== false,
        userId
      ]
    )
    
    const role = result.rows[0]
    
    logger.info('Role created', {
      roleId: role.id,
      name: input.roleName,
      rate: input.defaultHourlyRate
    })
    
    return role
  } catch (error) {
    logger.error('createRole error', { error, input })
    throw error
  }
}

/**
 * Update role
 */
export async function updateRole(
  id: string,
  updates: Partial<CreateRoleInput>
): Promise<ProjectRole | null> {
  try {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    const fieldMap: { [key: string]: string } = {
      roleName: 'role_name',
      description: 'description',
      defaultHourlyRate: 'default_hourly_rate',
      roleCategory: 'role_category',
      seniorityLevel: 'seniority_level',
      requiredSkills: 'required_skills',
      certifications: 'certifications',
      isBillable: 'is_billable'
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${paramIndex++}`)
        values.push(value)
      }
    })
    
    if (setClauses.length === 0) {
      return getAllRoles().then(roles => roles.find(r => r.id === id) || null)
    }
    
    // Update rate effective date if rate changed
    if (updates.defaultHourlyRate !== undefined) {
      setClauses.push(`rate_effective_date = CURRENT_DATE`)
    }
    
    setClauses.push(`updated_at = NOW()`)
    values.push(id)
    
    const query = `
      UPDATE project_roles 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await pool.query(query, values)
    
    logger.info('Role updated', { roleId: id, updates })
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('updateRole error', { error, id, updates })
    throw error
  }
}

/**
 * Archive role (soft delete)
 */
export async function archiveRole(id: string): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE project_roles 
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
    
    logger.info('Role archived', { roleId: id })
    
    return true
  } catch (error) {
    logger.error('archiveRole error', { error, id })
    throw error
  }
}

/**
 * Get roles with usage statistics
 */
export async function getRolesWithUsage(): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        pr.*,
        COUNT(DISTINCT pra.id) as assignment_count,
        COUNT(DISTINCT pra.user_id) as resource_count,
        COALESCE(SUM(pra.actual_hours), 0) as total_hours,
        COALESCE(SUM(pra.actual_cost), 0) as total_cost
      FROM project_roles pr
      LEFT JOIN project_resource_assignments pra ON pr.id = pra.role_id
      WHERE pr.is_active = TRUE
      GROUP BY pr.id
      ORDER BY pr.display_order ASC
    `)
    
    return result.rows
  } catch (error) {
    logger.error('getRolesWithUsage error', { error })
    throw error
  }
}

