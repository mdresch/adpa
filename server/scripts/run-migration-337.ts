/**
 * Run Migration 337: PMBOK 6th Edition - 49 Processes Seed Data
 * TASK: Capture PMBOK 6th Edition 49 processes for reference and compliance tracking
 * 
 * This migration seeds the database with all 49 PMBOK 6th Edition processes including:
 * - Process Groups (5): Initiating, Planning, Executing, Monitoring & Controlling, Closing
 * - Knowledge Areas (10): Integration, Scope, Schedule, Cost, Quality, Resource, 
 *   Communications, Risk, Procurement, Stakeholder
 * - Process details: Names, descriptions, inputs, tools & techniques, outputs (ITTOs)
 * 
 * Usage:
 *   npm run migrate:337
 *   npx tsx server/scripts/run-migration-337.ts
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
    console.log("🚀 Running Migration 337: PMBOK 6th Edition - 49 Processes Seed Data")
    console.log("   Capturing all 49 PMBOK 6th Edition processes for reference and compliance tracking\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/337_pmbok6_processes_seed.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    console.log("🔍 Checking if PMBOK 6th Edition tables exist...")
    
    const tablesToCheck = [
      'pmbok6_process_groups',
      'pmbok6_knowledge_areas',
      'pmbok6_processes'
    ]

    for (const tableName of tablesToCheck) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (tableCheck.rows[0].exists) {
        console.log(`   ✅ Table '${tableName}' exists`)
      } else {
        console.log(`   ⚠️  Table '${tableName}' does not exist - will be created`)
      }
    }
    console.log("\n")

    // Check if processes are already seeded (only if table exists)
    console.log("🔍 Checking if processes are already seeded...")
    let existingProcessCount = 0
    try {
      const processCountCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM pmbok6_processes
      `)
      existingProcessCount = parseInt(processCountCheck.rows[0].count || '0', 10)
      
      if (existingProcessCount > 0) {
        console.log(`   ⚠️  Found ${existingProcessCount} existing processes`)
        console.log("   ℹ️  Migration will use ON CONFLICT DO NOTHING - existing processes will be preserved")
        console.log("   ℹ️  New processes will be added if any are missing")
      } else {
        console.log("   ✅ No existing processes found - will seed all 49 processes")
      }
    } catch (error: any) {
      // Table doesn't exist yet - that's okay, migration will create it
      console.log("   ℹ️  Tables don't exist yet - will be created by migration")
    }
    console.log("\n")

    // Execute migration
    console.log("🔄 Executing migration...")
    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      console.log("✅ Migration executed successfully\n")
    } catch (error: any) {
      await client.query("ROLLBACK")
      throw error
    }

    // Verify tables were created
    console.log("🔍 Verifying table creation...")
    for (const tableName of tablesToCheck) {
      const verifyTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (verifyTable.rows[0].exists) {
        // Get row count
        const rowCount = await client.query(`
          SELECT COUNT(*) as count FROM ${tableName}
        `)
        
        console.log(`   ✅ Table '${tableName}' exists (${rowCount.rows[0].count} rows)`)
      } else {
        console.log(`   ❌ Table '${tableName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify process groups (should be 5)
    console.log("🔍 Verifying Process Groups (expected: 5)...")
    const processGroups = await client.query(`
      SELECT code, name, display_order
      FROM pmbok6_process_groups
      ORDER BY display_order
    `)
    
    if (processGroups.rows.length === 5) {
      console.log(`   ✅ Found ${processGroups.rows.length} Process Groups:`)
      processGroups.rows.forEach((pg: any) => {
        console.log(`      ${pg.display_order}. ${pg.code} - ${pg.name}`)
      })
    } else {
      console.log(`   ⚠️  Found ${processGroups.rows.length} Process Groups (expected 5)`)
    }
    console.log("\n")

    // Verify knowledge areas (should be 10)
    console.log("🔍 Verifying Knowledge Areas (expected: 10)...")
    const knowledgeAreas = await client.query(`
      SELECT code, name, display_order
      FROM pmbok6_knowledge_areas
      ORDER BY display_order
    `)
    
    if (knowledgeAreas.rows.length === 10) {
      console.log(`   ✅ Found ${knowledgeAreas.rows.length} Knowledge Areas:`)
      knowledgeAreas.rows.forEach((ka: any) => {
        console.log(`      ${ka.display_order}. ${ka.code} - ${ka.name}`)
      })
    } else {
      console.log(`   ⚠️  Found ${knowledgeAreas.rows.length} Knowledge Areas (expected 10)`)
    }
    console.log("\n")

    // Verify processes (should be 49)
    console.log("🔍 Verifying Processes (expected: 49)...")
    const processes = await client.query(`
      SELECT COUNT(*) as count
      FROM pmbok6_processes
    `)
    
    const processCount = parseInt(processes.rows[0].count, 10)
    
    if (processCount === 49) {
      console.log(`   ✅ Found ${processCount} processes (all 49 PMBOK 6th Edition processes)`)
    } else {
      console.log(`   ⚠️  Found ${processCount} processes (expected 49)`)
    }

    // Show process breakdown by knowledge area
    console.log("\n📊 Process breakdown by Knowledge Area:")
    const processBreakdown = await client.query(`
      SELECT 
        ka.name as knowledge_area,
        COUNT(p.id) as process_count
      FROM pmbok6_knowledge_areas ka
      LEFT JOIN pmbok6_processes p ON p.knowledge_area_id = ka.id
      GROUP BY ka.id, ka.name, ka.display_order
      ORDER BY ka.display_order
    `)
    
    processBreakdown.rows.forEach((row: any) => {
      console.log(`   ${row.knowledge_area}: ${row.process_count} processes`)
    })
    console.log("\n")

    // Show process breakdown by process group
    console.log("📊 Process breakdown by Process Group:")
    const groupBreakdown = await client.query(`
      SELECT 
        pg.name as process_group,
        COUNT(p.id) as process_count
      FROM pmbok6_process_groups pg
      LEFT JOIN pmbok6_processes p ON p.process_group_id = pg.id
      GROUP BY pg.id, pg.name, pg.display_order
      ORDER BY pg.display_order
    `)
    
    groupBreakdown.rows.forEach((row: any) => {
      console.log(`   ${row.process_group}: ${row.process_count} processes`)
    })
    console.log("\n")

    // Verify ITTOs are populated
    console.log("🔍 Verifying ITTOs (Inputs, Tools & Techniques, Outputs)...")
    const ittoCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(inputs) as with_inputs,
        COUNT(tools_and_techniques) as with_tools,
        COUNT(outputs) as with_outputs
      FROM pmbok6_processes
    `)
    
    const ittoStats = ittoCheck.rows[0]
    console.log(`   Total processes: ${ittoStats.total}`)
    console.log(`   With inputs: ${ittoStats.with_inputs}`)
    console.log(`   With tools & techniques: ${ittoStats.with_tools}`)
    console.log(`   With outputs: ${ittoStats.with_outputs}`)
    
    if (parseInt(ittoStats.with_inputs, 10) === 49 && 
        parseInt(ittoStats.with_tools, 10) === 49 && 
        parseInt(ittoStats.with_outputs, 10) === 49) {
      console.log("   ✅ All processes have complete ITTOs")
    } else {
      console.log("   ⚠️  Some processes may be missing ITTOs")
    }
    console.log("\n")

    // Verify indexes
    console.log("🔍 Verifying indexes...")
    const indexesToCheck = [
      'idx_pmbok6_processes_code',
      'idx_pmbok6_processes_process_group',
      'idx_pmbok6_processes_knowledge_area',
      'idx_pmbok6_processes_display_order'
    ]

    for (const indexName of indexesToCheck) {
      const indexCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )
      `, [indexName])
      
      if (indexCheck.rows[0].exists) {
        console.log(`   ✅ Index '${indexName}' exists`)
      } else {
        console.log(`   ⚠️  Index '${indexName}' not found`)
      }
    }
    console.log("\n")

    console.log("✨ Migration 337 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Build API endpoints: GET /api/pmbok6/processes")
    console.log("   - Build API endpoints: GET /api/pmbok6/process-groups")
    console.log("   - Build API endpoints: GET /api/pmbok6/knowledge-areas")
    console.log("   - Create frontend components for process browsing")
    console.log("   - Link processes to projects for compliance tracking")
    console.log("   - Implement process application tracking")

  } catch (error: any) {
    logger.error("Migration failed:", error)
    console.error("\n❌ Migration failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
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

