import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { cache } from "../utils/redis"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * Calculate cache key for program metrics
 */
function getCacheKey(programId: string): string {
  return `program:metrics:${programId}`
}

/**
 * Calculate overall RAG status from project statuses
 * red > amber > green
 */
function calculateOverallStatus(projectStatuses: string[]): string {
  if (!projectStatuses || projectStatuses.length === 0) {
    return 'green'
  }
  
  if (projectStatuses.includes('red')) return 'red'
  if (projectStatuses.includes('amber')) return 'amber'
  return 'green'
}

/**
 * Get budget metrics for a program
 */
export async function getBudgetMetrics(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(actual_cost), 0) as total_spent
      FROM projects
      WHERE program_id = $1
      `,
      [programId]
    )

    const totalBudget = parseFloat(result.rows[0]?.total_budget || '0')
    const totalSpent = parseFloat(result.rows[0]?.total_spent || '0')
    const remaining = totalBudget - totalSpent
    const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    return {
      total: totalBudget,
      spent: totalSpent,
      remaining,
      percentSpent: Math.round(percentSpent * 100) / 100
    }
  } catch (error) {
    logger.error('Error getting budget metrics:', error)
    throw error
  }
}

/**
 * Get schedule metrics for a program
 */
export async function getScheduleMetrics(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        MIN(start_date) AS min_start_date,
        MAX(end_date) AS max_end_date
      FROM projects
      WHERE program_id = $1
        AND start_date IS NOT NULL
        AND end_date IS NOT NULL
      `,
      [programId]
    )

    const minStart = result.rows[0]?.min_start_date
    const maxEnd = result.rows[0]?.max_end_date

    if (!minStart || !maxEnd) {
      return {
        totalDays: 0,
        daysElapsed: 0,
        percentComplete: 0
      }
    }

    // Get earliest start and latest end
    const startDate = new Date(minStart)
    const endDate = new Date(maxEnd)
    const now = new Date()

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const percentComplete = totalDays > 0 ? Math.min((daysElapsed / totalDays) * 100, 100) : 0

    return {
      totalDays: Math.max(totalDays, 0),
      daysElapsed: Math.max(daysElapsed, 0),
      percentComplete: Math.round(percentComplete * 100) / 100
    }
  } catch (error) {
    logger.error('Error getting schedule metrics:', error)
    throw error
  }
}

/**
 * Get risk metrics for a program
 */
export async function getRiskMetrics(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        COALESCE(r.severity, 'low') as severity,
        COUNT(*) as count
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      WHERE p.program_id = $1
      GROUP BY r.severity
      `,
      [programId]
    )

    const riskCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    result.rows.forEach(row => {
      const severity = row.severity.toLowerCase()
      if (severity in riskCounts) {
        riskCounts[severity as keyof typeof riskCounts] = parseInt(row.count)
      }
    })

    const total = Object.values(riskCounts).reduce((sum, count) => sum + count, 0)

    return {
      total,
      ...riskCounts
    }
  } catch (error) {
    logger.error('Error getting risk metrics:', error)
    throw error
  }
}

/**
 * Get RAG status for a program
 */
export async function getRAGStatus(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        status,
        COUNT(*) as count
      FROM projects
      WHERE program_id = $1
      GROUP BY status
      `,
      [programId]
    )

    const breakdown = {
      green: 0,
      amber: 0,
      red: 0
    }

    const statusSet: Set<string> = new Set()

    result.rows.forEach(row => {
      const status = row.status?.toLowerCase() || 'green'
      if (status in breakdown) {
        breakdown[status as keyof typeof breakdown] = parseInt(row.count)
        // Add status to set for overall calculation
        statusSet.add(status)
      }
    })

    const overall = calculateOverallStatus(Array.from(statusSet))

    return {
      overall,
      breakdown
    }
  } catch (error) {
    logger.error('Error getting RAG status:', error)
    throw error
  }
}

/**
 * Get project count metrics
 */
async function getProjectMetrics(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('in_progress', 'active')) as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM projects
      WHERE program_id = $1
      `,
      [programId]
    )

    return {
      total: parseInt(result.rows[0]?.total || '0'),
      active: parseInt(result.rows[0]?.active || '0'),
      completed: parseInt(result.rows[0]?.completed || '0')
    }
  } catch (error) {
    logger.error('Error getting project metrics:', error)
    throw error
  }
}

/**
 * Calculate all metrics for a program
 */
export async function calculateMetrics(programId: string) {
  try {
    // Check cache first
    const cacheKey = getCacheKey(programId)
    const cached = await cache.get(cacheKey)
    
    if (cached) {
      logger.info(`Cache hit for program metrics: ${programId}`)
      return {
        ...cached,
        cached: true
      }
    }

    logger.info(`Calculating metrics for program: ${programId}`)

    // Calculate all metrics in parallel
    const [budget, schedule, status, risks, projects] = await Promise.all([
      getBudgetMetrics(programId),
      getScheduleMetrics(programId),
      getRAGStatus(programId),
      getRiskMetrics(programId),
      getProjectMetrics(programId)
    ])

    const metrics = {
      programId,
      budget,
      schedule,
      status,
      risks,
      projects,
      lastCalculated: new Date().toISOString(),
      cached: false
    }

    // Cache the results
    await cache.set(cacheKey, metrics, CACHE_TTL)
    logger.info(`Cached metrics for program: ${programId}`)

    return metrics
  } catch (error) {
    logger.error('Error calculating program metrics:', error)
    throw error
  }
}

/**
 * Invalidate cache for a program's metrics
 */
export async function invalidateCache(programId: string) {
  try {
    const cacheKey = getCacheKey(programId)
    await cache.del(cacheKey)
    logger.info(`Invalidated cache for program: ${programId}`)
    return true
  } catch (error) {
    logger.error('Error invalidating cache:', error)
    return false
  }
}
