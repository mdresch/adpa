/**
 * Update Risk Registry View to Include Document References
 * This script updates the risk_registry view to include source document information
 * for risks extracted from project documents.
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import { Pool } from 'pg'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function updateRiskRegistryView() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()

  try {
    console.log('🔄 Updating risk_registry view to include document references...')

    // Read the updated view definition from migration file
    const migrationPath = join(__dirname, '../migrations/347_create_issues_log.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    // Extract just the risk_registry view definition
    const viewMatch = migrationSQL.match(/CREATE OR REPLACE VIEW risk_registry AS[\s\S]*?FROM risks r[\s\S]*?WHERE r\.status NOT IN \('closed', 'mitigated'\)[\s\S]*?OR COALESCE\(r\.risk_level, 'project'\) IN \('portfolio', 'systemic'\);/)
    
    if (!viewMatch) {
      throw new Error('Could not find risk_registry view definition in migration file')
    }

    const viewSQL = viewMatch[0]

    // Execute the view update
    await client.query('BEGIN')
    await client.query(viewSQL)
    await client.query('COMMIT')

    console.log('✅ Risk registry view updated successfully!')
    console.log('   - Added source_document_id tracking')
    console.log('   - Added source_document_name join')
    console.log('   - Added risk_origin calculation')
    console.log('   - Added extracted_from_document_id support')

    // Verify the view exists and has the new columns
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'risk_registry' 
      AND column_name IN ('source_document_id', 'source_document_name', 'risk_origin', 'extracted_from_document_id')
      ORDER BY column_name
    `)

    if (verifyResult.rows.length > 0) {
      console.log('\n✅ Verified new columns in view:')
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}`)
      })
    }

  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('❌ Error updating risk registry view:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

updateRiskRegistryView()
  .then(() => {
    console.log('\n✨ Update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

