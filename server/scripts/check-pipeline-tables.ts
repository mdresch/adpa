import { config } from 'dotenv'
import { Client } from 'pg'

config()

async function checkPipelineTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    console.log('Checking pipeline tables...\n')
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('pipeline_executions', 'stage_executions', 'pipeline_configurations')
    `)
    
    console.log('Existing pipeline tables:', tablesResult.rows.map(r => r.table_name))
    
    // If pipeline_executions exists, check its columns
    if (tablesResult.rows.some(r => r.table_name === 'pipeline_executions')) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'pipeline_executions'
        ORDER BY ordinal_position
      `)
      
      console.log('\npipeline_executions columns:')
      columnsResult.rows.forEach(r => {
        console.log(`  - ${r.column_name} (${r.data_type})`)
      })
    }
    
  } finally {
    await client.end()
  }
}

checkPipelineTables()

