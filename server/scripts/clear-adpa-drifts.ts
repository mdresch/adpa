import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

const pool = new Pool({
  connectionString,
  ssl: (connectionString?.includes('supabase.co') || connectionString?.includes('azure') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
})

async function clearADPADrifts() {
  const projectId = '45083436-7e90-4ecf-aa42-e4a73c4b64b7'
  
  try {
    console.log('🔍 Finding drift records for ADPA project...\n')
    
    // First, verify the project exists
    const projectCheck = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    )
    
    if (projectCheck.rows.length === 0) {
      console.error(`❌ Project not found with ID: ${projectId}`)
      return
    }
    
    const projectName = projectCheck.rows[0].name
    console.log(`✅ Found project: ${projectName} (${projectId})\n`)
    
    // Check existing drifts
    const existingDrifts = await pool.query(`
      SELECT 
        bdd.id,
        bdd.detection_type,
        bdd.drift_severity,
        bdd.drift_description,
        bdd.status,
        bdd.detection_date,
        d.name as document_name
      FROM baseline_drift_detection bdd
      LEFT JOIN documents d ON bdd.source_document_id = d.id
      WHERE bdd.project_id = $1
      ORDER BY bdd.detection_date DESC
    `, [projectId])
    
    console.log(`📊 Found ${existingDrifts.rows.length} drift record(s):\n`)
    
    if (existingDrifts.rows.length === 0) {
      console.log('✅ No drift records found - already cleared!')
      return
    }
    
    // Group by status
    const byStatus = existingDrifts.rows.reduce((acc: any, drift: any) => {
      const status = drift.status || 'unknown'
      if (!acc[status]) acc[status] = []
      acc[status].push(drift)
      return acc
    }, {})
    
    Object.entries(byStatus).forEach(([status, drifts]: [string, any]) => {
      console.log(`   ${status}: ${drifts.length}`)
    })
    
    console.log('\n🔄 Clearing all drift records...\n')
    
    // Delete all drift records for this project
    const result = await pool.query(`
      DELETE FROM baseline_drift_detection
      WHERE project_id = $1
      RETURNING id, detection_type, drift_severity, status
    `, [projectId])
    
    console.log(`✅ SUCCESS! Deleted ${result.rows.length} drift record(s):\n`)
    
    result.rows.forEach((drift, i) => {
      console.log(`   ${i + 1}. [${drift.drift_severity}] ${drift.detection_type} (ID: ${drift.id})`)
    })
    
    console.log('\n📊 Final Status:')
    console.log(`   Project: ${projectName}`)
    console.log(`   Drift Records Remaining: 0`)
    console.log('\n🎉 Drift clearance complete! You can now reset the baseline.')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.code) {
      console.error(`   Error Code: ${error.code}`)
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`)
    }
  } finally {
    await pool.end()
  }
}

clearADPADrifts()

