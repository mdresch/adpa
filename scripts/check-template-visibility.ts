import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'

async function checkTemplateVisibility() {
  try {
    // Get a user ID
    const userResult = await pool.query('SELECT id, email FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id
    
    logger.info(`Testing with user: ${userResult.rows[0]?.email} (${userId})`)
    
    // Test the exact query the API uses
    const result = await pool.query(`
      SELECT t.id, t.name, t.framework, t.is_public, t.deleted_at, t.created_by
      FROM templates t
      WHERE (t.is_public = true OR t.created_by = $1)
        AND t.deleted_at IS NULL
      ORDER BY t.name
      LIMIT 100
    `, [userId])
    
    logger.info(`\n📊 Templates visible to this user: ${result.rows.length}`)
    
    result.rows.forEach((t, i) => {
      const visibility = t.is_public ? '🌐 public' : '🔒 private'
      logger.info(`  ${i+1}. ${t.name} (${t.framework}) ${visibility}`)
    })
    
    // Check total templates
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM templates WHERE deleted_at IS NULL')
    logger.info(`\n📈 Total non-deleted templates in DB: ${totalResult.rows[0].count}`)
    
    // Check public templates
    const publicResult = await pool.query('SELECT COUNT(*) as count FROM templates WHERE is_public = true AND deleted_at IS NULL')
    logger.info(`🌐 Public templates: ${publicResult.rows[0].count}`)
    
  } catch (error) {
    logger.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkTemplateVisibility()

