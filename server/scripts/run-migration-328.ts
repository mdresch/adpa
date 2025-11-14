/**
 * Run Migration 328: Prioritization Criteria, Scores, and Rankings (TASK-280)
 * 
 * This script creates the prioritization system tables for portfolio management:
 * - prioritization_criteria: Defines scoring criteria with weights
 * - project_priority_scores: Stores individual project scores per criterion
 * - project_priority_rankings: Computed view showing project rankings
 * 
 * Includes default 5 criteria:
 * - Strategic Alignment (30%)
 * - Value Contribution (25%)
 * - Risk Level (15%, inverted)
 * - Resource Availability (20%)
 * - Urgency (10%)
 * 
 * Usage:
 *   npm run migrate:328
 *   npx tsx server/scripts/run-migration-328.ts
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
    console.log('🚀 Running Migration 328: Prioritization Criteria, Scores, and Rankings (TASK-280)\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/328_prioritization_criteria_scores_rankings.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if tables already exist
    console.log('🔍 Checking if prioritization tables exist...')
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('prioritization_criteria', 'project_priority_scores')
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
          console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
        })
        console.log()
      }
      
      console.log('💡 To re-run migration, drop the tables first:')
      console.log('   DROP VIEW IF EXISTS project_priority_rankings CASCADE;')
      console.log('   DROP TABLE IF EXISTS project_priority_scores CASCADE;')
      console.log('   DROP TABLE IF EXISTS prioritization_criteria CASCADE;')
      console.log('   Then run this script again.\n')
      
      // Ask if user wants to continue
      console.log('⚠️  Skipping migration - tables already exist')
      return
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await client.query(migrationSQL)
      await client.query('COMMIT')
      
      console.log('✅ Migration executed successfully\n')
      
      // Verify tables were created
      console.log('🔍 Verifying table creation...')
      const verifyTables = ['prioritization_criteria', 'project_priority_scores']
      
      for (const tableName of verifyTables) {
        const verifyResult = await client.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName])
        
        if (verifyResult.rows.length > 0) {
          console.log(`\n✅ Table ${tableName} created with columns:`)
          verifyResult.rows.forEach(row => {
            const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'
            const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : ''
            console.log(`   - ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`)
          })
        }
      }
      
      // Verify view was created
      console.log('\n🔍 Verifying view creation...')
      const viewResult = await client.query(`
        SELECT table_name, view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'project_priority_rankings'
      `)
      
      if (viewResult.rows.length > 0) {
        console.log('\n✅ View project_priority_rankings created')
      }
      
      // Verify indexes
      console.log('\n🔍 Verifying indexes...')
      const indexResult = await client.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE tablename IN ('prioritization_criteria', 'project_priority_scores')
        ORDER BY tablename, indexname
      `)
      
      if (indexResult.rows.length > 0) {
        console.log('\n✅ Indexes created:')
        let currentTable = ''
        indexResult.rows.forEach(row => {
          if (row.tablename !== currentTable) {
            currentTable = row.tablename
            console.log(`   ${currentTable}:`)
          }
          console.log(`     - ${row.indexname}`)
        })
      }
      
      // Verify constraints
      console.log('\n🔍 Verifying constraints...')
      const constraintResult = await client.query(`
        SELECT 
          conrelid::regclass::text as table_name,
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('prioritization_criteria', 'project_priority_scores')
        ORDER BY conrelid::regclass::text, contype, conname
      `)
      
      if (constraintResult.rows.length > 0) {
        console.log('\n✅ Constraints:')
        let currentTable = ''
        constraintResult.rows.forEach(row => {
          if (row.table_name !== currentTable) {
            currentTable = row.table_name
            console.log(`   ${currentTable}:`)
          }
          const typeMap: Record<string, string> = {
            'p': 'PRIMARY KEY',
            'u': 'UNIQUE',
            'f': 'FOREIGN KEY',
            'c': 'CHECK'
          }
          const type = typeMap[row.constraint_type] || row.constraint_type
          console.log(`     - ${row.constraint_name}: ${type}`)
          if (row.constraint_type === 'c') {
            console.log(`       ${row.constraint_definition}`)
          }
        })
      }
      
      // Verify triggers
      console.log('\n🔍 Verifying triggers...')
      const triggerResult = await client.query(`
        SELECT 
          event_object_table as table_name,
          trigger_name, 
          event_manipulation, 
          action_timing
        FROM information_schema.triggers
        WHERE event_object_table IN ('prioritization_criteria', 'project_priority_scores')
        ORDER BY event_object_table, trigger_name
      `)
      
      if (triggerResult.rows.length > 0) {
        console.log('\n✅ Triggers:')
        let currentTable = ''
        triggerResult.rows.forEach(row => {
          if (row.table_name !== currentTable) {
            currentTable = row.table_name
            console.log(`   ${currentTable}:`)
          }
          console.log(`     - ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`)
        })
      }
      
      // Verify functions
      console.log('\n🔍 Verifying functions...')
      const functionResult = await client.query(`
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_name IN ('calculate_weighted_score', 'update_updated_at_column')
        AND routine_schema = 'public'
        ORDER BY routine_name
      `)
      
      if (functionResult.rows.length > 0) {
        console.log('\n✅ Functions created:')
        functionResult.rows.forEach(row => {
          console.log(`   - ${row.routine_name} (${row.routine_type})`)
        })
      }
      
      // Verify default criteria were inserted
      console.log('\n🔍 Verifying default criteria...')
      const criteriaResult = await client.query(`
        SELECT name, weight, sort_order, is_inverted, is_active
        FROM prioritization_criteria
        WHERE is_active = TRUE
        ORDER BY sort_order
      `)
      
      if (criteriaResult.rows.length > 0) {
        console.log('\n✅ Default criteria inserted:')
        let totalWeight = 0
        criteriaResult.rows.forEach(row => {
          totalWeight += parseFloat(row.weight)
          const inverted = row.is_inverted ? ' (inverted)' : ''
          console.log(`   ${row.sort_order}. ${row.name}: ${row.weight}%${inverted}`)
        })
        console.log(`\n   Total weight: ${totalWeight}%`)
        if (totalWeight === 100.0) {
          console.log('   ✅ Weights sum to 100%')
        } else {
          console.log(`   ⚠️  Warning: Weights sum to ${totalWeight}%, expected 100%`)
        }
      }
      
      // Test weighted score calculation
      console.log('\n🔍 Testing weighted score calculation...')
      const testCriteriaResult = await client.query(`
        SELECT id, name, weight FROM prioritization_criteria WHERE name = 'Strategic Alignment' LIMIT 1
      `)
      
      if (testCriteriaResult.rows.length > 0) {
        const testCriteria = testCriteriaResult.rows[0]
        const testRawScore = 5
        const expectedWeighted = testRawScore * (parseFloat(testCriteria.weight) / 100.0)
        
        // Create a test project if one doesn't exist
        const testProjectResult = await client.query(`
          SELECT id FROM projects LIMIT 1
        `)
        
        if (testProjectResult.rows.length > 0) {
          const testProjectId = testProjectResult.rows[0].id
          
          // Insert test score
          await client.query(`
            INSERT INTO project_priority_scores (project_id, criteria_id, raw_score)
            VALUES ($1, $2, $3)
            ON CONFLICT (project_id, criteria_id) DO UPDATE SET raw_score = EXCLUDED.raw_score
          `, [testProjectId, testCriteria.id, testRawScore])
          
          // Verify weighted score was calculated
          const scoreResult = await client.query(`
            SELECT raw_score, weighted_score
            FROM project_priority_scores
            WHERE project_id = $1 AND criteria_id = $2
          `, [testProjectId, testCriteria.id])
          
          if (scoreResult.rows.length > 0) {
            const calculatedWeighted = parseFloat(scoreResult.rows[0].weighted_score)
            if (Math.abs(calculatedWeighted - expectedWeighted) < 0.0001) {
              console.log(`   ✅ Weighted score calculation works correctly`)
              console.log(`      Raw score: ${testRawScore}, Weight: ${testCriteria.weight}%, Calculated: ${calculatedWeighted.toFixed(4)}`)
            } else {
              console.log(`   ⚠️  Weighted score mismatch: expected ${expectedWeighted}, got ${calculatedWeighted}`)
            }
            
            // Clean up test score
            await client.query(`
              DELETE FROM project_priority_scores
              WHERE project_id = $1 AND criteria_id = $2
            `, [testProjectId, testCriteria.id])
          }
        } else {
          console.log('   ⚠️  No projects found - skipping weighted score test')
        }
      }
      
      console.log('\n✅ Migration 328 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Create API routes for prioritization (GET/POST /api/prioritization/criteria)')
      console.log('   2. Create API routes for scoring (POST /api/prioritization/scores)')
      console.log('   3. Create API routes for rankings (GET /api/prioritization/rankings)')
      console.log('   4. Build frontend UI components for scoring interface')
      console.log('   5. Add prioritization dashboard to program pages')
      console.log('   6. Implement export functionality (Excel/PDF)')
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    logger.error('Migration failed:', error)
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error)
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'N/A')
    process.exit(1)
  } finally {
    client.release()
    // Don't close the pool - let it stay open for other operations
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Migration interrupted by user')
  const pool = getDatabasePool()
  await pool.end()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.info('Migration terminated')
  const pool = getDatabasePool()
  await pool.end()
  process.exit(1)
})

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

