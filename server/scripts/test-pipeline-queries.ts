/**
 * Test the actual queries used by pipeline routes
 */

import { config } from 'dotenv'
import { Client } from 'pg'

config()

async function testQueries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    
    // Test 1: Get templates
    console.log('🧪 Test 1: Get templates...')
    try {
      const templatesResult = await client.query(`
        SELECT id, name, description, category, framework, is_public, created_at
        FROM templates
        WHERE deleted_at IS NULL
        ORDER BY name
      `)
      console.log(`   ✅ SUCCESS - Found ${templatesResult.rows.length} templates`)
      if (templatesResult.rows.length > 0) {
        console.log(`   📝 Example: ${templatesResult.rows[0].name}`)
      }
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`)
    }
    
    // Test 2: Get projects
    console.log('\n🧪 Test 2: Get projects...')
    try {
      const projectsResult = await client.query(`
        SELECT p.id, p.name, p.description, p.status, p.created_at
        FROM projects p
        LIMIT 5
      `)
      console.log(`   ✅ SUCCESS - Found ${projectsResult.rows.length} projects`)
      if (projectsResult.rows.length > 0) {
        console.log(`   📝 Example: ${projectsResult.rows[0].name}`)
      }
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`)
    }
    
    // Test 3: Get pipeline executions
    console.log('\n🧪 Test 3: Get pipeline executions...')
    try {
      const jobsResult = await client.query(`
        SELECT 
          pe.job_id,
          pe.request_id,
          pe.template_id,
          pe.project_id,
          pe.user_id,
          pe.status,
          pe.progress
        FROM pipeline_executions pe
        LIMIT 5
      `)
      console.log(`   ✅ SUCCESS - Found ${jobsResult.rows.length} jobs`)
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`)
    }
    
    // Test 4: Join query (like in /jobs endpoint)
    console.log('\n🧪 Test 4: Jobs with template/project names...')
    try {
      const joinResult = await client.query(`
        SELECT 
          pe.job_id,
          pe.status,
          t.name as template_name,
          p.name as project_name
        FROM pipeline_executions pe
        LEFT JOIN templates t ON pe.template_id = t.id
        LEFT JOIN projects p ON pe.project_id = p.id
        LIMIT 5
      `)
      console.log(`   ✅ SUCCESS - Join query works`)
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('Summary:')
    console.log('If all tests passed ✅, the pipeline routes should work')
    console.log('If any failed ❌, those endpoints will return 500 errors')
    
  } finally {
    await client.end()
  }
}

testQueries()

