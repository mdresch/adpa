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

    // Check programs table
    console.log('\n📋 PROGRAMS table columns:')
    const programsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'programs'
      ORDER BY ordinal_position
    `)
    programsResult.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`)
    })

    // Check checklist_items table
    console.log('\n📋 CHECKLIST_ITEMS table:')
    const checklistResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'checklist_items'
      ORDER BY ordinal_position
    `)

    if (checklistResult.rows.length === 0) {
      console.log('  ❌ checklist_items table does not exist')
    } else {
      console.log('  ✅ table exists with columns:')
      checklistResult.rows.forEach(r => {
        console.log(`    - ${r.column_name} (${r.data_type})`)
      })
    }

    // Check portfolio_governance table
    console.log('\n📋 PORTFOLIO_GOVERNANCE table columns:')
    const pgResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'portfolio_governance'
      ORDER BY ordinal_position
    `)
    pgResult.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`)
    })

  } finally {
    await client.end()
  }
}

checkSchema()

