import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkUserRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    // Get all users and their roles
    const result = await pool.query(
      `SELECT id, email, name, role, created_at 
       FROM users 
       ORDER BY created_at ASC`
    )

    console.log('\n📊 All Users:\n')
    result.rows.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`)
      console.log(`   Name: ${user.name || 'N/A'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.created_at}`)
      console.log('')
    })

    const adminUsers = result.rows.filter(u => u.role === 'admin')
    console.log(`\n✅ ${adminUsers.length} admin user(s) found\n`)

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkUserRole()

