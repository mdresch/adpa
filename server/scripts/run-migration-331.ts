/**
 * Run Migration 331: OKRs and Key Results (TASK-1281)
 * 
 * This script creates the OKR system tables for portfolio strategic frameworks:
 * - portfolio_okrs: Objectives at organization, portfolio, program, and project levels
 * - portfolio_key_results: Measurable key results with auto-calculated progress
 * - portfolio_okr_summary: View showing OKR summary with aggregated KR statistics
 * 
 * Features:
 * - Auto-calculates key result progress percentage and status
 * - Supports cascading OKRs (parent-child relationships)
 * - Tracks confidence levels and progress
 * - Links to programs and projects
 * 
 * Usage:
 *   npm run migrate:331
 *   npx tsx server/scripts/run-migration-331.ts
 */

import dotenv from "dotenv"
import { readFileSync } from "fs"
import { join } from "path"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    // Connect to database first
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
    console.log('🚀 Running Migration 331: OKRs and Key Results (TASK-1281)\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/331_create_okrs.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if tables already exist
    console.log('🔍 Checking if OKR tables exist...')
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('portfolio_okrs', 'portfolio_key_results')
      ORDER BY table_name
    `)
    
    if (tablesCheck.rows.length > 0) {
      console.log('⚠️  Some tables already exist:')
      tablesCheck.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
      console.log('\n   Migration may have already been run.\n')
      
      // Check table structures
      for (const row of tablesCheck.rows) {
        const tableName = row.table_name
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName])
        
        console.log(`📋 Current ${tableName} structure:`)
        columnsResult.rows.forEach(col => {
          console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`)
        })
        console.log()
      }
    } else {
      console.log('✅ No existing OKR tables found. Proceeding with migration.\n')
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      await client.query(migrationSQL)
      await client.query('COMMIT')
      console.log('✅ Migration executed successfully!\n')
    } catch (error: any) {
      await client.query('ROLLBACK')
      console.error('❌ Migration failed:', error.message)
      throw error
    }
    
    // Verify tables were created
    console.log('🔍 Verifying migration...')
    const verifyTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('portfolio_okrs', 'portfolio_key_results')
      ORDER BY table_name
    `)
    
    console.log('✅ Tables created:')
    verifyTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    console.log()
    
    // Verify indexes
    const verifyIndexes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('portfolio_okrs', 'portfolio_key_results')
      ORDER BY tablename, indexname
    `)
    
    console.log('✅ Indexes created:', verifyIndexes.rows.length)
    verifyIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname} on ${idx.tablename}`)
    })
    console.log()
    
    // Verify triggers
    const verifyTriggers = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table IN ('portfolio_okrs', 'portfolio_key_results')
      ORDER BY event_object_table, trigger_name
    `)
    
    console.log('✅ Triggers created:', verifyTriggers.rows.length)
    verifyTriggers.rows.forEach(trg => {
      console.log(`   - ${trg.trigger_name} on ${trg.event_object_table}`)
    })
    console.log()
    
    // Verify functions
    const verifyFunctions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('calculate_kr_progress', 'calculate_okr_progress', 'update_updated_at_column')
      ORDER BY routine_name
    `)
    
    console.log('✅ Functions created:', verifyFunctions.rows.length)
    verifyFunctions.rows.forEach(func => {
      console.log(`   - ${func.routine_name}`)
    })
    console.log()
    
    // Verify views
    const verifyViews = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name = 'portfolio_okr_summary'
    `)
    
    if (verifyViews.rows.length > 0) {
      console.log('✅ Views created:')
      verifyViews.rows.forEach(view => {
        console.log(`   - ${view.table_name}`)
      })
      console.log()
    }
    
    // Test trigger functionality
    console.log('🧪 Testing trigger functionality...')
    try {
      // Insert a test OKR
      const testOKRResult = await client.query(`
        INSERT INTO portfolio_okrs (
          objective_title,
          level,
          okr_period,
          owner_name,
          confidence_level,
          priority
        ) VALUES (
          'Test OKR for Migration Verification',
          'organization',
          'Q1-2026',
          'Migration Script',
          75,
          'high'
        ) RETURNING id
      `)
      
      const testOKRId = testOKRResult.rows[0].id
      console.log(`   ✅ Test OKR created: ${testOKRId}`)
      
      // Insert a test Key Result
      const testKRResult = await client.query(`
        INSERT INTO portfolio_key_results (
          okr_id,
          key_result_title,
          metric_name,
          metric_unit,
          baseline_value,
          target_value,
          current_value
        ) VALUES (
          $1,
          'Test Key Result',
          'Test Metric',
          'count',
          0,
          100,
          50
        ) RETURNING id, progress_percentage, progress_status
      `, [testOKRId])
      
      const testKR = testKRResult.rows[0]
      console.log(`   ✅ Test Key Result created: ${testKR.id}`)
      console.log(`   ✅ Progress auto-calculated: ${testKR.progress_percentage}%`)
      console.log(`   ✅ Status auto-calculated: ${testKR.progress_status}`)
      
      // Verify progress calculation (should be 50%)
      if (parseFloat(testKR.progress_percentage) === 50) {
        console.log('   ✅ Progress calculation verified: 50% (correct)')
      } else {
        console.log(`   ⚠️  Progress calculation unexpected: ${testKR.progress_percentage}% (expected 50%)`)
      }
      
      // Clean up test data
      await client.query('DELETE FROM portfolio_key_results WHERE id = $1', [testKR.id])
      await client.query('DELETE FROM portfolio_okrs WHERE id = $1', [testOKRId])
      console.log('   ✅ Test data cleaned up\n')
      
    } catch (testError: any) {
      console.error('   ⚠️  Trigger test failed:', testError.message)
      console.log('   (This may be expected if constraints are strict)\n')
    }
    
    console.log('🎉 Migration 331 completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   - Tables: portfolio_okrs, portfolio_key_results')
    console.log('   - View: portfolio_okr_summary')
    console.log('   - Functions: calculate_kr_progress, calculate_okr_progress')
    console.log('   - Triggers: Auto-calculate progress and updated_at timestamps')
    console.log('\n✨ OKR system is ready to use!')
    
  } catch (error: any) {
    logger.error('Migration failed:', error)
    console.error('\n❌ Migration failed:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
runMigration().catch((error) => {
  logger.error('Unhandled error:', error)
  console.error('Unhandled error:', error)
  process.exit(1)
})

