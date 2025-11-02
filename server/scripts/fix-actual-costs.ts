/**
 * Fix Actual Costs - Set actual_cost = sum of breakdown columns
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const dbUrl = new URL(process.env.DATABASE_URL!)
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1).split('?')[0],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('\n🔧 Fixing actual_cost for all projects...\n')
  
  try {
    const result = await pool.query(`
      UPDATE projects
      SET actual_cost = (
        COALESCE(internal_labor_cost, 0) +
        COALESCE(external_labor_cost, 0) +
        COALESCE(cloud_infrastructure_cost, 0) +
        COALESCE(ai_services_cost, 0) +
        COALESCE(software_tools_cost, 0) +
        COALESCE(equipment_cost, 0) +
        COALESCE(materials_cost, 0) +
        COALESCE(overhead_cost, 0)
      ),
      updated_at = NOW()
      WHERE program_id IN (
        SELECT id FROM programs WHERE name = 'Digital Transformation Initiative'
      )
      RETURNING 
        name, 
        actual_cost,
        internal_labor_cost,
        external_labor_cost
    `)
    
    console.log(`✅ Fixed ${result.rows.length} project(s):\n`)
    for (const row of result.rows) {
      console.log(`   ${row.name}`)
      console.log(`      Actual Cost: $${parseFloat(row.actual_cost).toLocaleString()}`)
      console.log(`      (Internal: $${parseFloat(row.internal_labor_cost).toLocaleString()} + External: $${parseFloat(row.external_labor_cost).toLocaleString()} + ...)`)
      console.log('')
    }
    
    console.log('✅ All projects fixed! Actual costs now match breakdown totals.\n')
    
    await pool.end()
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }
}

main()

