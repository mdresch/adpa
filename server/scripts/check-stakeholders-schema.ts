import { pool, connectDatabase } from '../src/database/connection'

async function checkSchema() {
  try {
    await connectDatabase()
    
    const result = await pool!.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stakeholders' 
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Stakeholders table columns:')
    if (result.rows.length === 0) {
      console.log('   Table does not exist or has no columns')
    } else {
      result.rows.forEach(r => console.log(`   - ${r.column_name}: ${r.data_type}`))
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkSchema()

