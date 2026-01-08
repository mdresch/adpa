import * as dotenv from 'dotenv'
import * as path from 'path'
const dbModule = require('../../src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.join(__dirname, '../.env') })
const dbUrl = new URL(process.env.DATABASE_URL!)

async function main() {
  await db.initDb()
  const result = await db.query(`
    SELECT 
      p.name,
      p.budget,
      p.actual_cost,
      p.internal_labor_cost,
      p.external_labor_cost,
      p.cloud_infrastructure_cost,
      p.ai_services_cost,
      p.software_tools_cost,
      p.equipment_cost,
      p.materials_cost,
      p.overhead_cost,
      p.percent_complete
    FROM projects p
    JOIN programs prog ON p.program_id = prog.id
    WHERE prog.name = 'Digital Transformation Initiative'
    ORDER BY p.name
  `)
  
  console.log('\n💰 Complete Cost Breakdown for All Projects:\n')
  for (const row of result.rows) {
    console.log(`📊 ${row.name}`)
    console.log(`   Budget:                 $${parseFloat(row.budget).toLocaleString()}`)
    console.log(`   Actual Cost:            $${parseFloat(row.actual_cost).toLocaleString()}`)
    console.log(`   % Complete:             ${row.percent_complete}%`)
    console.log(`   ──────────────────────────────────────`)
    console.log(`   Internal Labor:         $${parseFloat(row.internal_labor_cost).toLocaleString()}`)
    console.log(`   External Labor:         $${parseFloat(row.external_labor_cost).toLocaleString()}`)
    console.log(`   Cloud Infrastructure:   $${parseFloat(row.cloud_infrastructure_cost).toLocaleString()}`)
    console.log(`   AI Services:            $${parseFloat(row.ai_services_cost).toLocaleString()}`)
    console.log(`   Software & Tools:       $${parseFloat(row.software_tools_cost).toLocaleString()}`)
    console.log(`   Equipment:              $${parseFloat(row.equipment_cost).toLocaleString()}`)
    console.log(`   Materials:              $${parseFloat(row.materials_cost).toLocaleString()}`)
    console.log(`   Overhead:               $${parseFloat(row.overhead_cost).toLocaleString()}`)
    
    const breakdownTotal = 
      parseFloat(row.internal_labor_cost) +
      parseFloat(row.external_labor_cost) +
      parseFloat(row.cloud_infrastructure_cost) +
      parseFloat(row.ai_services_cost) +
      parseFloat(row.software_tools_cost) +
      parseFloat(row.equipment_cost) +
      parseFloat(row.materials_cost) +
      parseFloat(row.overhead_cost)
    
    console.log(`   ──────────────────────────────────────`)
    console.log(`   Breakdown Total:        $${breakdownTotal.toLocaleString()}`)
    console.log(`   Match?: ${breakdownTotal === parseFloat(row.actual_cost) ? '✅ YES' : '❌ NO - MISMATCH!'}`)
    console.log('')
  }
  
  await db.end()
}

main()

