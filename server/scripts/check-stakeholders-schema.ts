import { pool, connectDatabase } from '../src/database/connection'

async function checkSchema() {
  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }

    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stakeholders'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 stakeholders table columns:')
    console.log(JSON.stringify(columnsResult.rows, null, 2))

    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    if (pool) await pool.end()
    process.exit(1)
  }
}

void checkSchema()
