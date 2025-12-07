/**
 * Run Migration 360: Optimize Extraction Count Queries (Phase 4)
 * 
 * This script creates PostgreSQL functions to optimize entity count queries:
 * - safe_count_entity(): Safely counts entities from a table, returning 0 if table doesn't exist
 * - get_all_entity_counts(): Returns all 63 entity counts for a project as JSONB
 * 
 * This replaces 63 separate queries with a single function call, significantly
 * improving performance for extraction job finalization.
 * 
 * Usage:
 *   npm run migrate:360
 *   npx tsx server/scripts/run-migration-360.ts
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
    console.log('🚀 Running Migration 360: Optimize Extraction Count Queries (Phase 4)\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/360_optimize_extraction_count_queries.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check if functions already exist
    console.log('🔍 Checking if functions already exist...')
    const functionsCheck = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('safe_count_entity', 'get_all_entity_counts')
      ORDER BY routine_name
    `)
    
    if (functionsCheck.rows.length > 0) {
      console.log('⚠️  Some functions already exist:')
      functionsCheck.rows.forEach(row => {
        console.log(`   - ${row.routine_name} (${row.routine_type})`)
      })
      console.log('\n   Functions will be replaced (CREATE OR REPLACE).\n')
    } else {
      console.log('✅ Functions do not exist - will be created.\n')
    }
    
    // Execute migration
    console.log('🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await client.query(migrationSQL)
      await client.query('COMMIT')
      
      console.log('✅ Migration executed successfully\n')
      
      // Verify functions were created
      console.log('🔍 Verifying function creation...')
      const verifyFunctions = ['safe_count_entity', 'get_all_entity_counts']
      
      for (const functionName of verifyFunctions) {
        const verifyResult = await client.query(`
          SELECT 
            routine_name,
            routine_type,
            data_type as return_type,
            routine_definition
          FROM information_schema.routines
          WHERE routine_schema = 'public'
          AND routine_name = $1
        `, [functionName])
        
        if (verifyResult.rows.length > 0) {
          const func = verifyResult.rows[0]
          console.log(`\n✅ Function ${functionName} created:`)
          console.log(`   Type: ${func.routine_type}`)
          console.log(`   Returns: ${func.return_type}`)
          const defLength = func.routine_definition?.length || 0
          console.log(`   Definition length: ${defLength} characters`)
        } else {
          console.log(`\n❌ Function ${functionName} not found after migration`)
        }
      }
      
      // Test the functions with a sample project
      console.log('\n🔍 Testing functions with sample project...')
      const testProjectResult = await client.query(`
        SELECT id FROM projects LIMIT 1
      `)
      
      if (testProjectResult.rows.length > 0) {
        const testProjectId = testProjectResult.rows[0].id
        console.log(`   Using test project: ${testProjectId}`)
        
        // Test safe_count_entity with a known table
        console.log('\n   Testing safe_count_entity() with "stakeholders" table...')
        const testSafeCount = await client.query(`
          SELECT safe_count_entity('stakeholders', $1) as count
        `, [testProjectId])
        
        if (testSafeCount.rows.length > 0) {
          const count = testSafeCount.rows[0].count
          console.log(`   ✅ safe_count_entity() returned: ${count} stakeholders`)
        }
        
        // Test safe_count_entity with a non-existent table (should return 0)
        console.log('\n   Testing safe_count_entity() with non-existent table...')
        const testNonExistent = await client.query(`
          SELECT safe_count_entity('non_existent_table_xyz', $1) as count
        `, [testProjectId])
        
        if (testNonExistent.rows.length > 0) {
          const count = testNonExistent.rows[0].count
          if (count === 0) {
            console.log(`   ✅ safe_count_entity() correctly returned 0 for non-existent table`)
          } else {
            console.log(`   ⚠️  safe_count_entity() returned ${count} (expected 0)`)
          }
        }
        
        // Test get_all_entity_counts
        console.log('\n   Testing get_all_entity_counts()...')
        const startTime = Date.now()
        const testAllCounts = await client.query(`
          SELECT get_all_entity_counts($1) as counts
        `, [testProjectId])
        const queryTime = Date.now() - startTime
        
        if (testAllCounts.rows.length > 0) {
          const counts = testAllCounts.rows[0].counts
          const countKeys = Object.keys(counts)
          console.log(`   ✅ get_all_entity_counts() returned ${countKeys.length} entity counts`)
          console.log(`   ⚡ Query executed in ${queryTime}ms`)
          
          // Show sample counts
          console.log('\n   Sample counts:')
          const sampleEntities = ['stakeholders', 'requirements', 'risks', 'milestones', 'constraints']
          sampleEntities.forEach(entity => {
            if (counts[entity] !== undefined) {
              console.log(`     - ${entity}: ${counts[entity]}`)
            }
          })
          
          // Verify all expected entities are present
          const expectedEntities = [
            'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
            'success_criteria', 'best_practices', 'phases', 'resources', 'technologies',
            'quality_standards', 'compliance_security', 'deliverables', 'scope_items', 'activities',
            'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
            'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities',
            'risk_responses', 'performance_actuals', 'governance_decisions', 'approval_workflows',
            'steering_committees', 'change_control_boards', 'policy_compliance', 'scope_baselines',
            'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
            'schedule_baselines', 'schedule_activities', 'critical_path_activities', 'schedule_variances',
            'schedule_forecasts', 'budget_baselines', 'cost_actuals', 'cost_estimates',
            'funding_tranches', 'financial_variances', 'procurement_costs', 'resource_assignments',
            'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts',
            'onboarding_offboarding', 'risk_assessments', 'risk_response_plans', 'risk_triggers',
            'risk_reviews', 'contingency_reserves', 'risk_metrics', 'engagement_actions',
            'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'
          ]
          
          const missingEntities = expectedEntities.filter(entity => counts[entity] === undefined)
          if (missingEntities.length === 0) {
            console.log('\n   ✅ All 63 expected entity types are present in the result')
          } else {
            console.log(`\n   ⚠️  Missing ${missingEntities.length} entity types:`)
            missingEntities.forEach(entity => {
              console.log(`     - ${entity}`)
            })
          }
        } else {
          console.log('   ❌ get_all_entity_counts() returned no results')
        }
      } else {
        console.log('   ⚠️  No projects found - skipping function tests')
        console.log('   💡 Functions were created but not tested')
      }
      
      // Check function comments
      console.log('\n🔍 Verifying function comments...')
      const commentsResult = await client.query(`
        SELECT 
          obj_description(oid, 'pg_proc') as comment,
          proname as function_name
        FROM pg_proc
        WHERE proname IN ('safe_count_entity', 'get_all_entity_counts')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY proname
      `)
      
      if (commentsResult.rows.length > 0) {
        console.log('\n✅ Function comments:')
        commentsResult.rows.forEach(row => {
          if (row.comment) {
            console.log(`   ${row.function_name}: ${row.comment}`)
          } else {
            console.log(`   ${row.function_name}: (no comment)`)
          }
        })
      }
      
      console.log('\n✅ Migration 360 completed successfully!')
      console.log('\n📚 Performance Benefits:')
      console.log('   - Before: 63 separate database queries (even with Promise.all)')
      console.log('   - After: 1 PostgreSQL function call')
      console.log('   - Handles missing tables gracefully (returns 0)')
      console.log('   - Significantly reduces query overhead and latency')
      console.log('\n💡 Next steps:')
      console.log('   - The ExtractionOrchestrationService will automatically use these functions')
      console.log('   - Monitor extraction job performance to see improvements')
      console.log('   - Fallback to individual queries if functions don\'t exist (backward compatible)')
      
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

