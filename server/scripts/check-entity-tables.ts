/**
 * Check which entity tables exist in the database
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"

if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function checkTables() {
  await connectDatabase()
  const pool = getDatabasePool()
  
  const tablesToCheck = [
    'quality_standards',
    'scope_items',
    'risk_responses',
    'performance_actuals',
    'team_agreements',
    'development_approaches'
  ]
  
  for (const tableName of tablesToCheck) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      const exists = result.rows[0].exists
      console.log(`${tableName}: ${exists ? '✅ EXISTS' : '❌ DOES NOT EXIST'}`)
      
      if (exists) {
        // Check if source_document_id column exists
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = 'source_document_id'
          )
        `, [tableName])
        
        const hasColumn = columnCheck.rows[0].exists
        console.log(`  └─ source_document_id column: ${hasColumn ? '✅ EXISTS' : '❌ MISSING'}`)
      }
    } catch (error: any) {
      console.log(`${tableName}: ❌ ERROR - ${error.message}`)
    }
  }
  
  await pool.end()
}

checkTables().catch(console.error)

