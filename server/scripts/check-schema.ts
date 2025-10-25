import { config } from 'dotenv'
import { Client } from 'pg'

config()

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    
    // Check templates table
    console.log('📋 TEMPLATES table columns:')
    const templatesResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'templates'
      ORDER BY ordinal_position
    `)
    
    if (templatesResult.rows.length === 0) {
      console.log('  ❌ templates table does not exist')
    } else {
      templatesResult.rows.forEach(r => {
        console.log(`  - ${r.column_name} (${r.data_type})`)
      })
    }
    
    // Check projects table
    console.log('\n📋 PROJECTS table columns:')
    const projectsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `)
    
    if (projectsResult.rows.length === 0) {
      console.log('  ❌ projects table does not exist')
    } else {
      projectsResult.rows.forEach(r => {
        console.log(`  - ${r.column_name} (${r.data_type})`)
      })
    }
    
    // Check if project_members exists
    console.log('\n📋 PROJECT_MEMBERS table:')
    const projectMembersResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'project_members'
      ORDER BY ordinal_position
    `)
    
    if (projectMembersResult.rows.length === 0) {
      console.log('  ❌ project_members table does not exist')
    } else {
      console.log('  ✅ table exists with columns:')
      projectMembersResult.rows.forEach(r => {
        console.log(`    - ${r.column_name} (${r.data_type})`)
      })
    }
    
  } finally {
    await client.end()
  }
}

checkSchema()

