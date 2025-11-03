/**
 * Check documents table schema for version columns
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
  })

  try {
    console.log('🔍 Checking documents table schema...\n')
    
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'documents'
      AND column_name LIKE '%version%'
      ORDER BY ordinal_position;
    `)
    
    console.log('📋 Version-related columns:\n')
    result.rows.forEach(row => {
      console.log(`   ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${row.character_maximum_length || ''}`)
    })
    
    console.log('\n✅ Schema check complete!')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkSchema()

