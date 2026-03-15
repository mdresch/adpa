import { Pool } from 'pg';
import { childLogger } from '../../utils/logger';

export interface PortfolioFinancialMetrics {
  totalBudget: number;
  totalActualCost: number;
  totalForecastCost: number;
  remainingBudget: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  budgetUtilization: number;
  totalLaborCost: number;
  internalLaborCost: number;
  internalLaborHours: number;
  externalLaborCost: number;
  externalLaborHours: number;
  cloudInfrastructureCost: number;
  aiServicesCost: number;
  softwareToolsCost: number;
  equipmentCost: number;
  materialsCost: number;
  overheadCost: number;
  expectedBenefits: number;
  costPercentageOfBenefits: number;
  roi: number;
  npv: number;
  paybackPeriod: number;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  atRiskProjects: number;
  onTimePercent: number;
  onBudgetPercent: number;
  completionPercent: number;
  calculatedAt: Date;
}

export interface CostCategoryBreakdown {
  categoryName: string;
  categoryCode: string;
  categoryType: string;
  amount: number;
  percentOfTotal: number;
  percentOfBudget: number;
  projectCount: number;
}

export class PortfolioFinancialRepository {
  private logger = childLogger({ component: 'PortfolioFinancialRepository' });

  constructor(private pool: Pool) {}

  async getPortfolioMetrics(): Promise<PortfolioFinancialMetrics> {
    try {
      const projectsResult = await this.pool.query(`
        SELECT
          COALESCE(SUM(p.budget), 0) as total_budget,
          COALESCE(SUM(p.actual_cost), 0) as total_actual_cost,
          COALESCE(SUM(p.forecast_cost), 0) as total_forecast_cost,
          COALESCE(SUM(p.expected_benefits), 0) as total_benefits,
          COALESCE(SUM(p.internal_labor_cost), 0) as internal_labor_cost,
          COALESCE(SUM(p.external_labor_cost), 0) as external_labor_cost,
          COALESCE(SUM(p.cloud_infrastructure_cost), 0) as cloud_cost,
          COALESCE(SUM(p.ai_services_cost), 0) as ai_cost,
          COALESCE(SUM(p.software_tools_cost), 0) as software_cost,
          COALESCE(SUM(p.equipment_cost), 0) as equipment_cost,
          COALESCE(SUM(p.materials_cost), 0) as materials_cost,
          COALESCE(SUM(p.overhead_cost), 0) as overhead_cost,
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
          COUNT(*) FILTER (WHERE status = 'active') as active_projects,
          COUNT(*) FILTER (WHERE health_score < 60) as at_risk_projects,
          COUNT(*) FILTER (WHERE percent_complete >= 100) as on_time_projects,
          COUNT(*) FILTER (WHERE actual_cost <= budget) as on_budget_projects,
          AVG(percent_complete) as avg_completion_percent
        FROM projects
        WHERE archived = false
      `);

      const laborResult = await this.pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN cc.category_code = 'INT_LABOR' THEN te.hours_worked ELSE 0 END), 0) as internal_hours,
          COALESCE(SUM(CASE WHEN cc.category_code = 'EXT_LABOR' THEN te.hours_worked ELSE 0 END), 0) as external_hours
        FROM time_entries te
        LEFT JOIN resource_assignments ra ON te.assignment_id = ra.id
        LEFT JOIN cost_categories cc ON ra.cost_category_id = cc.id
        WHERE te.status = 'approved'
          AND te.entry_date >= NOW() - INTERVAL '1 year'
      `);

      const projectData = projectsResult.rows[0];
      const laborData = laborResult.rows[0];

      const totalBudget = parseFloat(projectData.total_budget);
      const totalActualCost = parseFloat(projectData.total_actual_cost);
      const expectedBenefits = parseFloat(projectData.total_benefits);

      return {
        totalBudget,
        totalActualCost,
        totalForecastCost: parseFloat(projectData.total_forecast_cost),
        remainingBudget: totalBudget - totalActualCost,
        budgetVariance: totalBudget - totalActualCost,
        budgetVariancePercent: totalBudget > 0 ? ((totalBudget - totalActualCost) / totalBudget) * 100 : 0,
        budgetUtilization: totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0,
        totalLaborCost: parseFloat(projectData.internal_labor_cost) + parseFloat(projectData.external_labor_cost),
        internalLaborCost: parseFloat(projectData.internal_labor_cost),
        internalLaborHours: parseFloat(laborData.internal_hours),
        externalLaborCost: parseFloat(projectData.external_labor_cost),
        externalLaborHours: parseFloat(laborData.external_hours),
        cloudInfrastructureCost: parseFloat(projectData.cloud_cost),
        aiServicesCost: parseFloat(projectData.ai_cost),
        softwareToolsCost: parseFloat(projectData.software_cost),
        equipmentCost: parseFloat(projectData.equipment_cost),
        materialsCost: parseFloat(projectData.materials_cost),
        overheadCost: parseFloat(projectData.overhead_cost),
        expectedBenefits,
        costPercentageOfBenefits: expectedBenefits > 0 ? (totalBudget / expectedBenefits) * 100 : 0,
        roi: totalBudget > 0 ? ((expectedBenefits - totalBudget) / totalBudget) * 100 : 0,
        npv: expectedBenefits - totalBudget,
        paybackPeriod: expectedBenefits > 0 ? (totalBudget / (expectedBenefits / 12)) : 0,
        totalProjects: parseInt(projectData.total_projects),
        completedProjects: parseInt(projectData.completed_projects),
        activeProjects: parseInt(projectData.active_projects),
        atRiskProjects: parseInt(projectData.at_risk_projects),
        onTimePercent: parseInt(projectData.total_projects) > 0 ? (parseInt(projectData.on_time_projects) / parseInt(projectData.total_projects)) * 100 : 0,
        onBudgetPercent: parseInt(projectData.total_projects) > 0 ? (parseInt(projectData.on_budget_projects) / parseInt(projectData.total_projects)) * 100 : 0,
        completionPercent: parseFloat(projectData.avg_completion_percent) || 0,
        calculatedAt: new Date()
      };
    } catch (error) {
      this.logger.error("Error fetching portfolio financial metrics:", error);
      throw error;
    }
  }

  async getCostBreakdown(): Promise<CostCategoryBreakdown[]> {
    try {
      const result = await this.pool.query(`
        WITH cost_totals AS (
          SELECT
            cc.name as category_name,
            cc.category_code,
            cc.category_type,
            COALESCE(SUM(
              CASE 
                WHEN cc.category_code = 'INT_LABOR' THEN p.internal_labor_cost
                WHEN cc.category_code = 'EXT_LABOR' THEN p.external_labor_cost
                WHEN cc.category_code = 'CLOUD_INFRA' THEN p.cloud_infrastructure_cost
                WHEN cc.category_code = 'AI_SERVICES' THEN p.ai_services_cost
                WHEN cc.category_code = 'SOFTWARE' THEN p.software_tools_cost
                WHEN cc.category_code = 'EQUIPMENT' THEN p.equipment_cost
                WHEN cc.category_code = 'MATERIALS' THEN p.materials_cost
                WHEN cc.category_code = 'OVERHEAD' THEN p.overhead_cost
                ELSE 0
              END
            ), 0) as amount,
            COUNT(DISTINCT p.id) as project_count
          FROM cost_categories cc
          CROSS JOIN projects p
          WHERE p.archived = false
          GROUP BY cc.id, cc.name, cc.category_code, cc.category_type
        ),
        portfolio_total AS (
          SELECT COALESCE(SUM(amount), 0) as total FROM cost_totals
        ),
        projects_total_budget AS (
          SELECT COALESCE(SUM(budget), 0) as total_budget FROM projects WHERE archived = false
        )
        SELECT
          ct.category_name,
          ct.category_code,
          ct.category_type,
          ct.amount,
          CASE 
            WHEN pt.total > 0 THEN ROUND((ct.amount / pt.total * 100)::numeric, 2)
            ELSE 0
          END as percent_of_total,
          CASE 
            WHEN ptb.total_budget > 0 
            THEN ROUND((ct.amount / ptb.total_budget * 100)::numeric, 2)
            ELSE 0
          END as percent_of_budget,
          ct.project_count
        FROM cost_totals ct
        CROSS JOIN portfolio_total pt
        CROSS JOIN projects_total_budget ptb
        ORDER BY ct.amount DESC
      `);
      return result.rows;
    } catch (error) {
      this.logger.error("Error fetching cost breakdown:", error);
      throw error;
    }
  }

  async getProgramMetrics(programId: string): Promise<PortfolioFinancialMetrics> {
    try {
      const result = await this.pool.query(`
        SELECT
          COALESCE(SUM(p.budget), 0) as total_budget,
          COALESCE(SUM(p.actual_cost), 0) as total_actual_cost,
          COALESCE(SUM(p.forecast_cost), 0) as total_forecast_cost,
          COALESCE(SUM(p.expected_benefits), 0) as total_benefits,
          COALESCE(SUM(p.internal_labor_cost), 0) as internal_labor_cost,
          COALESCE(SUM(p.external_labor_cost), 0) as external_labor_cost,
          COALESCE(SUM(p.cloud_infrastructure_cost), 0) as cloud_cost,
          COALESCE(SUM(p.ai_services_cost), 0) as ai_cost,
          COALESCE(SUM(p.software_tools_cost), 0) as software_cost,
          COALESCE(SUM(p.equipment_cost), 0) as equipment_cost,
          COALESCE(SUM(p.materials_cost), 0) as materials_cost,
          COALESCE(SUM(p.overhead_cost), 0) as overhead_cost,
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
          COUNT(*) FILTER (WHERE status = 'active') as active_projects,
          COUNT(*) FILTER (WHERE health_score < 60) as at_risk_projects,
          COUNT(*) FILTER (WHERE percent_complete >= 100) as on_time_projects,
          COUNT(*) FILTER (WHERE actual_cost <= budget) as on_budget_projects,
          AVG(percent_complete) as avg_completion_percent
        FROM projects
        WHERE program_id = $1 AND archived = false
      `, [programId]);

      const data = result.rows[0];
      const totalBudget = parseFloat(data.total_budget);
      const totalActualCost = parseFloat(data.total_actual_cost);
      const expectedBenefits = parseFloat(data.total_benefits);

      return {
        totalBudget,
        totalActualCost,
        totalForecastCost: parseFloat(data.total_forecast_cost),
        remainingBudget: totalBudget - totalActualCost,
        budgetVariance: totalBudget - totalActualCost,
        budgetVariancePercent: totalBudget > 0 ? ((totalBudget - totalActualCost) / totalBudget) * 100 : 0,
        budgetUtilization: totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0,
        totalLaborCost: parseFloat(data.internal_labor_cost) + parseFloat(data.external_labor_cost),
        internalLaborCost: parseFloat(data.internal_labor_cost),
        internalLaborHours: 0, 
        externalLaborCost: parseFloat(data.external_labor_cost),
        externalLaborHours: 0,
        cloudInfrastructureCost: parseFloat(data.cloud_cost),
        aiServicesCost: parseFloat(data.ai_cost),
        softwareToolsCost: parseFloat(data.software_cost),
        equipmentCost: parseFloat(data.equipment_cost),
        materialsCost: parseFloat(data.materials_cost),
        overheadCost: parseFloat(data.overhead_cost),
        expectedBenefits,
        costPercentageOfBenefits: expectedBenefits > 0 ? (totalBudget / expectedBenefits) * 100 : 0,
        roi: totalBudget > 0 ? ((expectedBenefits - totalBudget) / totalBudget) * 100 : 0,
        npv: expectedBenefits - totalBudget,
        paybackPeriod: expectedBenefits > 0 ? (totalBudget / (expectedBenefits / 12)) : 0,
        totalProjects: parseInt(data.total_projects),
        completedProjects: parseInt(data.completed_projects),
        activeProjects: parseInt(data.active_projects),
        atRiskProjects: parseInt(data.at_risk_projects),
        onTimePercent: parseInt(data.total_projects) > 0 ? (parseInt(data.on_time_projects) / parseInt(data.total_projects)) * 100 : 0,
        onBudgetPercent: parseInt(data.total_projects) > 0 ? (parseInt(data.on_budget_projects) / parseInt(data.total_projects)) * 100 : 0,
        completionPercent: parseFloat(data.avg_completion_percent) || 0,
        calculatedAt: new Date()
      };
    } catch (error) {
      this.logger.error("Error fetching program financial metrics:", error);
      throw error;
    }
  }
}
