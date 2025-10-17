/**
 * Complete verification that pipeline is ready to use
 * This script checks everything before declaring success
 */

import { config } from 'dotenv'
import { Client } from 'pg'
import fetch from 'node-fetch'

config()

async function verifyPipelineReady() {
  console.log('🔍 COMPLETE PIPELINE VERIFICATION')
  console.log('='.repeat(60) + '\n')
  
  let allChecks = true
  
  // Check 1: Database tables
  console.log('1️⃣  Checking database tables...')
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    
    const tables = ['pipeline_executions', 'stage_executions', 'templates', 'projects']
    for (const table of tables) {
      const result = await client.query(`
        SELECT 1 FROM information_schema.tables WHERE table_name = $1
      `, [table])
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${table} exists`)
      } else {
        console.log(`   ❌ ${table} missing`)
        allChecks = false
      }
    }
    
    // Check required columns
    console.log('\n2️⃣  Checking pipeline_executions columns...')
    const columnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pipeline_executions' 
      AND column_name IN ('template_id', 'project_id', 'user_id', 'job_id')
    `)
    const foundColumns = columnsResult.rows.map(r => r.column_name)
    const requiredColumns = ['template_id', 'project_id', 'user_id', 'job_id']
    
    requiredColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`   ✅ ${col} exists`)
      } else {
        console.log(`   ❌ ${col} missing`)
        allChecks = false
      }
    })
    
  } catch (error: any) {
    console.log(`   ❌ Database check failed: ${error.message}`)
    allChecks = false
  } finally {
    await client.end()
  }
  
  // Check 2: Backend server
  console.log('\n3️⃣  Checking backend server...')
  try {
    const healthResponse = await fetch('http://localhost:5000/health')
    if (healthResponse.ok) {
      console.log('   ✅ Backend server is running')
    } else {
      console.log(`   ❌ Backend returned status: ${healthResponse.status}`)
      allChecks = false
    }
  } catch (error: any) {
    console.log(`   ❌ Backend server not reachable: ${error.message}`)
    allChecks = false
  }
  
  // Check 3: Pipeline routes (without auth)
  console.log('\n4️⃣  Checking pipeline routes exist...')
  const routes = [
    '/api/pipeline/templates',
    '/api/pipeline/projects',
    '/api/pipeline/jobs'
  ]
  
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:5000${route}`)
      // We expect 401 (unauthorized) or 403 (forbidden), not 404
      if (response.status === 404) {
        console.log(`   ❌ ${route} not found (404)`)
        allChecks = false
      } else if (response.status === 401 || response.status === 403) {
        console.log(`   ✅ ${route} exists (needs auth)`)
      } else if (response.status === 500) {
        console.log(`   ⚠️  ${route} exists but returning 500 error`)
        allChecks = false
      } else {
        console.log(`   ✅ ${route} exists (status: ${response.status})`)
      }
    } catch (error: any) {
      console.log(`   ❌ ${route} failed: ${error.message}`)
      allChecks = false
    }
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60))
  if (allChecks) {
    console.log('✅ ALL CHECKS PASSED - Pipeline is ready to use!')
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh browser at http://localhost:3000/process-flow/visual-pipeline')
    console.log('   2. Templates and projects should load')
    console.log('   3. Select template and project')
    console.log('   4. Click "Start Pipeline"')
  } else {
    console.log('❌ SOME CHECKS FAILED - Review errors above')
    console.log('\n🔧 Try:')
    console.log('   - Restart backend server')
    console.log('   - Check logs/error.log for details')
    console.log('   - Re-run this script after fixes')
  }
  console.log('='.repeat(60))
}

verifyPipelineReady()

