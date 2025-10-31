/**
 * Cost Category Management Service
 * 
 * Manages dynamic, configurable cost categories for project budgeting
 * Similar to Dynamics 365 Project Operations category management
 * 
 * Features:
 * - Create, Read, Update, Archive cost categories
 * - Reorder categories for display
 * - System vs custom categories
 * - Category types: labor, material, service, equipment, overhead
 * 
 * Migration: 206_cost_management_system.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface CostCategory {
  id: string
  organizationId?: string
  name: string
  description?: string
  categoryCode: string
  categoryType: 'labor' | 'material' | 'service' | 'equipment' | 'overhead' | 'other'
  isLaborCategory: boolean
  requiresTimeTracking: boolean
  defaultPercentage?: number
  isMandatory: boolean
  displayOrder: number
  icon?: string
  color?: string
  isActive: boolean
  isSystemCategory: boolean
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
  archivedAt?: Date
}

export interface CreateCostCategoryInput {
  name: string
  description?: string
  categoryCode: string
  categoryType: 'labor' | 'material' | 'service' | 'equipment' | 'overhead' | 'other'
  isLaborCategory?: boolean
  requiresTimeTracking?: boolean
  defaultPercentage?: number
  isMandatory?: boolean
  icon?: string
  color?: string
}

/**
 * Get all active cost categories
 */
export async function getAllCostCategories(includeArchived: boolean = false): Promise<CostCategory[]> {
  try {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        name,
        description,
        category_code as "categoryCode",
        category_type as "categoryType",
        is_labor_category as "isLaborCategory",
        requires_time_tracking as "requiresTimeTracking",
        default_percentage as "defaultPercentage",
        is_mandatory as "isMandatory",
        display_order as "displayOrder",
        icon,
        color,
        is_active as "isActive",
        is_system_category as "isSystemCategory",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        archived_at as "archivedAt"
      FROM cost_categories
      ${includeArchived ? '' : 'WHERE is_active = TRUE'}
      ORDER BY display_order ASC, name ASC
    `
    
    const result = await pool.query(query)
    
    logger.info('Retrieved cost categories', { count: result.rows.length, includeArchived })
    
    return result.rows
  } catch (error) {
    logger.error('getAllCostCategories error', { error })
    throw error
  }
}

/**
 * Get cost category by ID
 */
export async function getCostCategoryById(id: string): Promise<CostCategory | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        organization_id as "organizationId",
        name,
        description,
        category_code as "categoryCode",
        category_type as "categoryType",
        is_labor_category as "isLaborCategory",
        requires_time_tracking as "requiresTimeTracking",
        default_percentage as "defaultPercentage",
        is_mandatory as "isMandatory",
        display_order as "displayOrder",
        icon,
        color,
        is_active as "isActive",
        is_system_category as "isSystemCategory",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM cost_categories
      WHERE id = $1`,
      [id]
    )
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('getCostCategoryById error', { error, id })
    throw error
  }
}

/**
 * Create new cost category
 */
export async function createCostCategory(
  input: CreateCostCategoryInput,
  userId: string
): Promise<CostCategory> {
  try {
    const result = await pool.query(
      `INSERT INTO cost_categories (
        name,
        description,
        category_code,
        category_type,
        is_labor_category,
        requires_time_tracking,
        default_percentage,
        is_mandatory,
        icon,
        color,
        display_order,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM cost_categories),
        $11)
      RETURNING 
        id,
        name,
        category_code as "categoryCode",
        category_type as "categoryType",
        is_labor_category as "isLaborCategory",
        requires_time_tracking as "requiresTimeTracking",
        display_order as "displayOrder"`,
      [
        input.name,
        input.description,
        input.categoryCode,
        input.categoryType,
        input.isLaborCategory || false,
        input.requiresTimeTracking || false,
        input.defaultPercentage,
        input.isMandatory || false,
        input.icon,
        input.color,
        userId
      ]
    )
    
    const category = result.rows[0]
    
    logger.info('Cost category created', {
      categoryId: category.id,
      name: input.name,
      type: input.categoryType
    })
    
    return category
  } catch (error) {
    logger.error('createCostCategory error', { error, input })
    throw error
  }
}

/**
 * Update cost category
 */
export async function updateCostCategory(
  id: string,
  updates: Partial<CreateCostCategoryInput>
): Promise<CostCategory | null> {
  try {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`)
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`)
      values.push(updates.description)
    }
    if (updates.categoryType !== undefined) {
      setClauses.push(`category_type = $${paramIndex++}`)
      values.push(updates.categoryType)
    }
    if (updates.defaultPercentage !== undefined) {
      setClauses.push(`default_percentage = $${paramIndex++}`)
      values.push(updates.defaultPercentage)
    }
    if (updates.icon !== undefined) {
      setClauses.push(`icon = $${paramIndex++}`)
      values.push(updates.icon)
    }
    if (updates.color !== undefined) {
      setClauses.push(`color = $${paramIndex++}`)
      values.push(updates.color)
    }
    
    if (setClauses.length === 0) {
      return getCostCategoryById(id)
    }
    
    setClauses.push(`updated_at = NOW()`)
    values.push(id)
    
    const query = `
      UPDATE cost_categories 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await pool.query(query, values)
    
    logger.info('Cost category updated', { categoryId: id, updates })
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('updateCostCategory error', { error, id, updates })
    throw error
  }
}

/**
 * Archive cost category (soft delete)
 */
export async function archiveCostCategory(id: string): Promise<boolean> {
  try {
    // Check if it's a system category
    const category = await getCostCategoryById(id)
    if (category?.isSystemCategory) {
      throw new Error('Cannot archive system category')
    }
    
    await pool.query(
      `UPDATE cost_categories 
       SET is_active = FALSE,
           archived_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
    
    logger.info('Cost category archived', { categoryId: id })
    
    return true
  } catch (error) {
    logger.error('archiveCostCategory error', { error, id })
    throw error
  }
}

/**
 * Reorder cost categories
 */
export async function reorderCostCategories(categoryOrders: { id: string; order: number }[]): Promise<boolean> {
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      for (const item of categoryOrders) {
        await client.query(
          'UPDATE cost_categories SET display_order = $1, updated_at = NOW() WHERE id = $2',
          [item.order, item.id]
        )
      }
      
      await client.query('COMMIT')
      
      logger.info('Cost categories reordered', { count: categoryOrders.length })
      
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    logger.error('reorderCostCategories error', { error })
    throw error
  }
}

/**
 * Get cost categories by type
 */
export async function getCostCategoriesByType(
  categoryType: string
): Promise<CostCategory[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM cost_categories 
       WHERE category_type = $1 AND is_active = TRUE
       ORDER BY display_order ASC`,
      [categoryType]
    )
    
    return result.rows
  } catch (error) {
    logger.error('getCostCategoriesByType error', { error, categoryType })
    throw error
  }
}

/**
 * Get labor categories (for time tracking)
 */
export async function getLaborCategories(): Promise<CostCategory[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM cost_categories 
       WHERE is_labor_category = TRUE AND is_active = TRUE
       ORDER BY display_order ASC`
    )
    
    return result.rows
  } catch (error) {
    logger.error('getLaborCategories error', { error })
    throw error
  }
}

