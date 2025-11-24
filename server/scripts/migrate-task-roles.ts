/**
 * Migration Script: Migrate Task Roles
 * 
 * Purpose: Migrate project_tasks.required_role_id to task_roles table.
 * Set role_type = 'owner' and is_primary = TRUE.
 * 
 * Usage: ts-node server/scripts/migrate-task-roles.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function migrateTaskRoles() {
  try {
    logger.info('Starting task roles migration...')
    
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('Database connected successfully')

    // Get all tasks with required_role_id
    logger.info('Step 1: Fetching tasks with required_role_id...')
    const tasksResult = await pool.query(`
      SELECT id, required_role_id, required_resource_count
      FROM project_tasks
      WHERE required_role_id IS NOT NULL
    `)

    logger.info(`Found ${tasksResult.rows.length} tasks with required_role_id`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    // Migrate each task
    for (const task of tasksResult.rows) {
      try {
        // Check if task_role already exists
        const existingResult = await pool.query(
          `SELECT id FROM task_roles 
           WHERE task_id = $1 AND role_id = $2 AND role_type = 'owner'`,
          [task.id, task.required_role_id]
        )

        if (existingResult.rows.length > 0) {
          logger.debug(`Task ${task.id} already has role ${task.required_role_id} as owner, skipping`)
          skipped++
          continue
        }

        // Verify role exists
        const roleCheck = await pool.query(
          `SELECT id FROM project_roles WHERE id = $1`,
          [task.required_role_id]
        )

        if (roleCheck.rows.length === 0) {
          logger.warn(`Role ${task.required_role_id} not found for task ${task.id}, skipping`)
          skipped++
          continue
        }

        // Create task_role entry
        await pool.query(
          `INSERT INTO task_roles (
             task_id, role_id, role_type, is_primary, required_count
           )
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (task_id, role_id, role_type) DO NOTHING`,
          [
            task.id,
            task.required_role_id,
            'owner',
            true,
            task.required_resource_count || 1
          ]
        )

        migrated++
        logger.debug(`Migrated task ${task.id} role ${task.required_role_id}`)
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation - already exists
          skipped++
          logger.debug(`Task ${task.id} role already exists, skipping`)
        } else {
          logger.error(`Error migrating task ${task.id}:`, error)
          errors++
        }
      }
    }

    // Summary
    logger.info('Migration completed!')
    logger.info(`Summary:`)
    logger.info(`  - Tasks processed: ${tasksResult.rows.length}`)
    logger.info(`  - Task roles migrated: ${migrated}`)
    logger.info(`  - Skipped: ${skipped}`)
    logger.info(`  - Errors: ${errors}`)

    logger.info('Migration completed!')
    process.exit(0)
  } catch (error) {
    logger.error('Migration failed:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Run migration
migrateTaskRoles()

