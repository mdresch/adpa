/**
 * Check column names for entity tables
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"

if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function checkColumns() {
  await connectDatabase()
  const pool = getDatabasePool()
  
  const tables = [
    'quality_standards',
    'scope_items',
    'risk_responses',
    'team_agreements',
    'development_approaches'
  ]
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table])
      
      console.log(`\n${table}:`)
      result.rows.forEach((r: any) => {
        console.log(`  - ${r.column_name} (${r.data_type})`)
      })
      
      // Find potential name column
      const nameColumns = result.rows.filter((r: any) => 
        r.column_name.includes('name') || 
        r.column_name.includes('title') ||
        r.column_name.includes('type')
      )
      if (nameColumns.length > 0) {
        console.log(`  → Potential name column: ${nameColumns.map((r: any) => r.column_name).join(', ')}`)
      }
      
      // Find potential description column
      const descColumns = result.rows.filter((r: any) => 
        r.column_name.includes('description') || 
        r.column_name.includes('notes') ||
        r.column_name.includes('justification')
      )
      if (descColumns.length > 0) {
        console.log(`  → Potential description column: ${descColumns.map((r: any) => r.column_name).join(', ')}`)
      }
    } catch (error: any) {
      console.log(`\n${table}: ERROR - ${error.message}`)
    }
  }
  
  await pool.end()
}

checkColumns().catch(console.error)

