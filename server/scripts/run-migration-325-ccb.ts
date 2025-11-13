/**
 * Run Migration 325: Update Approval Workflows for CCB Routing
 * 
 * This script updates approval workflows to route change requests to CCB (Change Control Board)
 * 
 * Usage:
 *   npm run migrate:325:ccb
 *   npx tsx server/scripts/run-migration-325-ccb.ts
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
    console.log('🚀 Running Migration 325: Update Approval Workflows for CCB Routing\n')
    
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/325_update_approval_workflows_for_ccb.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n')
    
    // Check current workflows before migration
    console.log('🔍 Checking current workflows...')
    const beforeResult = await client.query(`
      SELECT workflow_type, name, is_active, 
             approval_stages->0->>'role' as first_stage_role
      FROM approval_workflows 
      WHERE workflow_type IN ('general_cr', 'scope_change', 'timeline_change', 'technical_change')
      ORDER BY workflow_type
    `)
    
    if (beforeResult.rows.length > 0) {
      console.log('\n📋 Current workflows:')
      beforeResult.rows.forEach(row => {
        console.log(`   ${row.workflow_type}: ${row.name} (active: ${row.is_active}, role: ${row.first_stage_role || 'N/A'})`)
      })
    } else {
      console.log('   No existing workflows found for these types\n')
    }
    
    // Execute migration
    console.log('\n🔄 Executing migration...')
    await client.query('BEGIN')
    
    try {
      // Execute the migration SQL
      await client.query(migrationSQL)
      await client.query('COMMIT')
      
      console.log('✅ Migration executed successfully\n')
      
      // Verify workflows after migration
      console.log('🔍 Verifying updated workflows...')
      const afterResult = await client.query(`
        SELECT workflow_type, name, is_active, 
               approval_stages->0->>'role' as first_stage_role,
               approval_stages->>0 as first_stage_json
        FROM approval_workflows 
        WHERE workflow_type IN ('general_cr', 'scope_change', 'timeline_change', 'technical_change')
          AND is_active = true
        ORDER BY workflow_type
      `)
      
      if (afterResult.rows.length > 0) {
        console.log('\n✅ Updated workflows (active):')
        afterResult.rows.forEach(row => {
          const stageRole = row.first_stage_role || 'N/A'
          const isCCB = stageRole === 'ccb' ? '✅ CCB' : `⚠️  ${stageRole}`
          console.log(`   ${row.workflow_type}: ${row.name}`)
          console.log(`      First stage role: ${isCCB}`)
        })
        
        // Check if CCB workflows are properly configured
        const ccbWorkflows = afterResult.rows.filter(row => row.first_stage_role === 'ccb')
        if (ccbWorkflows.length === 4) {
          console.log('\n🎉 Success! All 4 change request workflows are now routed to CCB')
        } else {
          console.log(`\n⚠️  Warning: Expected 4 CCB workflows, found ${ccbWorkflows.length}`)
        }
      } else {
        console.log('\n⚠️  Warning: No active workflows found after migration')
      }
      
      // Check for CCB users
      console.log('\n👥 Checking for CCB users...')
      const ccbUsersResult = await client.query(`
        SELECT id, email, name, role 
        FROM users 
        WHERE role = 'ccb'
        ORDER BY created_at ASC
      `)
      
      if (ccbUsersResult.rows.length > 0) {
        console.log(`✅ Found ${ccbUsersResult.rows.length} CCB user(s):`)
        ccbUsersResult.rows.forEach(user => {
          console.log(`   - ${user.name || user.email} (${user.email})`)
        })
      } else {
        console.log('⚠️  No users with CCB role found')
        console.log('\n💡 To assign CCB role to users, run:')
        console.log('   UPDATE users SET role = \'ccb\' WHERE email IN (\'user@example.com\');')
        console.log('   Or use the Users & Roles page in the UI')
      }
      
      console.log('\n✅ Migration 325 completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   1. Assign CCB role to users who should be CCB members')
      console.log('   2. Test creating a change request to verify CCB routing')
      console.log('   3. Check /approvals page to see CCB-assigned requests')
      
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

