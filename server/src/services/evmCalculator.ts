/**
 * EVM (Earned Value Management) Calculator Service
 * 
 * Calculates standard EVM metrics according to PMI PMBOK standards:
 * - PV (Planned Value): Budgeted cost of work scheduled
 * - EV (Earned Value): Budgeted cost of work performed  
 * - AC (Actual Cost): Actual cost of work performed
 * - Variance metrics (SV, CV)
 * - Performance indices (SPI, CPI)
 * - Forecasting metrics (EAC, ETC, VAC, TCPI)
 * 
 * Reference: PMBOK 8, Cost Management Knowledge Area
 * Migration: 204_program_evm_performance.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface EVMMetrics {
  // Base Metrics
  PV: number          // Planned Value (budgeted for work scheduled)
  EV: number          // Earned Value (budgeted for work performed)
  AC: number          // Actual Cost (actual cost of work performed)
  
  // Variances
  SV: number          // Schedule Variance = EV - PV (positive = ahead, negative = behind)
  CV: number          // Cost Variance = EV - AC (positive = under budget, negative = over)
  
  // Performance Indices
  SPI: number         // Schedule Performance Index = EV / PV (>1.0 = ahead, <1.0 = behind)
  CPI: number         // Cost Performance Index = EV / AC (>1.0 = under budget, <1.0 = over)
  
  // Forecasts
  BAC: number         // Budget at Completion (original approved budget)
  EAC: number         // Estimate at Completion = BAC / CPI
  ETC: number         // Estimate to Complete = EAC - AC
  VAC: number         // Variance at Completion = BAC - EAC
  
  // To-Complete Performance Index
  TCPI: number        // Performance efficiency required to meet budget
  TCPI_EAC: number    // Performance efficiency required to meet EAC
  
  // Status
  performanceStatus: 'on-track' | 'at-risk' | 'critical' | 'unknown'
  
  // Metadata
  reportingDate: Date
  programId: string
}

export interface ProjectEVMData {
  projectId: string
  projectName: string
  plannedValue: number
  earnedValue: number
  actualCost: number
  budget: number
  percentComplete: number
}

/**
 * Calculate EVM metrics for a program by aggregating project data
 */
export async function calculateEVMMetrics(
  programId: string,
  reportingDate: Date = new Date()
): Promise<EVMMetrics> {
  try {
    // Aggregate EVM data from all active projects in the program
    const projectData = await getProjectEVMData(programId)
    
    // Sum up the metrics
    const PV = projectData.reduce((sum, p) => sum + p.plannedValue, 0)
    const EV = projectData.reduce((sum, p) => sum + p.earnedValue, 0)
    const AC = projectData.reduce((sum, p) => sum + p.actualCost, 0)
    const BAC = projectData.reduce((sum, p) => sum + p.budget, 0)
    
    // Calculate variances
    const SV = EV - PV
    const CV = EV - AC
    
    // Calculate performance indices (avoid division by zero)
    const SPI = PV > 0 ? EV / PV : 0
    const CPI = AC > 0 ? EV / AC : 0
    
    // Calculate forecasts
    const EAC = CPI > 0 ? BAC / CPI : BAC
    const ETC = EAC - AC
    const VAC = BAC - EAC
    
    // Calculate To-Complete Performance Index
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 0
    const TCPI_EAC = (EAC - AC) > 0 ? (BAC - EV) / (EAC - AC) : 0
    
    // Determine performance status
    const performanceStatus = determinePerformanceStatus(CPI, SPI)
    
    const metrics: EVMMetrics = {
      PV: round(PV, 2),
      EV: round(EV, 2),
      AC: round(AC, 2),
      SV: round(SV, 2),
      CV: round(CV, 2),
      SPI: round(SPI, 4),
      CPI: round(CPI, 4),
      BAC: round(BAC, 2),
      EAC: round(EAC, 2),
      ETC: round(ETC, 2),
      VAC: round(VAC, 2),
      TCPI: round(TCPI, 4),
      TCPI_EAC: round(TCPI_EAC, 4),
      performanceStatus,
      reportingDate,
      programId
    }
    
    logger.info('EVM metrics calculated', {
      programId,
      projectCount: projectData.length,
      CPI: metrics.CPI,
      SPI: metrics.SPI,
      status: performanceStatus
    })
    
    return metrics
    
  } catch (error) {
    logger.error('calculateEVMMetrics error', { error, programId })
    throw error
  }
}

/**
 * Get EVM data for all projects in a program
 */
async function getProjectEVMData(programId: string): Promise<ProjectEVMData[]> {
  const result = await pool.query(
    `SELECT 
      id as "projectId",
      name as "projectName",
      COALESCE(planned_value, 0) as "plannedValue",
      COALESCE(earned_value, 0) as "earnedValue",
      COALESCE(actual_cost, 0) as "actualCost",
      COALESCE(budget, 0) as budget,
      COALESCE(percent_complete, 0) as "percentComplete"
    FROM projects
    WHERE program_id = $1 
      AND archived = false
    ORDER BY name`,
    [programId]
  )
  
  return result.rows
}

/**
 * Determine performance status based on CPI and SPI thresholds
 */
function determinePerformanceStatus(
  CPI: number,
  SPI: number
): 'on-track' | 'at-risk' | 'critical' | 'unknown' {
  if (CPI === 0 && SPI === 0) {
    return 'unknown'
  }
  
  // On track: Both indices >= 0.95
  if (CPI >= 0.95 && SPI >= 0.95) {
    return 'on-track'
  }
  
  // At risk: At least one index between 0.85 and 0.95
  if (CPI >= 0.85 || SPI >= 0.85) {
    return 'at-risk'
  }
  
  // Critical: Both indices < 0.85
  return 'critical'
}

/**
 * Update earned value for a project based on completion percentage
 */
export async function updateProjectEarnedValue(
  projectId: string,
  percentComplete: number
): Promise<void> {
  try {
    // Validate percent complete
    if (percentComplete < 0 || percentComplete > 100) {
      throw new Error('Percent complete must be between 0 and 100')
    }
    
    // Get project budget
    const result = await pool.query(
      'SELECT budget FROM projects WHERE id = $1',
      [projectId]
    )
    
    if (result.rows.length === 0) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    const budget = result.rows[0].budget || 0
    const earnedValue = (budget * percentComplete) / 100
    
    // Update project
    await pool.query(
      `UPDATE projects 
       SET earned_value = $1,
           percent_complete = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [earnedValue, percentComplete, projectId]
    )
    
    logger.info('Project earned value updated', {
      projectId,
      budget,
      percentComplete,
      earnedValue
    })
    
  } catch (error) {
    logger.error('updateProjectEarnedValue error', { error, projectId, percentComplete })
    throw error
  }
}

/**
 * Save EVM metrics to database for historical tracking
 */
export async function saveEVMMetrics(metrics: EVMMetrics): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO program_cost_performance (
        program_id,
        reporting_date,
        planned_value,
        earned_value,
        actual_cost,
        schedule_variance,
        cost_variance,
        schedule_performance_index,
        cost_performance_index,
        budget_at_completion,
        estimate_at_completion,
        estimate_to_complete,
        variance_at_completion,
        tcpi_bac,
        tcpi_eac,
        performance_status,
        calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (program_id, reporting_date)
      DO UPDATE SET
        planned_value = EXCLUDED.planned_value,
        earned_value = EXCLUDED.earned_value,
        actual_cost = EXCLUDED.actual_cost,
        schedule_variance = EXCLUDED.schedule_variance,
        cost_variance = EXCLUDED.cost_variance,
        schedule_performance_index = EXCLUDED.schedule_performance_index,
        cost_performance_index = EXCLUDED.cost_performance_index,
        budget_at_completion = EXCLUDED.budget_at_completion,
        estimate_at_completion = EXCLUDED.estimate_at_completion,
        estimate_to_complete = EXCLUDED.estimate_to_complete,
        variance_at_completion = EXCLUDED.variance_at_completion,
        tcpi_bac = EXCLUDED.tcpi_bac,
        tcpi_eac = EXCLUDED.tcpi_eac,
        performance_status = EXCLUDED.performance_status,
        updated_at = NOW()
      RETURNING id`,
      [
        metrics.programId,
        metrics.reportingDate,
        metrics.PV,
        metrics.EV,
        metrics.AC,
        metrics.SV,
        metrics.CV,
        metrics.SPI,
        metrics.CPI,
        metrics.BAC,
        metrics.EAC,
        metrics.ETC,
        metrics.VAC,
        metrics.TCPI,
        metrics.TCPI_EAC,
        metrics.performanceStatus
      ]
    )
    
    const recordId = result.rows[0].id
    
    logger.info('EVM metrics saved', {
      programId: metrics.programId,
      reportingDate: metrics.reportingDate,
      recordId
    })
    
    return recordId
    
  } catch (error) {
    logger.error('saveEVMMetrics error', { error, programId: metrics.programId })
    throw error
  }
}

/**
 * Get historical EVM metrics for trend analysis
 */
export async function getHistoricalEVMMetrics(
  programId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 12
): Promise<EVMMetrics[]> {
  try {
    let query = `
      SELECT 
        program_id as "programId",
        reporting_date as "reportingDate",
        planned_value as "PV",
        earned_value as "EV",
        actual_cost as "AC",
        schedule_variance as "SV",
        cost_variance as "CV",
        schedule_performance_index as "SPI",
        cost_performance_index as "CPI",
        budget_at_completion as "BAC",
        estimate_at_completion as "EAC",
        estimate_to_complete as "ETC",
        variance_at_completion as "VAC",
        tcpi_bac as "TCPI",
        tcpi_eac as "TCPI_EAC",
        performance_status as "performanceStatus"
      FROM program_cost_performance
      WHERE program_id = $1`
    
    const params: any[] = [programId]
    let paramIndex = 2
    
    if (startDate) {
      query += ` AND reporting_date >= $${paramIndex++}`
      params.push(startDate)
    }
    
    if (endDate) {
      query += ` AND reporting_date <= $${paramIndex++}`
      params.push(endDate)
    }
    
    query += ` ORDER BY reporting_date DESC LIMIT $${paramIndex}`
    params.push(limit)
    
    const result = await pool.query(query, params)
    
    return result.rows
    
  } catch (error) {
    logger.error('getHistoricalEVMMetrics error', { error, programId })
    throw error
  }
}

/**
 * Helper function to round numbers to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Get EVM health status color for UI
 */
export function getEVMHealthColor(
  metric: 'CPI' | 'SPI',
  value: number
): 'green' | 'amber' | 'red' {
  if (value >= 0.95) return 'green'
  if (value >= 0.85) return 'amber'
  return 'red'
}

/**
 * Get interpretation text for EVM metrics
 */
export function interpretEVMMetric(metric: string, value: number): string {
  switch (metric) {
    case 'CPI':
      if (value > 1.0) return `Under budget by ${((value - 1) * 100).toFixed(1)}%`
      if (value < 1.0) return `Over budget by ${((1 - value) * 100).toFixed(1)}%`
      return 'On budget'
      
    case 'SPI':
      if (value > 1.0) return `Ahead of schedule by ${((value - 1) * 100).toFixed(1)}%`
      if (value < 1.0) return `Behind schedule by ${((1 - value) * 100).toFixed(1)}%`
      return 'On schedule'
      
    case 'TCPI':
      if (value > 1.0) return `Need ${((value - 1) * 100).toFixed(1)}% efficiency improvement`
      if (value < 1.0) return `Can maintain current performance`
      return 'Maintain current performance'
      
    default:
      return ''
  }
}

