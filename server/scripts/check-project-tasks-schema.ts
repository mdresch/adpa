import { pool, connectDatabase } from '../src/database/connection'

async function checkSchema() {
  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }

    // Check for both possible column names
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      AND column_name IN ('parent_task_id', 'parent_id')
      ORDER BY column_name
    `)

    console.log('\n📋 Parent task columns in project_tasks:')
    console.log(JSON.stringify(result.rows, null, 2))

    // Also check all columns to see the full structure
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 All columns in project_tasks:')
    allColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })

    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    if (pool) await pool.end()
    process.exit(1)
  }
}

void checkSchema()

