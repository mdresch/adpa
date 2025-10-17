import { config } from 'dotenv'
import { Client } from 'pg'

config()

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    const tables = ['users', 'templates', 'projects']
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'id'
      `, [table])
      
      console.log(`${table}.id exists:`, result.rows.length > 0)
    }
    
  } finally {
    await client.end()
  }
}

checkTables()

