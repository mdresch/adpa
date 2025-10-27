import { pool, connectDatabase } from '../src/database/connection'

async function checkSchema() {
  try {
    await connectDatabase()
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'templates'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Templates table columns:')
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkSchema()

