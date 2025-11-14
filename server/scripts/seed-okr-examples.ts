/**
 * Seed Strategic Framework Examples
 * TASK-1281: Populate database with example OKRs, Key Results, Goals, KPIs, and KSFs
 * 
 * This script inserts sample data based on the examples from
 * PORTFOLIO_STRATEGIC_FRAMEWORKS.md
 * 
 * Includes:
 * - Portfolio Vision
 * - Strategic Goals
 * - OKRs and Key Results
 * - KPIs (Balanced Scorecard)
 * - Key Success Factors (KSFs)
 * 
 * Usage:
 *   npm run seed:okrs
 *   npx tsx server/scripts/seed-okr-examples.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import { v4 as uuidv4 } from "uuid"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

interface OKRExample {
  objective_title: string
  objective_description: string
  level: 'organization' | 'portfolio' | 'program' | 'project'
  okr_period: string
  period_start: string
  period_end: string
  owner_name: string
  owner_role: string
  confidence_level: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  is_stretch_goal: boolean
  key_results: Array<{
    key_result_title: string
    metric_name: string
    metric_unit: string
    baseline_value: number
    target_value: number
    current_value: number
    stretch_target?: number
  }>
}

interface KPIExample {
  kpi_name: string
  kpi_description?: string
  kpi_category: 'financial' | 'customer' | 'operations' | 'innovation'
  kpi_type: 'leading' | 'lagging' | 'input' | 'output' | 'outcome'
  bsc_perspective: 'financial' | 'customer' | 'internal-process' | 'learning-growth'
  metric_formula?: string
  metric_unit: string
  measurement_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  data_source?: string
  target_value: number
  threshold_green: number
  threshold_yellow: number
  threshold_red: number
  current_value: number
  previous_value?: number
  trend?: 'improving' | 'stable' | 'declining'
  rag_status?: 'red' | 'amber' | 'green'
  owner_role: string
}

interface KSFExample {
  ksf_name: string
  ksf_description?: string
  ksf_category: 'industry' | 'strategic' | 'environmental' | 'temporal'
  criticality: 'must-have' | 'critical' | 'important' | 'nice-to-have'
  priority_rank?: number
  time_sensitive: boolean
  deadline?: string
  success_criteria: string
  measurement_method?: string
  achievement_status: 'not-started' | 'in-progress' | 'achieved' | 'at-risk' | 'failed'
  progress_percentage: number
  impact_if_not_achieved: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  owner_role: string
}

const exampleOKRs: OKRExample[] = [
  {
    objective_title: "Become the leader in AI-powered document management",
    objective_description: "Achieve market leadership through innovation and customer success",
    level: "organization",
    okr_period: "Annual-2026",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    owner_name: "CEO",
    owner_role: "Chief Executive Officer",
    confidence_level: 65,
    priority: "critical",
    is_stretch_goal: false,
    key_results: [
      {
        key_result_title: "Achieve 10,000 enterprise customers",
        metric_name: "Enterprise Customers",
        metric_unit: "count",
        baseline_value: 1200,
        target_value: 10000,
        current_value: 3500,
        stretch_target: 12000
      },
      {
        key_result_title: "Reach 95% customer satisfaction",
        metric_name: "CSAT Score",
        metric_unit: "percentage",
        baseline_value: 88,
        target_value: 95,
        current_value: 90
      },
      {
        key_result_title: "Generate $50M in Annual Recurring Revenue",
        metric_name: "Annual Recurring Revenue",
        metric_unit: "dollars",
        baseline_value: 12000000,
        target_value: 50000000,
        current_value: 18500000,
        stretch_target: 60000000
      },
      {
        key_result_title: "Launch in 5 new geographic markets",
        metric_name: "Geographic Markets",
        metric_unit: "count",
        baseline_value: 2,
        target_value: 5,
        current_value: 2
      }
    ]
  },
  {
    objective_title: "Accelerate AI adoption in enterprise market",
    objective_description: "Drive AI feature adoption and customer engagement",
    level: "program",
    okr_period: "Q1-2026",
    period_start: "2026-01-01",
    period_end: "2026-03-31",
    owner_name: "VP of Product",
    owner_role: "Vice President",
    confidence_level: 70,
    priority: "high",
    is_stretch_goal: false,
    key_results: [
      {
        key_result_title: "Launch AI features in 3 verticals",
        metric_name: "Verticals with AI Features",
        metric_unit: "count",
        baseline_value: 0,
        target_value: 3,
        current_value: 1
      },
      {
        key_result_title: "Achieve 50% AI feature adoption rate",
        metric_name: "AI Feature Adoption Rate",
        metric_unit: "percentage",
        baseline_value: 15,
        target_value: 50,
        current_value: 28
      },
      {
        key_result_title: "Reduce document processing time by 60%",
        metric_name: "Document Processing Time",
        metric_unit: "minutes",
        baseline_value: 120,
        target_value: 48,
        current_value: 85
      }
    ]
  },
  {
    objective_title: "Improve customer onboarding experience",
    objective_description: "Reduce time to value and increase customer satisfaction",
    level: "program",
    okr_period: "Q1-2026",
    period_start: "2026-01-01",
    period_end: "2026-03-31",
    owner_name: "VP of Customer Success",
    owner_role: "Vice President",
    confidence_level: 75,
    priority: "high",
    is_stretch_goal: false,
    key_results: [
      {
        key_result_title: "Reduce onboarding time to 7 days",
        metric_name: "Onboarding Time",
        metric_unit: "days",
        baseline_value: 14,
        target_value: 7,
        current_value: 10
      },
      {
        key_result_title: "Achieve 90% first-week activation rate",
        metric_name: "First Week Activation Rate",
        metric_unit: "percentage",
        baseline_value: 65,
        target_value: 90,
        current_value: 78
      },
      {
        key_result_title: "Reduce support tickets by 30%",
        metric_name: "Support Tickets",
        metric_unit: "count",
        baseline_value: 500,
        target_value: 350,
        current_value: 420
      }
    ]
  },
  {
    objective_title: "Scale infrastructure to support 100k concurrent users",
    objective_description: "Ensure platform reliability and performance at scale",
    level: "program",
    okr_period: "H1-2026",
    period_start: "2026-01-01",
    period_end: "2026-06-30",
    owner_name: "VP of Engineering",
    owner_role: "Vice President",
    confidence_level: 80,
    priority: "critical",
    is_stretch_goal: false,
    key_results: [
      {
        key_result_title: "Achieve 99.9% uptime SLA",
        metric_name: "Uptime",
        metric_unit: "percentage",
        baseline_value: 99.5,
        target_value: 99.9,
        current_value: 99.7
      },
      {
        key_result_title: "Support 100,000 concurrent users",
        metric_name: "Concurrent Users",
        metric_unit: "count",
        baseline_value: 25000,
        target_value: 100000,
        current_value: 45000
      },
      {
        key_result_title: "Reduce API response time to <200ms",
        metric_name: "API Response Time",
        metric_unit: "milliseconds",
        baseline_value: 450,
        target_value: 200,
        current_value: 320
      }
    ]
  },
  {
    objective_title: "Build world-class AI document generation capabilities",
    objective_description: "Develop cutting-edge AI features for document creation",
    level: "project",
    okr_period: "Q1-2026",
    period_start: "2026-01-01",
    period_end: "2026-03-31",
    owner_name: "AI Product Manager",
    owner_role: "Product Manager",
    confidence_level: 72,
    priority: "high",
    is_stretch_goal: false,
    key_results: [
      {
        key_result_title: "Launch 5 new AI document templates",
        metric_name: "AI Templates",
        metric_unit: "count",
        baseline_value: 0,
        target_value: 5,
        current_value: 2
      },
      {
        key_result_title: "Achieve 95% document quality score",
        metric_name: "Document Quality Score",
        metric_unit: "percentage",
        baseline_value: 85,
        target_value: 95,
        current_value: 91
      },
      {
        key_result_title: "Reduce generation time to under 2 seconds",
        metric_name: "Generation Time",
        metric_unit: "seconds",
        baseline_value: 5,
        target_value: 2,
        current_value: 3.2
      }
    ]
  }
]

const exampleKPIs: KPIExample[] = [
  // Financial Perspective
  {
    kpi_name: "Portfolio ROI",
    kpi_description: "Return on investment across all portfolio projects",
    kpi_category: "financial",
    kpi_type: "outcome",
    bsc_perspective: "financial",
    metric_formula: "(Total Benefits - Total Costs) / Total Costs * 100",
    metric_unit: "percentage",
    measurement_frequency: "quarterly",
    data_source: "Financial reporting system",
    target_value: 150,
    threshold_green: 140,
    threshold_yellow: 100,
    threshold_red: 100,
    current_value: 142,
    previous_value: 137,
    trend: "improving",
    rag_status: "amber",
    owner_role: "CFO"
  },
  {
    kpi_name: "Cost Performance Index (CPI)",
    kpi_description: "Ratio of earned value to actual cost",
    kpi_category: "financial",
    kpi_type: "lagging",
    bsc_perspective: "financial",
    metric_formula: "Earned Value / Actual Cost",
    metric_unit: "ratio",
    measurement_frequency: "monthly",
    data_source: "Project management system",
    target_value: 1.0,
    threshold_green: 0.95,
    threshold_yellow: 0.85,
    threshold_red: 0.85,
    current_value: 0.96,
    previous_value: 0.98,
    trend: "declining",
    rag_status: "amber",
    owner_role: "Portfolio Manager"
  },
  {
    kpi_name: "Budget Variance",
    kpi_description: "Percentage variance from planned budget",
    kpi_category: "financial",
    kpi_type: "lagging",
    bsc_perspective: "financial",
    metric_formula: "((Actual - Planned) / Planned) * 100",
    metric_unit: "percentage",
    measurement_frequency: "monthly",
    data_source: "Financial system",
    target_value: 0,
    threshold_green: 5,
    threshold_yellow: 10,
    threshold_red: 10,
    current_value: 8,
    previous_value: 6,
    trend: "declining",
    rag_status: "red",
    owner_role: "CFO"
  },
  {
    kpi_name: "Revenue Growth Rate",
    kpi_description: "Year-over-year revenue growth percentage",
    kpi_category: "financial",
    kpi_type: "outcome",
    bsc_perspective: "financial",
    metric_formula: "((Current Period - Previous Period) / Previous Period) * 100",
    metric_unit: "percentage",
    measurement_frequency: "quarterly",
    data_source: "Sales system",
    target_value: 30,
    threshold_green: 25,
    threshold_yellow: 15,
    threshold_red: 15,
    current_value: 28,
    previous_value: 24,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of Sales"
  },
  // Customer Perspective
  {
    kpi_name: "Customer Satisfaction (CSAT)",
    kpi_description: "Customer satisfaction score from surveys",
    kpi_category: "customer",
    kpi_type: "outcome",
    bsc_perspective: "customer",
    metric_formula: "(Satisfied Responses / Total Responses) * 100",
    metric_unit: "percentage",
    measurement_frequency: "monthly",
    data_source: "Customer feedback system",
    target_value: 95,
    threshold_green: 90,
    threshold_yellow: 80,
    threshold_red: 80,
    current_value: 90,
    previous_value: 88,
    trend: "improving",
    rag_status: "amber",
    owner_role: "VP of Customer Success"
  },
  {
    kpi_name: "Net Promoter Score (NPS)",
    kpi_description: "Measure of customer loyalty and satisfaction",
    kpi_category: "customer",
    kpi_type: "outcome",
    bsc_perspective: "customer",
    metric_formula: "% Promoters - % Detractors",
    metric_unit: "score",
    measurement_frequency: "quarterly",
    data_source: "NPS survey system",
    target_value: 50,
    threshold_green: 40,
    threshold_yellow: 20,
    threshold_red: 20,
    current_value: 42,
    previous_value: 38,
    trend: "improving",
    rag_status: "amber",
    owner_role: "VP of Customer Success"
  },
  {
    kpi_name: "Customer Retention Rate",
    kpi_description: "Percentage of customers retained over time period",
    kpi_category: "customer",
    kpi_type: "outcome",
    bsc_perspective: "customer",
    metric_formula: "((Customers at End - New Customers) / Customers at Start) * 100",
    metric_unit: "percentage",
    measurement_frequency: "monthly",
    data_source: "CRM system",
    target_value: 95,
    threshold_green: 90,
    threshold_yellow: 85,
    threshold_red: 85,
    current_value: 92,
    previous_value: 91,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of Customer Success"
  },
  {
    kpi_name: "Time to Value",
    kpi_description: "Average days from signup to first value realization",
    kpi_category: "customer",
    kpi_type: "leading",
    bsc_perspective: "customer",
    metric_formula: "Average(First Value Date - Signup Date)",
    metric_unit: "days",
    measurement_frequency: "monthly",
    data_source: "Product analytics",
    target_value: 30,
    threshold_green: 45,
    threshold_yellow: 60,
    threshold_red: 60,
    current_value: 35,
    previous_value: 38,
    trend: "improving",
    rag_status: "amber",
    owner_role: "VP of Customer Success"
  },
  // Internal Process Perspective
  {
    kpi_name: "Schedule Performance Index (SPI)",
    kpi_description: "Ratio of earned value to planned value",
    kpi_category: "operations",
    kpi_type: "lagging",
    bsc_perspective: "internal-process",
    metric_formula: "Earned Value / Planned Value",
    metric_unit: "ratio",
    measurement_frequency: "monthly",
    data_source: "Project management system",
    target_value: 1.0,
    threshold_green: 0.95,
    threshold_yellow: 0.85,
    threshold_red: 0.85,
    current_value: 0.97,
    previous_value: 0.96,
    trend: "improving",
    rag_status: "green",
    owner_role: "Portfolio Manager"
  },
  {
    kpi_name: "Project Success Rate",
    kpi_description: "Percentage of projects completed on time and budget",
    kpi_category: "operations",
    kpi_type: "outcome",
    bsc_perspective: "internal-process",
    metric_formula: "(Successful Projects / Total Projects) * 100",
    metric_unit: "percentage",
    measurement_frequency: "quarterly",
    data_source: "Project management system",
    target_value: 90,
    threshold_green: 85,
    threshold_yellow: 75,
    threshold_red: 75,
    current_value: 87,
    previous_value: 85,
    trend: "improving",
    rag_status: "green",
    owner_role: "Portfolio Manager"
  },
  {
    kpi_name: "Defect Rate",
    kpi_description: "Percentage of deliverables with defects",
    kpi_category: "operations",
    kpi_type: "lagging",
    bsc_perspective: "internal-process",
    metric_formula: "(Defective Deliverables / Total Deliverables) * 100",
    metric_unit: "percentage",
    measurement_frequency: "monthly",
    data_source: "Quality management system",
    target_value: 2,
    threshold_green: 5,
    threshold_yellow: 10,
    threshold_red: 10,
    current_value: 3.5,
    previous_value: 4.2,
    trend: "improving",
    rag_status: "green",
    owner_role: "Quality Manager"
  },
  {
    kpi_name: "Cycle Time",
    kpi_description: "Average time to complete a project cycle",
    kpi_category: "operations",
    kpi_type: "lagging",
    bsc_perspective: "internal-process",
    metric_formula: "Average(Project End Date - Project Start Date)",
    metric_unit: "days",
    measurement_frequency: "monthly",
    data_source: "Project management system",
    target_value: 14,
    threshold_green: 21,
    threshold_yellow: 30,
    threshold_red: 30,
    current_value: 18,
    previous_value: 19,
    trend: "improving",
    rag_status: "green",
    owner_role: "Portfolio Manager"
  },
  // Learning & Growth Perspective
  {
    kpi_name: "Employee Satisfaction",
    kpi_description: "Employee satisfaction score from surveys",
    kpi_category: "innovation",
    kpi_type: "leading",
    bsc_perspective: "learning-growth",
    metric_formula: "Average satisfaction score",
    metric_unit: "percentage",
    measurement_frequency: "quarterly",
    data_source: "HR system",
    target_value: 85,
    threshold_green: 80,
    threshold_yellow: 70,
    threshold_red: 70,
    current_value: 82,
    previous_value: 80,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of People"
  },
  {
    kpi_name: "Skills Coverage",
    kpi_description: "Percentage of required skills covered by team",
    kpi_category: "innovation",
    kpi_type: "leading",
    bsc_perspective: "learning-growth",
    metric_formula: "(Covered Skills / Required Skills) * 100",
    metric_unit: "percentage",
    measurement_frequency: "quarterly",
    data_source: "HR system",
    target_value: 95,
    threshold_green: 90,
    threshold_yellow: 80,
    threshold_red: 80,
    current_value: 91,
    previous_value: 89,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of People"
  },
  {
    kpi_name: "Innovation Index",
    kpi_description: "Composite score of innovation initiatives and outcomes",
    kpi_category: "innovation",
    kpi_type: "outcome",
    bsc_perspective: "learning-growth",
    metric_formula: "Weighted average of innovation metrics",
    metric_unit: "score",
    measurement_frequency: "quarterly",
    data_source: "Innovation tracking system",
    target_value: 75,
    threshold_green: 65,
    threshold_yellow: 50,
    threshold_red: 50,
    current_value: 68,
    previous_value: 65,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of Innovation"
  },
  {
    kpi_name: "Training Completion Rate",
    kpi_description: "Percentage of employees completing required training",
    kpi_category: "innovation",
    kpi_type: "leading",
    bsc_perspective: "learning-growth",
    metric_formula: "(Completed Training / Required Training) * 100",
    metric_unit: "percentage",
    measurement_frequency: "monthly",
    data_source: "Learning management system",
    target_value: 90,
    threshold_green: 85,
    threshold_yellow: 75,
    threshold_red: 75,
    current_value: 87,
    previous_value: 85,
    trend: "improving",
    rag_status: "green",
    owner_role: "VP of People"
  }
]

const exampleKSFs: KSFExample[] = [
  {
    ksf_name: "AI Technology Leadership",
    ksf_description: "Establish ADPA as a recognized leader in AI-powered document management",
    ksf_category: "strategic",
    criticality: "must-have",
    priority_rank: 1,
    time_sensitive: true,
    deadline: "2026-12-31",
    success_criteria: "Recognized as top 3 AI document platforms by Gartner",
    measurement_method: "Gartner Magic Quadrant ranking",
    achievement_status: "in-progress",
    progress_percentage: 65,
    impact_if_not_achieved: "Loss of competitive advantage, customer attrition",
    risk_level: "high",
    owner_role: "CTO"
  },
  {
    ksf_name: "Regulatory Compliance (GDPR, SOC2)",
    ksf_description: "Maintain 100% compliance with all applicable regulations",
    ksf_category: "environmental",
    criticality: "must-have",
    priority_rank: 2,
    time_sensitive: true,
    deadline: "2026-03-31",
    success_criteria: "100% compliant with all regulations, passing all audits",
    measurement_method: "Compliance audit results",
    achievement_status: "in-progress",
    progress_percentage: 92,
    impact_if_not_achieved: "Legal liability, loss of enterprise customers",
    risk_level: "critical",
    owner_role: "Chief Compliance Officer"
  },
  {
    ksf_name: "Sub-2-Second Document Generation",
    ksf_description: "Achieve average document generation time under 2 seconds",
    ksf_category: "industry",
    criticality: "critical",
    priority_rank: 3,
    time_sensitive: true,
    deadline: "2026-06-30",
    success_criteria: "Average generation time <2 seconds for 95% of requests",
    measurement_method: "Performance monitoring system",
    achievement_status: "at-risk",
    progress_percentage: 45,
    impact_if_not_achieved: "Poor user experience, competitive disadvantage",
    risk_level: "high",
    owner_role: "VP of Engineering"
  },
  {
    ksf_name: "24/7 System Availability",
    ksf_description: "Maintain 99.9% uptime SLA",
    ksf_category: "industry",
    criticality: "must-have",
    priority_rank: 4,
    time_sensitive: false,
    success_criteria: "99.9% uptime SLA achieved consistently",
    measurement_method: "Uptime monitoring system",
    achievement_status: "in-progress",
    progress_percentage: 99.7,
    impact_if_not_achieved: "Customer churn, revenue loss",
    risk_level: "critical",
    owner_role: "VP of Engineering"
  },
  {
    ksf_name: "Launch Before Competitor X",
    ksf_description: "Release GA version before key competitor launches similar product",
    ksf_category: "temporal",
    criticality: "critical",
    priority_rank: 5,
    time_sensitive: true,
    deadline: "2026-06-30",
    success_criteria: "GA release by Q2 2026, before competitor X",
    measurement_method: "Product launch tracking",
    achievement_status: "in-progress",
    progress_percentage: 60,
    impact_if_not_achieved: "Market share loss, positioning disadvantage",
    risk_level: "high",
    owner_role: "VP of Product"
  }
]

async function checkTableExists(client: any, tableName: string): Promise<boolean> {
  try {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    )
    return result.rows[0].exists
  } catch (error) {
    logger.error(`Error checking table ${tableName}:`, error)
    return false
  }
}

async function seedOKRs(client: any) {
  console.log('\n📊 Seeding OKRs and Key Results...\n')

  let okrsCreated = 0
  let keyResultsCreated = 0

  for (const okrExample of exampleOKRs) {
    // Check if OKR already exists
    const existingCheck = await client.query(
      `SELECT id FROM portfolio_okrs 
       WHERE objective_title = $1 AND okr_period = $2 AND level = $3
       LIMIT 1`,
      [okrExample.objective_title, okrExample.okr_period, okrExample.level]
    )

    let okrId: string

    if (existingCheck.rows.length > 0) {
      okrId = existingCheck.rows[0].id
      console.log(`⏭️  OKR already exists: "${okrExample.objective_title}"`)
    } else {
      // Create OKR
      const okrResult = await client.query(
        `INSERT INTO portfolio_okrs (
          id, level, objective_title, objective_description,
          okr_period, period_start, period_end,
          owner_name, owner_role, confidence_level, priority, is_stretch_goal
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id`,
        [
          uuidv4(),
          okrExample.level,
          okrExample.objective_title,
          okrExample.objective_description,
          okrExample.okr_period,
          okrExample.period_start,
          okrExample.period_end,
          okrExample.owner_name,
          okrExample.owner_role,
          okrExample.confidence_level,
          okrExample.priority,
          okrExample.is_stretch_goal
        ]
      )

      okrId = okrResult.rows[0].id
      okrsCreated++
      console.log(`✅ Created OKR: "${okrExample.objective_title}"`)
    }

    // Create Key Results
    for (const kr of okrExample.key_results) {
      // Check if key result already exists
      const krCheck = await client.query(
        `SELECT id FROM portfolio_key_results 
         WHERE okr_id = $1 AND key_result_title = $2
         LIMIT 1`,
        [okrId, kr.key_result_title]
      )

      if (krCheck.rows.length > 0) {
        console.log(`   ⏭️  Key Result already exists: "${kr.key_result_title}"`)
        continue
      }

      await client.query(
        `INSERT INTO portfolio_key_results (
          id, okr_id, key_result_title,
          metric_name, metric_unit,
          baseline_value, target_value, current_value, stretch_target,
          measurement_frequency
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )`,
        [
          uuidv4(),
          okrId,
          kr.key_result_title,
          kr.metric_name,
          kr.metric_unit,
          kr.baseline_value,
          kr.target_value,
          kr.current_value,
          kr.stretch_target || null,
          'monthly'
        ]
      )

      keyResultsCreated++
      console.log(`   ✅ Created Key Result: "${kr.key_result_title}"`)
    }
  }

  return { okrsCreated, keyResultsCreated }
}

async function seedKPIs(client: any) {
  console.log('\n📈 Seeding KPIs (Balanced Scorecard)...\n')

  const tableExists = await checkTableExists(client, 'portfolio_kpis')
  if (!tableExists) {
    console.log('⚠️  Table portfolio_kpis does not exist. Skipping KPI seeding.')
    console.log('   Create the table first using a migration script.')
    return { kpisCreated: 0 }
  }

  let kpisCreated = 0

  for (const kpi of exampleKPIs) {
    // Check if KPI already exists
    const existingCheck = await client.query(
      `SELECT id FROM portfolio_kpis 
       WHERE kpi_name = $1 AND kpi_category = $2
       LIMIT 1`,
      [kpi.kpi_name, kpi.kpi_category]
    )

    if (existingCheck.rows.length > 0) {
      console.log(`⏭️  KPI already exists: "${kpi.kpi_name}"`)
      continue
    }

    await client.query(
      `INSERT INTO portfolio_kpis (
        id, kpi_name, kpi_description, kpi_category, kpi_type,
        bsc_perspective, metric_formula, metric_unit, measurement_frequency,
        data_source, target_value, threshold_green, threshold_yellow, threshold_red,
        current_value, previous_value, trend, rag_status, owner_role, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )`,
      [
        uuidv4(),
        kpi.kpi_name,
        kpi.kpi_description || null,
        kpi.kpi_category,
        kpi.kpi_type,
        kpi.bsc_perspective,
        kpi.metric_formula || null,
        kpi.metric_unit,
        kpi.measurement_frequency,
        kpi.data_source || null,
        kpi.target_value,
        kpi.threshold_green,
        kpi.threshold_yellow,
        kpi.threshold_red,
        kpi.current_value,
        kpi.previous_value || null,
        kpi.trend || null,
        kpi.rag_status || null,
        kpi.owner_role,
        true
      ]
    )

    kpisCreated++
    console.log(`✅ Created KPI: "${kpi.kpi_name}" (${kpi.bsc_perspective})`)
  }

  return { kpisCreated }
}

async function seedKSFs(client: any) {
  console.log('\n🎯 Seeding Key Success Factors (KSFs)...\n')

  const tableExists = await checkTableExists(client, 'portfolio_key_success_factors')
  if (!tableExists) {
    console.log('⚠️  Table portfolio_key_success_factors does not exist. Skipping KSF seeding.')
    console.log('   Create the table first using a migration script.')
    return { ksfsCreated: 0 }
  }

  let ksfsCreated = 0

  for (const ksf of exampleKSFs) {
    // Check if KSF already exists
    const existingCheck = await client.query(
      `SELECT id FROM portfolio_key_success_factors 
       WHERE ksf_name = $1 AND ksf_category = $2
       LIMIT 1`,
      [ksf.ksf_name, ksf.ksf_category]
    )

    if (existingCheck.rows.length > 0) {
      console.log(`⏭️  KSF already exists: "${ksf.ksf_name}"`)
      continue
    }

    await client.query(
      `INSERT INTO portfolio_key_success_factors (
        id, ksf_name, ksf_description, ksf_category, criticality,
        priority_rank, time_sensitive, deadline, success_criteria,
        measurement_method, achievement_status, progress_percentage,
        impact_if_not_achieved, risk_level, owner_role
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )`,
      [
        uuidv4(),
        ksf.ksf_name,
        ksf.ksf_description || null,
        ksf.ksf_category,
        ksf.criticality,
        ksf.priority_rank || null,
        ksf.time_sensitive,
        ksf.deadline || null,
        ksf.success_criteria,
        ksf.measurement_method || null,
        ksf.achievement_status,
        ksf.progress_percentage,
        ksf.impact_if_not_achieved,
        ksf.risk_level,
        ksf.owner_role
      ]
    )

    ksfsCreated++
    console.log(`✅ Created KSF: "${ksf.ksf_name}" (${ksf.criticality})`)
  }

  return { ksfsCreated }
}

async function seedStrategicGoals(client: any) {
  console.log('\n🎯 Seeding Strategic Goals...\n')

  const tableExists = await checkTableExists(client, 'portfolio_strategic_goals')
  if (!tableExists) {
    console.log('⚠️  Table portfolio_strategic_goals does not exist. Skipping Strategic Goals seeding.')
    console.log('   Create the table first using a migration script.')
    return { goalsCreated: 0 }
  }

  const exampleGoals = [
    {
      goal_title: "Digital Transformation Leadership",
      goal_description: "Establish ADPA as the leading digital transformation platform for enterprise document management",
      goal_category: "growth",
      time_horizon: "5-year",
      target_year: 2026,
      priority_rank: 1,
      status: "active"
    },
    {
      goal_title: "Market Expansion",
      goal_description: "Expand into 5 new geographic markets and 3 new industry verticals",
      goal_category: "market-expansion",
      time_horizon: "3-year",
      target_year: 2026,
      priority_rank: 2,
      status: "active"
    },
    {
      goal_title: "Innovation Excellence",
      goal_description: "Become recognized as the most innovative AI document platform",
      goal_category: "innovation",
      time_horizon: "3-year",
      target_year: 2026,
      priority_rank: 3,
      status: "active"
    }
  ]

  let goalsCreated = 0

  for (const goal of exampleGoals) {
    // Check if goal already exists
    const existingCheck = await client.query(
      `SELECT id FROM portfolio_strategic_goals 
       WHERE goal_title = $1 AND target_year = $2
       LIMIT 1`,
      [goal.goal_title, goal.target_year]
    )

    if (existingCheck.rows.length > 0) {
      console.log(`⏭️  Strategic Goal already exists: "${goal.goal_title}"`)
      continue
    }

    await client.query(
      `INSERT INTO portfolio_strategic_goals (
        id, goal_title, goal_description, goal_category,
        time_horizon, target_year, priority_rank, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )`,
      [
        uuidv4(),
        goal.goal_title,
        goal.goal_description,
        goal.goal_category,
        goal.time_horizon,
        goal.target_year,
        goal.priority_rank,
        goal.status
      ]
    )

    goalsCreated++
    console.log(`✅ Created Strategic Goal: "${goal.goal_title}"`)
  }

  return { goalsCreated }
}

async function seedVision(client: any) {
  console.log('\n🌟 Seeding Portfolio Vision...\n')

  const tableExists = await checkTableExists(client, 'portfolio_vision')
  if (!tableExists) {
    console.log('⚠️  Table portfolio_vision does not exist. Skipping Vision seeding.')
    console.log('   Create the table first using a migration script.')
    return { visionCreated: 0 }
  }

  // Check if vision already exists
  const existingCheck = await client.query(
    `SELECT id FROM portfolio_vision LIMIT 1`
  )

  if (existingCheck.rows.length > 0) {
    console.log('⏭️  Portfolio Vision already exists')
    return { visionCreated: 0 }
  }

  await client.query(
    `INSERT INTO portfolio_vision (
      id, vision_statement, mission_statement, core_values, effective_from
    ) VALUES (
      $1, $2, $3, $4, $5
    )`,
    [
      uuidv4(),
      "Transform enterprise document management through AI innovation",
      "Deliver AI-powered document processing that automates creation, ensures compliance, and accelerates decision-making",
      ["Innovation First", "Customer Success", "Data-Driven", "Excellence", "Ethical AI"],
      "2026-01-01"
    ]
  )

  console.log('✅ Created Portfolio Vision')
  return { visionCreated: 1 }
}

async function seedStrategicFramework() {
  try {
    logger.info('Connecting to database...')
    await connectDatabase()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    console.log('🌱 Seeding Strategic Framework Examples\n')
    console.log('=' .repeat(60))

    // Seed in order: Vision -> Goals -> OKRs -> KPIs -> KSFs
    const visionResult = await seedVision(client)
    const goalsResult = await seedStrategicGoals(client)
    const okrResult = await seedOKRs(client)
    const kpiResult = await seedKPIs(client)
    const ksfResult = await seedKSFs(client)

    console.log('\n' + '='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(`   Vision: ${visionResult.visionCreated} created`)
    console.log(`   Strategic Goals: ${goalsResult.goalsCreated} created`)
    console.log(`   OKRs: ${okrResult.okrsCreated} created`)
    console.log(`   Key Results: ${okrResult.keyResultsCreated} created`)
    console.log(`   KPIs: ${kpiResult.kpisCreated} created`)
    console.log(`   KSFs: ${ksfResult.ksfsCreated} created`)

    // Verify the data
    const verifyOKRs = await client.query('SELECT COUNT(*) as count FROM portfolio_okrs')
    const verifyKRs = await client.query('SELECT COUNT(*) as count FROM portfolio_key_results')

    console.log('\n📈 Database Status:')
    console.log(`   Total OKRs in database: ${verifyOKRs.rows[0].count}`)
    console.log(`   Total Key Results in database: ${verifyKRs.rows[0].count}`)

    // Show some examples
    const examples = await client.query(`
      SELECT o.objective_title, o.level, o.okr_period, COUNT(kr.id) as kr_count
      FROM portfolio_okrs o
      LEFT JOIN portfolio_key_results kr ON kr.okr_id = o.id
      GROUP BY o.id, o.objective_title, o.level, o.okr_period
      ORDER BY o.created_at DESC
      LIMIT 5
    `)

    console.log('\n📋 Sample OKRs:')
    examples.rows.forEach((row: any) => {
      console.log(`   • ${row.objective_title} (${row.level}, ${row.okr_period}) - ${row.kr_count} key results`)
    })

    console.log('\n✨ Strategic framework examples seeded successfully!')
    console.log('\n💡 Next steps:')
    console.log('   - Visit http://localhost:3000/portfolio/okrs to view the OKR dashboard')
    console.log('   - Create additional OKRs through the UI')
    console.log('   - Update key result current values to see progress tracking')
    console.log('   - Note: KPIs and KSFs require table creation via migrations first')

  } catch (error: any) {
    logger.error('Seed failed:', error)
    console.error('\n❌ Seed failed:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run seed
seedStrategicFramework().catch((error) => {
  logger.error('Unhandled error:', error)
  console.error('Unhandled error:', error)
  process.exit(1)
})
