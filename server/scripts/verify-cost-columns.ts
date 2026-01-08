/**
 * Verify Cost Columns in Projects Table
 */

const db = require('../src/lib/db')
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

const dbUrl = new URL(connectionString!)
const poolConfig: any = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1).split('?')[0],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false }
}

const pool = new Pool(poolConfig)

async function main() {
  try {
    console.log('🔍 Checking projects table columns...\n')
    
    // Get all columns in projects table
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name LIKE '%cost%'
      ORDER BY ordinal_position
    `)
    
    console.log('Found cost-related columns:\n')
    for (const col of result.rows) {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`)
    }
    
    console.log('\n📊 Checking sample project data...\n')
    
    // Get a sample project with cost data
    const projectResult = await db.query(`
      SELECT 
        id, 
        name, 
        budget,
        actual_cost,
        internal_labor_cost,
        external_labor_cost,
        cloud_infrastructure_cost,
        ai_services_cost
      FROM projects 
      WHERE program_id IN (
        SELECT id FROM programs WHERE name = 'Digital Transformation Initiative'
      )
      LIMIT 1
    `)
    
    if (projectResult.rows.length > 0) {
      const project = projectResult.rows[0]
      console.log(`Project: ${project.name}`)
      console.log(`  Budget: $${project.budget}`)
      console.log(`  Actual Cost: $${project.actual_cost}`)
      console.log(`  Internal Labor: $${project.internal_labor_cost}`)
      console.log(`  External Labor: $${project.external_labor_cost}`)
      console.log(`  Cloud Infrastructure: $${project.cloud_infrastructure_cost}`)
      console.log(`  AI Services: $${project.ai_services_cost}`)
    } else {
      console.log('❌ No projects found')
    }
    
    try { await db.end() } catch (e) {}} catch (error) {
    console.error('❌ Error:', error)
    try { await db.end() } catch (e) {}process.exit(1)
  }
}

main()

