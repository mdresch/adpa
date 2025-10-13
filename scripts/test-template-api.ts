import { pool } from '../server/src/database/connection'
import { logger } from '../server/src/utils/logger'

async function testTemplateAPI() {
  try {
    // Get a user for testing
    const userResult = await pool.query('SELECT id, email, role FROM users LIMIT 1')
    const user = userResult.rows[0]
    
    logger.info(`Testing with user: ${user.email} (${user.role})`)
    
    // Simulate what the API does - exact query from service
    const query = `
      SELECT t.id, t.name, t.framework, t.is_public, t.created_by
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.is_public = true OR t.created_by = $1)
        AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 100
      OFFSET 0
    `
    
    const result = await pool.query(query, [user.id])
    
    logger.info(`\n✅ Query returned ${result.rows.length} templates`)
    
    // Group by framework
    const byFramework = result.rows.reduce((acc: any, t: any) => {
      acc[t.framework] = (acc[t.framework] || 0) + 1
      return acc
    }, {})
    
    logger.info('\n📊 Templates by framework:')
    Object.entries(byFramework).forEach(([fw, count]) => {
      logger.info(`  ${fw}: ${count}`)
    })
    
    // Show a few examples
    logger.info('\n📋 Sample templates:')
    result.rows.slice(0, 5).forEach((t: any, i: number) => {
      logger.info(`  ${i+1}. ${t.name} (${t.framework}) ${t.is_public ? '[public]' : '[private]'}`)
    })
    
  } catch (error) {
    logger.error('Error:', error)
  } finally {
    await pool.end()
  }
}

testTemplateAPI()

