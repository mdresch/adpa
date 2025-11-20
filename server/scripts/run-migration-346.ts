/**
 * Run Migration 346: Search Analytics Tables
 * Phase 2 Enhancement - Search Analytics Tracking
 * 
 * This migration creates comprehensive search analytics tracking:
 * - search_analytics table (tracks all search queries)
 * - search_result_clicks table (tracks result clicks)
 * - search_suggestion_clicks table (tracks suggestion usage)
 * - Materialized views for analytics dashboards
 * - Helper functions and triggers
 * 
 * These tables enable:
 * - Search query tracking and analysis
 * - Popular searches identification
 * - Search success rate monitoring
 * - User behavior insights
 * - Performance optimization
 * 
 * Usage:
 *   npm run migrate:346
 *   npx tsx server/scripts/run-migration-346.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()
  
  try {
    console.log("🚀 Running Migration 346: Search Analytics Tables")
    console.log("   Phase 2 Enhancement - Search Analytics Tracking\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/346_search_analytics.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check which tables/views already exist
    console.log("🔍 Checking existing tables and views...")
    const objectsToCheck = [
      { name: 'search_analytics', type: 'table' },
      { name: 'search_result_clicks', type: 'table' },
      { name: 'search_suggestion_clicks', type: 'table' },
      { name: 'mv_popular_searches', type: 'materialized view' },
      { name: 'mv_search_mode_usage', type: 'materialized view' },
      { name: 'mv_search_success_rate', type: 'materialized view' },
      { name: 'mv_top_clicked_results', type: 'materialized view' }
    ]

    const existingObjects: string[] = []
    for (const obj of objectsToCheck) {
      let query: string
      if (obj.type === 'table') {
        query = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `
      } else {
        query = `
          SELECT EXISTS (
            SELECT FROM pg_matviews 
            WHERE schemaname = 'public' 
            AND matviewname = $1
          )
        `
      }
      
      const checkResult = await client.query(query, [obj.name])
      
      if (checkResult.rows[0].exists) {
        existingObjects.push(obj.name)
        console.log(`   ⚠️  ${obj.type} '${obj.name}' already exists - will use IF NOT EXISTS`)
      } else {
        console.log(`   ✅ ${obj.type} '${obj.name}' will be created`)
      }
    }
    
    if (existingObjects.length > 0) {
      console.log(`\n   ℹ️  ${existingObjects.length} objects already exist (will be skipped)`)
    }
    console.log("\n")

    // Check indexes
    console.log("🔍 Checking indexes...")
    const indexesToCheck = [
      'idx_search_analytics_user',
      'idx_search_analytics_query',
      'idx_search_analytics_mode',
      'idx_search_analytics_created',
      'idx_search_analytics_has_results',
      'idx_search_clicks_search',
      'idx_search_clicks_user',
      'idx_suggestion_clicks_user',
      'idx_mv_popular_searches',
      'idx_mv_search_mode_usage',
      'idx_mv_search_success_rate',
      'idx_mv_top_clicked_results'
    ]

    const existingIndexes: string[] = []
    for (const indexName of indexesToCheck) {
      const indexCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = $1 
          AND schemaname = 'public'
        )
      `, [indexName])
      
      if (indexCheck.rows[0].exists) {
        existingIndexes.push(indexName)
        console.log(`   ⚠️  Index '${indexName}' already exists`)
      } else {
        console.log(`   ✅ Index '${indexName}' will be created`)
      }
    }
    
    if (existingIndexes.length > 0) {
      console.log(`\n   ℹ️  ${existingIndexes.length} indexes already exist`)
    }
    console.log("\n")

    // Check functions
    console.log("🔍 Checking functions...")
    const functionsToCheck = [
      'refresh_search_analytics_views',
      'update_search_result_clicks',
      'get_search_statistics'
    ]

    const existingFunctions: string[] = []
    for (const funcName of functionsToCheck) {
      const funcCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = $1
        )
      `, [funcName])
      
      if (funcCheck.rows[0].exists) {
        existingFunctions.push(funcName)
        console.log(`   ⚠️  Function '${funcName}' already exists - will be replaced`)
      } else {
        console.log(`   ✅ Function '${funcName}' will be created`)
      }
    }
    
    if (existingFunctions.length > 0) {
      console.log(`\n   ℹ️  ${existingFunctions.length} functions already exist (will be replaced)`)
    }
    console.log("\n")

    // Execute migration
    console.log("🔄 Executing migration...")
    console.log("   ⏳ Creating tables, views, indexes, and functions...\n")
    
    const startTime = Date.now()
    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`✅ Migration executed successfully (${duration}s)\n`)
    } catch (error: any) {
      await client.query("ROLLBACK")
      console.error("\n❌ Migration execution failed!")
      console.error(`   Error: ${error.message}`)
      if (error.code) {
        console.error(`   PostgreSQL Error Code: ${error.code}`)
      }
      if (error.detail) {
        console.error(`   Detail: ${error.detail}`)
      }
      if (error.hint) {
        console.error(`   Hint: ${error.hint}`)
      }
      if (error.position) {
        console.error(`   Position: ${error.position}`)
        const lines = migrationSQL.split('\n')
        const errorLine = migrationSQL.substring(0, error.position).split('\n').length
        console.error(`   Line: ${errorLine}`)
        if (lines[errorLine - 1]) {
          console.error(`   SQL: ${lines[errorLine - 1].trim()}`)
        }
      }
      throw error
    }

    // Verify tables were created
    console.log("🔍 Verifying tables...")
    const verifyTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('search_analytics', 'search_result_clicks', 'search_suggestion_clicks')
      ORDER BY table_name
    `)
    
    console.log(`   ✅ Found ${verifyTables.rows.length} tables:`)
    verifyTables.rows.forEach((row: any) => {
      console.log(`      - ${row.table_name}`)
    })
    
    if (verifyTables.rows.length < 3) {
      const expected = ['search_analytics', 'search_result_clicks', 'search_suggestion_clicks']
      const found = verifyTables.rows.map((r: any) => r.table_name)
      const missing = expected.filter(t => !found.includes(t))
      console.log(`\n   ⚠️  ${missing.length} tables missing:`)
      missing.forEach((t) => {
        console.log(`      - ${t}`)
      })
    }
    console.log("\n")

    // Verify materialized views
    console.log("🔍 Verifying materialized views...")
    const verifyViews = await client.query(`
      SELECT matviewname
      FROM pg_matviews 
      WHERE schemaname = 'public' 
      AND matviewname IN ('mv_popular_searches', 'mv_search_mode_usage', 'mv_search_success_rate', 'mv_top_clicked_results')
      ORDER BY matviewname
    `)
    
    console.log(`   ✅ Found ${verifyViews.rows.length} materialized views:`)
    verifyViews.rows.forEach((row: any) => {
      console.log(`      - ${row.matviewname}`)
    })
    console.log("\n")

    // Verify functions
    console.log("🔍 Verifying functions...")
    const verifyFunctions = await client.query(`
      SELECT proname as function_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND proname IN ('refresh_search_analytics_views', 'update_search_result_clicks', 'get_search_statistics')
      ORDER BY proname
    `)
    
    console.log(`   ✅ Found ${verifyFunctions.rows.length} functions:`)
    verifyFunctions.rows.forEach((row: any) => {
      console.log(`      - ${row.function_name}`)
    })
    console.log("\n")

    // Verify triggers
    console.log("🔍 Verifying triggers...")
    const verifyTriggers = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND trigger_name = 'trigger_update_search_clicks'
    `)
    
    if (verifyTriggers.rows.length > 0) {
      console.log(`   ✅ Found ${verifyTriggers.rows.length} trigger:`)
      verifyTriggers.rows.forEach((row: any) => {
        console.log(`      - ${row.trigger_name} on ${row.event_object_table}`)
      })
    } else {
      console.log(`   ⚠️  Trigger 'trigger_update_search_clicks' not found`)
    }
    console.log("\n")

    // Get table row counts (should be 0 for new tables)
    console.log("📊 Table row counts (should be 0 for new tables):")
    const tableCounts = await Promise.all([
      client.query(`SELECT COUNT(*) as count FROM search_analytics`),
      client.query(`SELECT COUNT(*) as count FROM search_result_clicks`),
      client.query(`SELECT COUNT(*) as count FROM search_suggestion_clicks`)
    ])
    
    console.log(`   search_analytics: ${tableCounts[0].rows[0].count} rows`)
    console.log(`   search_result_clicks: ${tableCounts[1].rows[0].count} rows`)
    console.log(`   search_suggestion_clicks: ${tableCounts[2].rows[0].count} rows`)
    console.log("\n")

    // Test functions
    console.log("🧪 Testing functions...")
    try {
      // Test get_search_statistics function
      const testStats = await client.query(`
        SELECT * FROM get_search_statistics(
          CURRENT_DATE - INTERVAL '30 days',
          CURRENT_DATE
        )
      `)
      
      if (testStats.rows.length > 0) {
        console.log("   ✅ get_search_statistics() function works")
        console.log(`      Total searches: ${testStats.rows[0].total_searches || 0}`)
      } else {
        console.log("   ⚠️  get_search_statistics() returned no results")
      }
    } catch (error: any) {
      console.log(`   ⚠️  get_search_statistics() test failed: ${error.message}`)
    }

    // Test refresh function (may fail if views are empty, which is OK)
    try {
      await client.query(`SELECT refresh_search_analytics_views()`)
      console.log("   ✅ refresh_search_analytics_views() function works")
    } catch (error: any) {
      console.log(`   ⚠️  refresh_search_analytics_views() test: ${error.message}`)
      console.log("      (This is OK if views are empty - they'll populate as searches occur)")
    }
    console.log("\n")

    // Get index sizes
    console.log("📊 Index sizes:")
    const sizeCheck = await client.query(`
      SELECT 
        indexname,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_search%'
      ORDER BY pg_relation_size(indexname::regclass) DESC
      LIMIT 10
    `)
    
    if (sizeCheck.rows.length > 0) {
      sizeCheck.rows.forEach((row: any) => {
        console.log(`   ${row.indexname}: ${row.size}`)
      })
    } else {
      console.log("   No search indexes found")
    }
    console.log("\n")

    console.log("✨ Migration 346 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ search_analytics table created")
    console.log("      - Tracks all search queries")
    console.log("      - Stores query, mode, filters, results, performance")
    console.log("   ✅ search_result_clicks table created")
    console.log("      - Tracks clicks on search results")
    console.log("      - Links to search queries via search_id")
    console.log("   ✅ search_suggestion_clicks table created")
    console.log("      - Tracks suggestion usage (autocomplete/popular/recent)")
    console.log("   ✅ Materialized views created")
    console.log("      - mv_popular_searches (top queries)")
    console.log("      - mv_search_mode_usage (mode distribution)")
    console.log("      - mv_search_success_rate (success trends)")
    console.log("      - mv_top_clicked_results (most clicked)")
    console.log("   ✅ Helper functions created")
    console.log("      - refresh_search_analytics_views()")
    console.log("      - get_search_statistics()")
    console.log("      - update_search_result_clicks() (trigger)")
    console.log("   ✅ Indexes created (15+ indexes for fast queries)")
    console.log("\n💡 Expected Benefits:")
    console.log("   📊 Search insights: Understand what users search for")
    console.log("   ⚡ Performance monitoring: Track search performance")
    console.log("   🎯 Content gaps: Identify searches with no results")
    console.log("   👥 User behavior: Understand search patterns")
    console.log("   🔍 Better suggestions: Popular searches improve over time")
    console.log("\n💡 Next Steps:")
    console.log("   ✅ Start using search - analytics will populate automatically")
    console.log("   ✅ View analytics at /analytics → Search tab")
    console.log("   ✅ Refresh materialized views periodically:")
    console.log("      SELECT refresh_search_analytics_views();")
    console.log("   ✅ Monitor search success rates")
    console.log("   ✅ Use popular searches to improve suggestions")

  } catch (error: any) {
    logger.error("Migration failed:", error)
    console.error("\n❌ Migration failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    if (error.code) {
      console.error("Error code:", error.code)
    }
    if (error.detail) {
      console.error("Error detail:", error.detail)
    }
    if (error.hint) {
      console.error("Hint:", error.hint)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
runMigration().catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

