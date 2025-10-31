/**
 * Program Financial Management Service
 * 
 * Handles:
 * - Budget development and rollup from projects
 * - Financial forecasting and reforecasting
 * - ROI, NPV, IRR calculations
 * - Benefits tracking and realization
 * - Financial reporting and analysis
 * 
 * Reference: PROGRAM_RESOURCE_COST_MANAGEMENT.md
 * Migrations: 203_program_financial_management.sql, 205_program_financial_analysis.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { calculateEVMMetrics, EVMMetrics } from './evmCalculator'

export interface ProgramFinancialSummary {
  programId: string
  programName: string
  
  // Budget
  totalBudget: number
  totalSpent: number
  totalForecast: number
  remainingBudget: number
  budgetUtilization: number  // Percentage
  
  // Breakdown
  laborBudget: number
  materialsBudget: number
  equipmentBudget: number
  overheadBudget: number
  contingencyBudget: number
  
  // Status
  budgetStatus: string
  approvedBy?: string
  approvedAt?: Date
  baselineDate?: Date
  
  // Project Count
  totalProjects: number
  activeProjects: number
}

export interface FinancialForecast {
  forecastId?: string
  programId: string
  forecastDate: Date
  forecastType: 'monthly' | 'quarterly' | 'reforecast' | 'baseline'
  
  // Forecasts
  forecastTotalCost: number
  forecastCompletionDate?: Date
  forecastBenefitRealization: number
  
  // Scenarios
  bestCaseCost?: number
  mostLikelyCost?: number
  worstCaseCost?: number
  
  // Variance
  varianceFromBaseline?: number
  variancePercentage?: number
  
  // Metadata
  assumptions?: string
  confidenceLevel?: number
  status: 'draft' | 'submitted' | 'approved'
}

export interface FinancialAnalysis {
  analysisId?: string
  programId: string
  analysisDate: Date
  
  // Costs
  totalInvestment: number
  sunkCosts: number
  remainingCosts: number
  
  // Benefits
  totalExpectedBenefits: number
  realizedBenefits: number
  projectedBenefits: number
  
  // Key Metrics
  roiPercent: number              // (Benefits - Costs) / Costs × 100
  npv: number                     // Net Present Value
  irrPercent: number              // Internal Rate of Return
  paybackPeriodMonths: number     // Time to break even
  benefitCostRatio: number        // Benefits / Costs
  
  // Decision Support
  continueRecommendation: boolean
  recommendationRationale?: string
}

/**
 * Get comprehensive financial summary for a program
 */
export async function getProgramFinancialSummary(
  programId: string
): Promise<ProgramFinancialSummary> {
  try {
    // Get program info
    const programResult = await pool.query(
      'SELECT id, name FROM programs WHERE id = $1',
      [programId]
    )
    
    if (programResult.rows.length === 0) {
      throw new Error(`Program not found: ${programId}`)
    }
    
    const program = programResult.rows[0]
    
    // Get aggregated financial data from projects
    const financialResult = await pool.query(
      `SELECT 
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(actual_cost), 0) as total_spent,
        COALESCE(SUM(forecast_cost), 0) as total_forecast,
        COALESCE(SUM(labor_cost), 0) as labor_budget,
        COALESCE(SUM(materials_cost), 0) as materials_budget,
        COALESCE(SUM(equipment_cost), 0) as equipment_budget,
        COALESCE(SUM(overhead_cost), 0) as overhead_budget,
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE archived = false) as active_projects
      FROM projects
      WHERE program_id = $1`,
      [programId]
    )
    
    const financial = financialResult.rows[0]
    
    const totalBudget = parseFloat(financial.total_budget) || 0
    const totalSpent = parseFloat(financial.total_spent) || 0
    const totalForecast = parseFloat(financial.total_forecast) || 0
    
    // Get latest budget record if exists
    const budgetResult = await pool.query(
      `SELECT 
        budget_status,
        contingency_budget,
        approved_by,
        approved_at,
        baseline_date
      FROM program_budgets
      WHERE program_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [programId]
    )
    
    const budgetRecord = budgetResult.rows[0] || {}
    
    const summary: ProgramFinancialSummary = {
      programId: program.id,
      programName: program.name,
      totalBudget,
      totalSpent,
      totalForecast: totalForecast || totalBudget, // Use budget if no forecast
      remainingBudget: totalBudget - totalSpent,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      laborBudget: parseFloat(financial.labor_budget) || 0,
      materialsBudget: parseFloat(financial.materials_budget) || 0,
      equipmentBudget: parseFloat(financial.equipment_budget) || 0,
      overheadBudget: parseFloat(financial.overhead_budget) || 0,
      contingencyBudget: parseFloat(budgetRecord.contingency_budget) || 0,
      budgetStatus: budgetRecord.budget_status || 'draft',
      approvedBy: budgetRecord.approved_by,
      approvedAt: budgetRecord.approved_at,
      baselineDate: budgetRecord.baseline_date,
      totalProjects: parseInt(financial.total_projects) || 0,
      activeProjects: parseInt(financial.active_projects) || 0
    }
    
    logger.info('Program financial summary retrieved', {
      programId,
      totalBudget: summary.totalBudget,
      budgetUtilization: summary.budgetUtilization
    })
    
    return summary
    
  } catch (error) {
    logger.error('getProgramFinancialSummary error', { error, programId })
    throw error
  }
}

/**
 * Create or update budget for a program
 */
export async function createProgramBudget(
  programId: string,
  fiscalYear: number,
  fiscalQuarter: number,
  userId?: string
): Promise<string> {
  try {
    // Calculate budget from projects
    const summary = await getProgramFinancialSummary(programId)
    
    const result = await pool.query(
      `INSERT INTO program_budgets (
        program_id,
        fiscal_year,
        fiscal_quarter,
        budget_period_start,
        budget_period_end,
        total_approved_budget,
        labor_budget,
        materials_budget,
        equipment_budget,
        overhead_budget,
        budget_status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', NOW())
      ON CONFLICT (program_id, fiscal_year, fiscal_quarter)
      DO UPDATE SET
        total_approved_budget = EXCLUDED.total_approved_budget,
        labor_budget = EXCLUDED.labor_budget,
        materials_budget = EXCLUDED.materials_budget,
        equipment_budget = EXCLUDED.equipment_budget,
        overhead_budget = EXCLUDED.overhead_budget,
        updated_at = NOW()
      RETURNING id`,
      [
        programId,
        fiscalYear,
        fiscalQuarter,
        new Date(fiscalYear, (fiscalQuarter - 1) * 3, 1),  // Quarter start
        new Date(fiscalYear, fiscalQuarter * 3, 0),         // Quarter end
        summary.totalBudget,
        summary.laborBudget,
        summary.materialsBudget,
        summary.equipmentBudget,
        summary.overheadBudget
      ]
    )
    
    const budgetId = result.rows[0].id
    
    logger.info('Program budget created/updated', {
      programId,
      budgetId,
      fiscalYear,
      fiscalQuarter,
      totalBudget: summary.totalBudget
    })
    
    return budgetId
    
  } catch (error) {
    logger.error('createProgramBudget error', { error, programId })
    throw error
  }
}

/**
 * Calculate ROI for a program
 */
export async function calculateROI(programId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(p.actual_cost), 0) as total_cost,
        COALESCE(SUM(pb.realized_value), 0) as total_benefits
      FROM projects p
      LEFT JOIN program_benefits pb ON pb.program_id = p.program_id
      WHERE p.program_id = $1 AND p.archived = false`,
      [programId]
    )
    
    const totalCost = parseFloat(result.rows[0].total_cost) || 0
    const totalBenefits = parseFloat(result.rows[0].total_benefits) || 0
    
    if (totalCost === 0) return 0
    
    const roi = ((totalBenefits - totalCost) / totalCost) * 100
    
    return Math.round(roi * 100) / 100  // Round to 2 decimals
    
  } catch (error) {
    logger.error('calculateROI error', { error, programId })
    throw error
  }
}

/**
 * Calculate NPV (Net Present Value) for a program
 */
export async function calculateNPV(
  programId: string,
  discountRate: number = 8.0,
  timeHorizonYears: number = 5
): Promise<number> {
  try {
    // Get total investment
    const investmentResult = await pool.query(
      'SELECT COALESCE(SUM(budget), 0) as total_investment FROM projects WHERE program_id = $1 AND archived = false',
      [programId]
    )
    
    const totalInvestment = parseFloat(investmentResult.rows[0].total_investment) || 0
    
    // Get expected annual benefits
    const benefitsResult = await pool.query(
      'SELECT COALESCE(SUM(expected_value), 0) as total_benefits FROM program_benefits WHERE program_id = $1',
      [programId]
    )
    
    const totalBenefits = parseFloat(benefitsResult.rows[0].total_benefits) || 0
    const annualBenefit = totalBenefits / timeHorizonYears
    
    // Calculate NPV
    let npv = -totalInvestment  // Initial investment (negative cash flow)
    
    // Add discounted future benefits
    for (let year = 1; year <= timeHorizonYears; year++) {
      npv += annualBenefit / Math.pow(1 + (discountRate / 100), year)
    }
    
    return Math.round(npv * 100) / 100
    
  } catch (error) {
    logger.error('calculateNPV error', { error, programId })
    throw error
  }
}

/**
 * Calculate payback period in months
 */
export async function calculatePaybackPeriod(programId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(p.budget), 0) as total_investment,
        COALESCE(SUM(pb.expected_value), 0) as total_benefits
      FROM projects p
      LEFT JOIN program_benefits pb ON pb.program_id = p.program_id
      WHERE p.program_id = $1 AND p.archived = false`,
      [programId]
    )
    
    const totalInvestment = parseFloat(result.rows[0].total_investment) || 0
    const totalBenefits = parseFloat(result.rows[0].total_benefits) || 0
    
    if (totalBenefits === 0) return 0
    
    // Assume benefits are realized evenly over time
    const monthlyBenefit = totalBenefits / 12
    const paybackMonths = Math.ceil(totalInvestment / monthlyBenefit)
    
    return paybackMonths
    
  } catch (error) {
    logger.error('calculatePaybackPeriod error', { error, programId })
    throw error
  }
}

/**
 * Get complete financial analysis for a program
 */
export async function getFinancialAnalysis(
  programId: string,
  analysisDate: Date = new Date()
): Promise<FinancialAnalysis> {
  try {
    // Get costs
    const costResult = await pool.query(
      `SELECT 
        COALESCE(SUM(actual_cost), 0) as total_investment,
        COALESCE(SUM(budget) - SUM(actual_cost), 0) as remaining_costs
      FROM projects
      WHERE program_id = $1 AND archived = false`,
      [programId]
    )
    
    const totalInvestment = parseFloat(costResult.rows[0].total_investment) || 0
    const remainingCosts = parseFloat(costResult.rows[0].remaining_costs) || 0
    const sunkCosts = totalInvestment  // All spent costs are sunk
    
    // Get benefits
    const benefitsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(expected_value), 0) as total_expected,
        COALESCE(SUM(realized_value), 0) as realized,
        COALESCE(SUM(expected_value) - SUM(realized_value), 0) as projected
      FROM program_benefits
      WHERE program_id = $1`,
      [programId]
    )
    
    const totalExpectedBenefits = parseFloat(benefitsResult.rows[0].total_expected) || 0
    const realizedBenefits = parseFloat(benefitsResult.rows[0].realized) || 0
    const projectedBenefits = parseFloat(benefitsResult.rows[0].projected) || 0
    
    // Calculate metrics
    const roiPercent = await calculateROI(programId)
    const npv = await calculateNPV(programId)
    const paybackPeriodMonths = await calculatePaybackPeriod(programId)
    
    const benefitCostRatio = totalInvestment > 0 
      ? totalExpectedBenefits / totalInvestment 
      : 0
    
    const continueRecommendation = (
      roiPercent > 0 && 
      npv > 0 && 
      benefitCostRatio > 1.0
    )
    
    const analysis: FinancialAnalysis = {
      programId,
      analysisDate,
      totalInvestment,
      sunkCosts,
      remainingCosts,
      totalExpectedBenefits,
      realizedBenefits,
      projectedBenefits,
      roiPercent,
      npv,
      irrPercent: 0,  // IRR calculation requires more complex iterative algorithm
      paybackPeriodMonths,
      benefitCostRatio: Math.round(benefitCostRatio * 10000) / 10000,
      continueRecommendation,
      recommendationRationale: continueRecommendation
        ? 'Strong ROI, positive NPV, and favorable benefit-cost ratio support continuation'
        : 'Metrics suggest reconsidering investment or improving benefit realization'
    }
    
    logger.info('Financial analysis completed', {
      programId,
      roiPercent: analysis.roiPercent,
      npv: analysis.npv,
      recommendation: continueRecommendation
    })
    
    return analysis
    
  } catch (error) {
    logger.error('getFinancialAnalysis error', { error, programId })
    throw error
  }
}

/**
 * Save financial analysis to database
 */
export async function saveFinancialAnalysis(
  analysis: FinancialAnalysis
): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO program_financial_analysis (
        program_id,
        analysis_date,
        analysis_type,
        total_investment,
        sunk_costs,
        remaining_costs,
        total_expected_benefits,
        realized_benefits,
        projected_benefits,
        roi_percent,
        npv,
        irr_percent,
        payback_period_months,
        benefit_cost_ratio,
        continue_recommendation,
        recommendation_rationale,
        created_at
      ) VALUES ($1, $2, 'periodic', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING id`,
      [
        analysis.programId,
        analysis.analysisDate,
        analysis.totalInvestment,
        analysis.sunkCosts,
        analysis.remainingCosts,
        analysis.totalExpectedBenefits,
        analysis.realizedBenefits,
        analysis.projectedBenefits,
        analysis.roiPercent,
        analysis.npv,
        analysis.irrPercent,
        analysis.paybackPeriodMonths,
        analysis.benefitCostRatio,
        analysis.continueRecommendation,
        analysis.recommendationRationale
      ]
    )
    
    const analysisId = result.rows[0].id
    
    logger.info('Financial analysis saved', {
      programId: analysis.programId,
      analysisId
    })
    
    return analysisId
    
  } catch (error) {
    logger.error('saveFinancialAnalysis error', { error, programId: analysis.programId })
    throw error
  }
}

/**
 * Get comprehensive financial dashboard data
 */
export async function getFinancialDashboard(programId: string) {
  try {
    const [summary, evmMetrics, analysis] = await Promise.all([
      getProgramFinancialSummary(programId),
      calculateEVMMetrics(programId),
      getFinancialAnalysis(programId)
    ])
    
    return {
      summary,
      evm: evmMetrics,
      analysis
    }
    
  } catch (error) {
    logger.error('getFinancialDashboard error', { error, programId })
    throw error
  }
}

/**
 * Create financial forecast
 */
export async function createForecast(forecast: FinancialForecast): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO program_forecasts (
        program_id,
        forecast_date,
        forecast_type,
        forecast_total_cost,
        forecast_completion_date,
        forecast_benefit_realization,
        best_case_cost,
        most_likely_cost,
        worst_case_cost,
        assumptions,
        confidence_level,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        forecast.programId,
        forecast.forecastDate,
        forecast.forecastType,
        forecast.forecastTotalCost,
        forecast.forecastCompletionDate,
        forecast.forecastBenefitRealization,
        forecast.bestCaseCost,
        forecast.mostLikelyCost,
        forecast.worstCaseCost,
        forecast.assumptions,
        forecast.confidenceLevel,
        forecast.status
      ]
    )
    
    return result.rows[0].id
    
  } catch (error) {
    logger.error('createForecast error', { error, programId: forecast.programId })
    throw error
  }
}

