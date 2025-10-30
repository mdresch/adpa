import { pool, connectDatabase } from '../src/database/connection'

async function test() {
  try {
    await connectDatabase()
    const result = await pool!.query('SELECT COUNT(*) FROM stakeholders')
    console.log('\n✅ Database query successful!')
    console.log(`📊 Stakeholders count: ${result.rows[0].count}\n`)
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Database query failed:', error)
    process.exit(1)
  }
}

test()


