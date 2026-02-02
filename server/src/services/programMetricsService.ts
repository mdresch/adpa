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
    // Get total budget and actual cost
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

    const planned = parseFloat(result.rows[0]?.total_budget || '0')
    const actual = parseFloat(result.rows[0]?.total_spent || '0')
    const forecast = actual // Use actual as forecast for now
    const variance = planned - actual

    // Generate timeline data (last 6 months)
    const timeline: Array<{ month: string; planned: number; actual: number; forecast?: number }> = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      // Distribute budget and actual across months proportionally
      const monthPlanned = planned / 6
      const monthActual = actual / 6
      
      timeline.push({
        month: monthName,
        planned: monthPlanned,
        actual: monthActual,
        forecast: i === 0 ? forecast / 6 : undefined // Only show forecast for current month
      })
    }

    return {
      planned,
      actual,
      forecast,
      variance,
      timeline
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
 * Returns an array of risk objects for visualization
 */
export async function getRiskMetrics(programId: string) {
  try {
    const result = await pool.query(
      `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.risk_level,
        r.probability,
        r.impact,
        r.category,
        r.mitigation_strategy,
        r.owner,
        p.id as project_id,
        p.name as project_name
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      WHERE p.program_id = $1
      ORDER BY 
        CASE r.risk_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        r.probability DESC,
        r.impact DESC
      `,
      [programId]
    )

    // Transform database rows to Risk interface format
    const risks = result.rows.map((row: any) => {
      // Map risk_level to severity (frontend expects 'critical' | 'high' | 'medium' | 'low')
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
      const riskLevel = row.risk_level?.toLowerCase() || 'low'
      if (riskLevel === 'critical') {
        severity = 'critical'
      } else if (riskLevel === 'high') {
        severity = 'high'
      } else if (riskLevel === 'medium') {
        severity = 'medium'
      } else if (riskLevel === 'low') {
        severity = 'low'
      }

      // Convert probability to number (0-100) if it's stored as string
      let probability = 50 // default
      if (typeof row.probability === 'number') {
        probability = row.probability
      } else if (typeof row.probability === 'string') {
        const probMap: Record<string, number> = { 'high': 75, 'medium': 50, 'low': 25 }
        probability = probMap[row.probability.toLowerCase()] || 50
      }

      // Convert impact to number (dollar amount) if it's stored as string
      let impact = 0 // default
      if (typeof row.impact === 'number') {
        impact = row.impact
      } else if (typeof row.impact === 'string') {
        const impactMap: Record<string, number> = { 'high': 1000000, 'medium': 500000, 'low': 100000 }
        impact = impactMap[row.impact.toLowerCase()] || 0
      }

      return {
        id: row.id,
        title: row.title || 'Untitled Risk',
        description: row.description || '',
        probability,
        impact,
        severity,
        projectId: row.project_id,
        projectName: row.project_name
      }
    })

    return risks
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
    let total = 0

    result.rows.forEach(row => {
      const status = row.status?.toLowerCase() || 'green'
      const count = parseInt(row.count) || 0
      total += count
      if (status in breakdown) {
        breakdown[status as keyof typeof breakdown] = count
        // Add status to set for overall calculation
        statusSet.add(status)
      }
    })

    const overall = calculateOverallStatus(Array.from(statusSet))

    return {
      overall,
      total,
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
 * Get milestone metrics for a program
 * Aggregates milestones from all projects in the program
 */
async function getMilestoneMetrics(programId: string) {
  try {
    // Query milestones table - milestones are stored with 'due_date' column (not planned_date/actual_date)
    const result = await pool.query(
      `
      SELECT 
        m.id,
        m.name,
        m.description,
        m.due_date,
        m.status,
        m.project_id,
        m.updated_at,
        m.due_date as actual_date
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE p.program_id = $1
        AND m.deleted_at IS NULL
      ORDER BY m.due_date ASC
      `,
      [programId]
    )

    const milestones = result.rows.map((row: any) => {
      const plannedDate = row.due_date
      const today = new Date()
      const planned = plannedDate ? new Date(plannedDate) : today

      // Map database status to frontend status
      // DB: planned, in_progress, completed, delayed
      // Frontend: completed, on-track, overdue
      let status: 'completed' | 'on-track' | 'overdue' = 'on-track'
      if (row.status === 'completed') {
        status = 'completed'
      } else if (row.status === 'delayed' || (planned < today && row.status !== 'completed')) {
        status = 'overdue'
      } else {
        status = 'on-track'
      }

      // Use actual_date if available, otherwise use updated_at for completed milestones, fallback to planned date
      let actualDate: string | undefined = undefined
      if (row.status === 'completed') {
        if (row.actual_date) {
          actualDate = new Date(row.actual_date).toISOString()
        } else if (row.updated_at) {
          actualDate = new Date(row.updated_at).toISOString()
        } else if (plannedDate) {
          actualDate = new Date(plannedDate).toISOString()
        }
      }

      return {
        id: row.id,
        name: row.name || 'Unnamed Milestone',
        plannedDate: plannedDate ? new Date(plannedDate).toISOString() : new Date().toISOString(),
        actualDate,
        status
      }
    })

    logger.info(`[METRICS] Found ${milestones.length} milestones for program ${programId}`)
    return milestones
  } catch (error: any) {
    // If milestones table doesn't exist or query fails, return empty array
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      logger.info('Milestones table does not exist, returning empty array')
    } else {
      logger.warn('Error getting milestone metrics:', error)
    }
    return []
  }
}

/**
 * Calculate all metrics for a program
 */
export async function calculateMetrics(programId: string) {
  try {
    // Check cache first (with error handling)
    const cacheKey = getCacheKey(programId)
    let cached = null
    
    try {
      cached = await cache.get(cacheKey)
      if (cached) {
        logger.info(`Cache hit for program metrics: ${programId}`)
        return {
          ...cached,
          cached: true
        }
      }
    } catch (cacheError) {
      logger.warn('Cache get failed, continuing without cache:', cacheError)
    }

    logger.info(`Calculating metrics for program: ${programId}`)

    // Calculate all metrics in parallel
    const [budget, schedule, status, risks, projects, milestones] = await Promise.all([
      getBudgetMetrics(programId),
      getScheduleMetrics(programId),
      getRAGStatus(programId),
      getRiskMetrics(programId),
      getProjectMetrics(programId),
      getMilestoneMetrics(programId)
    ])

    // Ensure status.total is set from projects.total if not already set
    const statusWithTotal = {
      ...status,
      total: status.total || projects.total || 0
    }

    const metrics = {
      programId,
      budget,
      schedule,
      status: statusWithTotal,
      risks,
      milestones,
      projects,
      lastCalculated: new Date().toISOString(),
      cached: false
    }

    // Cache the results (with error handling)
    try {
      await cache.set(cacheKey, metrics, CACHE_TTL)
      logger.info(`Cached metrics for program: ${programId}`)
    } catch (cacheError) {
      logger.warn('Cache set failed, continuing without caching:', cacheError)
    }

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
