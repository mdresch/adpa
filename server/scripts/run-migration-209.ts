/**
 * Migration Runner: Stakeholder-Role-Task-Skills Integration
 * Purpose: Run migration 209 to create comprehensive relationship model linking stakeholders, roles, tasks, and skills
 * Usage: npm run migrate:209 or ts-node server/scripts/run-migration-209.ts
 * 
 * This migration:
 * - Links stakeholders to users (all users should be stakeholders)
 * - Normalizes skills and competencies into separate tables
 * - Creates junction tables for role-skills, stakeholder-skills, stakeholder-roles, task-roles
 * - Enables multiple roles per task
 * - Supports skills matching between stakeholders and roles
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/209_stakeholder_role_skills_integration.sql')
  
  try {
    logger.info('🚀 Starting migration 209: Stakeholder-Role-Task-Skills Integration')
    logger.info('=' .repeat(70))
    
    // Connect to database first
    logger.info('🔌 Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('✅ Database connected successfully')
    
    // Read migration SQL
    logger.info(`📄 Reading migration file: ${path.basename(migrationFile)}`)
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8')
    
    // Execute migration
    logger.info('⚙️  Executing migration SQL...')
    logger.info('   This may take a few moments...')
    
    await pool.query(migrationSQL)
    
    logger.info('✅ Migration SQL executed successfully!')
    
    // Verify tables were created
    logger.info('🔍 Verifying new tables...')
    const tablesToCheck = [
      'skills',
      'competencies',
      'role_skills',
      'role_competencies',
      'stakeholder_skills',
      'stakeholder_competencies',
      'stakeholder_role_assignments',
      'task_roles'
    ]
    
    const tableResults = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (${tablesToCheck.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY table_name
    `, tablesToCheck)
    
    logger.info('📊 Tables created:')
    tableResults.rows.forEach(row => {
      logger.info(`   ✓ ${row.table_name}`)
    })
    
    if (tableResults.rows.length !== tablesToCheck.length) {
      const createdTables = new Set(tableResults.rows.map((r: any) => r.table_name))
      const missingTables = tablesToCheck.filter(t => !createdTables.has(t))
      logger.warn(`⚠️  Some tables may not have been created: ${missingTables.join(', ')}`)
    }
    
    // Verify user_id column was added to stakeholders
    logger.info('🔍 Verifying stakeholders.user_id column...')
    const columnResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stakeholders'
      AND column_name = 'user_id'
    `)
    
    if (columnResult.rows.length > 0) {
      logger.info(`   ✓ user_id column added (${columnResult.rows[0].data_type})`)
    } else {
      logger.warn('   ⚠️  user_id column not found (may already exist)')
    }
    
    // Verify indexes were created
    logger.info('🔍 Verifying indexes...')
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (
        indexname LIKE 'idx_skills%' OR
        indexname LIKE 'idx_competencies%' OR
        indexname LIKE 'idx_role_skills%' OR
        indexname LIKE 'idx_role_competencies%' OR
        indexname LIKE 'idx_stakeholder_skills%' OR
        indexname LIKE 'idx_stakeholder_competencies%' OR
        indexname LIKE 'idx_stakeholder_role_assignments%' OR
        indexname LIKE 'idx_task_roles%' OR
        indexname LIKE 'idx_stakeholders_user_id'
      )
      ORDER BY indexname
    `)
    
    logger.info(`📊 Indexes created: ${indexResult.rows.length}`)
    if (indexResult.rows.length > 0) {
      indexResult.rows.slice(0, 10).forEach((row: any) => {
        logger.info(`   ✓ ${row.indexname}`)
      })
      if (indexResult.rows.length > 10) {
        logger.info(`   ... and ${indexResult.rows.length - 10} more`)
      }
    }
    
    // Verify function was created
    logger.info('🔍 Verifying helper function...')
    const functionResult = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'calculate_skill_match'
    `)
    
    if (functionResult.rows.length > 0) {
      logger.info('   ✓ calculate_skill_match function created')
    } else {
      logger.warn('   ⚠️  calculate_skill_match function not found')
    }
    
    // Check task_roles migration
    logger.info('🔍 Verifying task roles migration...')
    const taskRolesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM task_roles
    `)
    
    logger.info(`   ✓ ${taskRolesResult.rows[0].count} task roles migrated from existing tasks`)
    
    // Summary
    logger.info('')
    logger.info('=' .repeat(70))
    logger.info('✨ Migration 209 completed successfully! ✨')
    logger.info('')
    logger.info('📋 Summary:')
    logger.info('   • Stakeholder-user linkage enabled')
    logger.info('   • Normalized skills and competencies tables created')
    logger.info('   • Junction tables for role/stakeholder assignments created')
    logger.info('   • Multiple roles per task enabled')
    logger.info('   • Skills matching function available')
    logger.info('')
    logger.info('📝 Next steps:')
    logger.info('   1. Run data migration scripts:')
    logger.info('      - ts-node server/scripts/migrate-skills-to-normalized.ts')
    logger.info('      - ts-node server/scripts/link-users-to-stakeholders.ts')
    logger.info('      - ts-node server/scripts/migrate-task-roles.ts')
    logger.info('   2. Test API endpoints for skills, competencies, and role assignments')
    logger.info('   3. Build frontend components for skills management')
    logger.info('')
    
    process.exit(0)
  } catch (error: any) {
    logger.error('❌ Migration 209 failed:', error)
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    
    logger.info('')
    logger.info('💡 Troubleshooting:')
    logger.info('   • Check database connection string in .env file')
    logger.info('   • Ensure database user has CREATE TABLE permissions')
    logger.info('   • Verify no conflicting tables/columns exist')
    logger.info('   • Check PostgreSQL logs for detailed error messages')
    logger.info('')
    
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('⚠️  Migration interrupted by user')
  if (pool) {
    await pool.end()
  }
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.info('⚠️  Migration terminated')
  if (pool) {
    await pool.end()
  }
  process.exit(1)
})

// Run migration
runMigration()

