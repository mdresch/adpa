/**
 * Add create_document_version function to database
 */
import { pool, connectDatabase } from '../src/database/connection'
import * as fs from 'fs'
import * as path from 'path'

async function addFunction() {
  try {
    console.log('📊 Connecting to database...')
    await connectDatabase()
    console.log('✅ Connected!')
    
    console.log('📂 Reading SQL file...')
    const sqlPath = path.join(__dirname, 'create-document-version-function.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    console.log('🔄 Creating create_document_version function...')
    await pool.query(sql)
    console.log('✅ Function created successfully!')
    console.log('✅ create_document_version(document_id, version, version_type, change_summary, change_reason, created_by, content, metadata)')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addFunction()

