/**
 * Seed Test Data for Financial Management Testing
 * 
 * Creates sample program and projects with financial data to test:
 * - Budget rollup calculations
 * - EVM metrics (CPI, SPI, etc.)
 * - ROI, NPV, payback period
 * - Benefits tracking
 * 
 * Usage:
 *   npm run seed:financial
 *   OR
 *   npx tsx server/scripts/seed-financial-test-data.ts
 */

import { Pool } from 'pg'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

interface TestProject {
  name: string
  budget: number
  actualCost: number
  forecastCost: number
  percentComplete: number
  laborCost: number
  materialsCost: number
  equipmentCost: number
  overheadCost: number
  expectedBenefits: number
  startDate: string
  endDate: string
}

const testProjects: TestProject[] = [
  {
    name: 'Customer Portal Migration',
    budget: 3500000,
    actualCost: 2100000,
    forecastCost: 3650000,
    percentComplete: 60,
    laborCost: 2500000,
    materialsCost: 600000,
    equipmentCost: 300000,
    overheadCost: 100000,
    expectedBenefits: 6500000,
    startDate: '2025-07-01',
    endDate: '2026-03-31'
  },
  {
    name: 'Data Analytics Platform',
    budget: 2800000,
    actualCost: 1650000,
    forecastCost: 2900000,
    percentComplete: 55,
    laborCost: 2000000,
    materialsCost: 500000,
    equipmentCost: 200000,
    overheadCost: 100000,
    expectedBenefits: 5200000,
    startDate: '2025-08-01',
    endDate: '2026-04-30'
  },
  {
    name: 'Mobile Application',
    budget: 2150000,
    actualCost: 1200000,
    forecastCost: 2200000,
    percentComplete: 50,
    laborCost: 1800000,
    materialsCost: 200000,
    equipmentCost: 100000,
    overheadCost: 50000,
    expectedBenefits: 3800000,
    startDate: '2025-09-01',
    endDate: '2026-05-31'
  },
  {
    name: 'Infrastructure Upgrade',
    budget: 1600000,
    actualCost: 950000,
    forecastCost: 1580000,
    percentComplete: 65,
    laborCost: 800000,
    materialsCost: 400000,
    equipmentCost: 350000,
    overheadCost: 50000,
    expectedBenefits: 2100000,
    startDate: '2025-10-01',
    endDate: '2026-02-28'
  },
  {
    name: 'Training Platform',
    budget: 400000,
    actualCost: 200000,
    forecastCost: 420000,
    percentComplete: 45,
    laborCost: 300000,
    materialsCost: 50000,
    equipmentCost: 30000,
    overheadCost: 20000,
    expectedBenefits: 1150000,
    startDate: '2025-11-01',
    endDate: '2026-03-31'
  }
]

async function main() {
  console.log('🌱 Seeding Financial Test Data\n')
  console.log('=' .repeat(60))
  console.log('This will create a test program with 5 projects')
  console.log('to validate financial calculations and EVM metrics')
  console.log('=' .repeat(60))
  console.log('')

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  
  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL not found')
    process.exit(1)
  }

  const dbUrl = new URL(connectionString)
  const needsSSL = dbUrl.hostname.includes('supabase.co') || 
                   dbUrl.hostname.includes('neon.tech') ||
                   process.env.DB_SSL === 'true'

  const pool = new Pool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1).split('?')[0],
    user: dbUrl.username,
    password: dbUrl.password,
    ssl: needsSSL ? { rejectUnauthorized: false } : undefined
  })

  try {
    // Test connection
    await pool.query('SELECT NOW()')
    console.log('✅ Database connected\n')

    // Get or create admin user
    let userId: string
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1`
    )
    
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id
      console.log(`✅ Using existing admin user: ${userId}\n`)
    } else {
      console.log('⚠️  No admin user found. Please ensure a user exists.')
      console.log('   Run: npm run create-admin\n')
      process.exit(1)
    }

    // Create test program
    console.log('📦 Creating test program: "Digital Transformation Initiative"...')
    
    const programResult = await pool.query(
      `INSERT INTO programs (
        name, 
        description, 
        budget, 
        currency, 
        start_date, 
        end_date, 
        status, 
        owner_id, 
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name`,
      [
        'Digital Transformation Initiative',
        'Enterprise-wide digital transformation program to modernize systems, improve customer experience, and increase operational efficiency',
        10450000,  // Total budget
        'USD',
        '2025-07-01',
        '2026-06-30',
        'amber',
        userId,
        userId
      ]
    )

    const programId = programResult.rows[0].id
    const programName = programResult.rows[0].name
    console.log(`✅ Program created: ${programName} (${programId})\n`)

    // Create test projects
    console.log('📦 Creating 5 test projects with financial data...\n')
    
    const projectIds: string[] = []
    
    for (let i = 0; i < testProjects.length; i++) {
      const project = testProjects[i]
      
      // Calculate planned and earned values
      const plannedValue = project.budget * 0.6  // Assume we're 60% through timeline
      const earnedValue = project.budget * (project.percentComplete / 100)
      
      // Calculate cost breakdown (40% internal labor, 25% external labor, etc.)
      const internalLaborCost = project.actualCost * 0.40
      const externalLaborCost = project.actualCost * 0.25
      const cloudCost = project.actualCost * 0.20
      const aiServicesCost = project.actualCost * 0.08
      const softwareCost = project.actualCost * 0.03
      const equipmentCost = project.actualCost * 0.02
      const materialsCost = project.actualCost * 0.01
      const overheadCost = project.actualCost * 0.01
      
      const result = await pool.query(
        `INSERT INTO projects (
          name,
          description,
          framework,
          priority,
          program_id,
          budget,
          actual_cost,
          forecast_cost,
          planned_value,
          earned_value,
          percent_complete,
          labor_cost,
          materials_cost,
          equipment_cost,
          overhead_cost,
          internal_labor_cost,
          external_labor_cost,
          cloud_infrastructure_cost,
          ai_services_cost,
          software_tools_cost,
          expected_benefits,
          start_date,
          end_date,
          owner_id,
          created_by,
          team_members
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING id`,
        [
          project.name,
          `Test project for financial management validation: ${project.name}`,
          'PMBOK',  // Framework
          'medium', // Priority
          programId,
          project.budget,
          project.actualCost,
          project.forecastCost,
          plannedValue,
          earnedValue,
          project.percentComplete,
          project.laborCost,
          materialsCost,
          equipmentCost,
          overheadCost,
          internalLaborCost,
          externalLaborCost,
          cloudCost,
          aiServicesCost,
          softwareCost,
          project.expectedBenefits,
          project.startDate,
          project.endDate,
          userId,
          userId,
          JSON.stringify([userId])  // team_members as JSONB array
        ]
      )
      
      const projectId = result.rows[0].id
      projectIds.push(projectId)
      
      console.log(`   ✅ ${project.name}`)
      console.log(`      Budget: $${(project.budget / 1000000).toFixed(1)}M | Actual: $${(project.actualCost / 1000000).toFixed(1)}M | Complete: ${project.percentComplete}%`)
    }

    console.log('')

    // Create program budget
    console.log('📦 Creating program budget for FY 2026 Q4...')
    
    await pool.query(
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
        contingency_budget,
        budget_status,
        approved_by,
        approved_at,
        baseline_date
      ) VALUES ($1, 2026, 4, '2025-10-01', '2025-12-31', $2, $3, $4, $5, $6, $7, 'approved', $8, NOW(), '2025-07-01')`,
      [
        programId,
        10450000,  // Total budget
        6400000,   // Labor
        1750000,   // Materials
        980000,    // Equipment
        320000,    // Overhead
        0,         // Contingency (allocated across projects)
        userId
      ]
    )
    
    console.log('✅ Program budget created\n')

    // Add sample benefits
    console.log('📦 Adding expected benefits...\n')
    
    const benefits = [
      { project: projectIds[0], type: 'revenue-increase', category: 'financial', value: 4000000, description: 'Increased online sales revenue' },
      { project: projectIds[0], type: 'efficiency', category: 'operational', value: 2500000, description: 'Reduced manual processing time' },
      { project: projectIds[1], type: 'cost-savings', category: 'financial', value: 3200000, description: 'Data-driven decision making savings' },
      { project: projectIds[1], type: 'efficiency', category: 'operational', value: 2000000, description: 'Automated reporting efficiency' },
      { project: projectIds[2], type: 'revenue-increase', category: 'financial', value: 2800000, description: 'Mobile channel revenue' },
      { project: projectIds[2], type: 'quality-improvement', category: 'customer', value: 1000000, description: 'Improved customer satisfaction' },
      { project: projectIds[3], type: 'cost-savings', category: 'financial', value: 1500000, description: 'Infrastructure cost reduction' },
      { project: projectIds[3], type: 'efficiency', category: 'operational', value: 600000, description: 'System performance improvement' },
      { project: projectIds[4], type: 'efficiency', category: 'employee', value: 800000, description: 'Reduced training time' },
      { project: projectIds[4], type: 'strategic', category: 'strategic', value: 350000, description: 'Knowledge retention' }
    ]

    for (const benefit of benefits) {
      await pool.query(
        `INSERT INTO program_benefits (
          program_id,
          project_id,
          benefit_type,
          benefit_category,
          description,
          expected_value,
          realized_value,
          status,
          owner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned', $8)`,
        [
          programId,
          benefit.project,
          benefit.type,
          benefit.category,
          benefit.description,
          benefit.value,
          0,  // Not yet realized
          userId
        ]
      )
      
      console.log(`   ✅ ${benefit.description}: $${(benefit.value / 1000000).toFixed(1)}M`)
    }

    console.log('')

    // Calculate and display summary
    console.log('=' .repeat(60))
    console.log('📊 Test Data Summary')
    console.log('=' .repeat(60))
    console.log('')

    const summaryResult = await pool.query(`
      SELECT 
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(actual_cost), 0) as total_spent,
        COALESCE(SUM(forecast_cost), 0) as total_forecast,
        COALESCE(SUM(planned_value), 0) as total_pv,
        COALESCE(SUM(earned_value), 0) as total_ev,
        COUNT(*) as project_count,
        AVG(percent_complete) as avg_completion
      FROM projects
      WHERE program_id = $1 AND archived = false
    `, [programId])

    const summary = summaryResult.rows[0]
    const totalBudget = parseFloat(summary.total_budget)
    const totalSpent = parseFloat(summary.total_spent)
    const totalForecast = parseFloat(summary.total_forecast)
    const totalPV = parseFloat(summary.total_pv)
    const totalEV = parseFloat(summary.total_ev)
    const projectCount = parseInt(summary.project_count)
    const avgCompletion = parseFloat(summary.avg_completion)

    console.log(`Program: ${programName}`)
    console.log(`Projects: ${projectCount}`)
    console.log('')
    console.log(`💰 Financial Summary:`)
    console.log(`   Total Budget:      $${(totalBudget / 1000000).toFixed(2)}M`)
    console.log(`   Spent to Date:     $${(totalSpent / 1000000).toFixed(2)}M (${((totalSpent / totalBudget) * 100).toFixed(1)}%)`)
    console.log(`   Forecast at Comp:  $${(totalForecast / 1000000).toFixed(2)}M`)
    console.log(`   Remaining:         $${((totalBudget - totalSpent) / 1000000).toFixed(2)}M`)
    console.log('')
    console.log(`📊 EVM Metrics:`)
    console.log(`   PV (Planned Value): $${(totalPV / 1000000).toFixed(2)}M`)
    console.log(`   EV (Earned Value):  $${(totalEV / 1000000).toFixed(2)}M`)
    console.log(`   AC (Actual Cost):   $${(totalSpent / 1000000).toFixed(2)}M`)
    
    const SPI = totalPV > 0 ? totalEV / totalPV : 0
    const CPI = totalSpent > 0 ? totalEV / totalSpent : 0
    const SV = totalEV - totalPV
    const CV = totalEV - totalSpent
    
    console.log(`   SPI (Schedule Perf): ${SPI.toFixed(2)} ${SPI >= 0.95 ? '✅' : SPI >= 0.85 ? '⚠️' : '❌'}`)
    console.log(`   CPI (Cost Perf):     ${CPI.toFixed(2)} ${CPI >= 0.95 ? '✅' : CPI >= 0.85 ? '⚠️' : '❌'}`)
    console.log(`   SV (Schedule Var):   $${(SV / 1000000).toFixed(2)}M ${SV >= 0 ? '✅' : '⚠️'}`)
    console.log(`   CV (Cost Variance):  $${(CV / 1000000).toFixed(2)}M ${CV >= 0 ? '✅' : '⚠️'}`)
    
    const EAC = CPI > 0 ? totalBudget / CPI : totalBudget
    const VAC = totalBudget - EAC
    
    console.log(`   EAC (Est at Comp):   $${(EAC / 1000000).toFixed(2)}M`)
    console.log(`   VAC (Var at Comp):   $${(VAC / 1000000).toFixed(2)}M ${VAC >= 0 ? '✅' : '⚠️ OVERRUN'}`)
    console.log('')

    const benefitsResult = await pool.query(`
      SELECT COALESCE(SUM(expected_value), 0) as total_benefits
      FROM program_benefits
      WHERE program_id = $1
    `, [programId])
    
    const totalBenefits = parseFloat(benefitsResult.rows[0].total_benefits)
    const roi = ((totalBenefits - totalBudget) / totalBudget) * 100
    const bcRatio = totalBudget > 0 ? totalBenefits / totalBudget : 0

    console.log(`🎯 Expected Benefits:`)
    console.log(`   Total Benefits:     $${(totalBenefits / 1000000).toFixed(2)}M`)
    console.log(`   ROI:               ${roi.toFixed(1)}% ${roi > 0 ? '✅' : '❌'}`)
    console.log(`   Benefit/Cost Ratio: ${bcRatio.toFixed(2)} ${bcRatio > 1 ? '✅' : '❌'}`)
    console.log('')

    console.log('=' .repeat(60))
    console.log('✅ Test data seeded successfully!')
    console.log('=' .repeat(60))
    console.log('')
    console.log('📊 Expected Dashboard Results:')
    console.log('')
    console.log('Budget Summary:')
    console.log(`   • Total Budget: $10.5M`)
    console.log(`   • Spent: $6.1M (58.4%)`)
    console.log(`   • Forecast: $10.8M`)
    console.log(`   • Overrun: $350K projected ⚠️`)
    console.log('')
    console.log('EVM Performance:')
    console.log(`   • CPI: ${CPI.toFixed(2)} ${CPI >= 0.95 ? '(On Track ✅)' : CPI >= 0.85 ? '(At Risk ⚠️)' : '(Critical ❌)'}`)
    console.log(`   • SPI: ${SPI.toFixed(2)} ${SPI >= 0.95 ? '(On Track ✅)' : SPI >= 0.85 ? '(At Risk ⚠️)' : '(Critical ❌)'}`)
    console.log(`   • Status: ${CPI >= 0.95 && SPI >= 0.95 ? 'On Track' : CPI >= 0.85 || SPI >= 0.85 ? 'At Risk' : 'Critical'}`)
    console.log('')
    console.log('ROI Analysis:')
    console.log(`   • ROI: ${roi.toFixed(1)}%`)
    console.log(`   • B/C Ratio: ${bcRatio.toFixed(2)}`)
    console.log(`   • Recommendation: ${roi > 0 && bcRatio > 1 ? 'Continue ✅' : 'Review ⚠️'}`)
    console.log('')
    console.log('Next Steps:')
    console.log('1. Visit: http://localhost:3000/programs/' + programId)
    console.log('2. Click the "Finances" tab')
    console.log('3. Verify all metrics display correctly')
    console.log('4. Check calculations match expected results above')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()

