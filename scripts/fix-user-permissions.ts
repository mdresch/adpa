/**
 * Script to fix user permissions
 * Grants default permissions to all existing users
 */

import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'

const DEFAULT_USER_PERMISSIONS = {
  'projects.create': true,
  'projects.read': true,
  'projects.update': true,
  'projects.delete': true,
  'documents.create': true,
  'documents.read': true,
  'documents.update': true,
  'documents.delete': true,
  'templates.create': true,
  'templates.read': true,
  'templates.update': true,
  'templates.delete': true,
  'stakeholders.create': true,
  'stakeholders.read': true,
  'stakeholders.update': true,
  'stakeholders.delete': true,
}

const ADMIN_PERMISSIONS = {
  'admin': true,
  ...DEFAULT_USER_PERMISSIONS,
  'users.create': true,
  'users.read': true,
  'users.update': true,
  'users.delete': true,
  'settings.read': true,
  'settings.update': true,
  'integrations.create': true,
  'integrations.read': true,
  'integrations.update': true,
  'integrations.delete': true,
}

async function fixUserPermissions() {
  try {
    logger.info('🔧 Starting user permissions fix...')

    // Get all users
    const usersResult = await pool.query('SELECT id, email, role, permissions FROM users')
    const users = usersResult.rows

    logger.info(`Found ${users.length} users`)

    let updatedCount = 0

    for (const user of users) {
      const currentPermissions = user.permissions || {}
      let needsUpdate = false
      let newPermissions: any

      if (user.role === 'admin') {
        newPermissions = { ...ADMIN_PERMISSIONS, ...currentPermissions }
        needsUpdate = true
      } else {
        // Check if user has any permissions
        const hasPermissions = currentPermissions && Object.keys(currentPermissions).length > 0
        if (!hasPermissions) {
          newPermissions = { ...DEFAULT_USER_PERMISSIONS }
          needsUpdate = true
        } else {
          // Add missing default permissions
          newPermissions = { ...DEFAULT_USER_PERMISSIONS, ...currentPermissions }
          needsUpdate = JSON.stringify(newPermissions) !== JSON.stringify(currentPermissions)
        }
      }

      if (needsUpdate) {
        await pool.query(
          'UPDATE users SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(newPermissions), user.id]
        )
        logger.info(`✅ Updated permissions for ${user.email} (${user.role})`)
        updatedCount++
      } else {
        logger.info(`⏭️  Skipped ${user.email} - already has correct permissions`)
      }
    }

    logger.info(`✅ Successfully updated ${updatedCount} out of ${users.length} users`)
    
    // Display summary
    const summaryResult = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN permissions IS NOT NULL AND permissions != '{}'::jsonb THEN 1 END) as with_permissions
      FROM users
      GROUP BY role
    `)
    
    logger.info('\n📊 User Permissions Summary:')
    summaryResult.rows.forEach(row => {
      logger.info(`  ${row.role}: ${row.with_permissions}/${row.count} users have permissions`)
    })

  } catch (error) {
    logger.error('❌ Error fixing user permissions:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
fixUserPermissions()
  .then(() => {
    logger.info('✅ User permissions fix completed')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ User permissions fix failed:', error)
    process.exit(1)
  })

