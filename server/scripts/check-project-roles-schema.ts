import { pool, connectDatabase } from '../src/database/connection'

async function checkSchema() {
  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }

    // Check project_roles table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_roles'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 project_roles table columns:')
    console.log(JSON.stringify(columnsResult.rows, null, 2))

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_roles'
      )
    `)

    console.log(`\n✅ Table exists: ${tableExists.rows[0].exists}`)

    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    if (pool) await pool.end()
    process.exit(1)
  }
}

void checkSchema()

