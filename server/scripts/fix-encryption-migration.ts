#!/usr/bin/env tsx
/**
 * Fix Encryption Migration
 * 
 * Clears old encrypted data that was encrypted with the broken
 * encryption method (CBC + wrong key format).
 * 
 * After running this, you need to re-configure AI Gateway key
 * via the Settings page, which will use the new secure encryption.
 * 
 * Usage:
 *   npm run fix-encryption
 *   OR
 *   npx tsx scripts/fix-encryption-migration.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// Load .env.local - try multiple paths
const possiblePaths = [
  path.resolve(process.cwd(), '.env.local'),      // server/.env.local
  path.resolve(__dirname, '../.env.local'),        // from scripts dir
  path.resolve(process.cwd(), '../.env.local'),   // parent dir
]

let loaded = false
for (const envPath of possiblePaths) {
  console.log('Trying .env from:', envPath)
  const result = dotenv.config({ path: envPath })
  if (!result.error && process.env.POSTGRES_URL) {
    console.log('✅ Loaded successfully from:', envPath)
    loaded = true
    break
  }
}

if (!loaded) {
  console.error('❌ Could not load .env.local with POSTGRES_URL from any path')
  console.log('Tried paths:', possiblePaths)
  process.exit(1)
}

import { Pool } from 'pg'

console.log('POSTGRES_URL set:', !!process.env.POSTGRES_URL)
console.log('')

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function fixEncryption() {
  console.log('🔧 Fixing Encryption Migration...')
  console.log('')
  console.log('⚠️  This will delete old encrypted data that is incompatible')
  console.log('   with the new secure encryption (AES-256-GCM).')
  console.log('')
  console.log('📋 What will be deleted:')
  console.log('   - Old AI Gateway API key (encrypted with broken method)')
  console.log('   - Old master encryption key (encrypted with broken method)')
  console.log('')
  console.log('✅ After this, you need to:')
  console.log('   1. Restart the server')
  console.log('   2. Go to Settings page')
  console.log('   3. Re-enter AI Gateway API key')
  console.log('   4. It will be encrypted with NEW secure method')
  console.log('')

  try {
    // Connect to database
    await pool.connect()
    console.log('✅ Database connected')
    console.log('')

    // Check what we have
    const existing = await pool.query(
      `SELECT setting_key, is_encrypted, created_at 
       FROM system_settings 
       WHERE setting_key IN ('ai_gateway_api_key', 'master_encryption_key')
       ORDER BY setting_key`
    )

    if (existing.rows.length === 0) {
      console.log('✅ No old encrypted data found - already clean!')
      console.log('')
      console.log('📋 Next Steps:')
      console.log('1. Go to http://localhost:3000/settings')
      console.log('2. Configure AI Gateway API key')
      console.log('3. It will be encrypted with new secure method')
      console.log('')
      return
    }

    console.log(`📊 Found ${existing.rows.length} encrypted settings:`)
    existing.rows.forEach(row => {
      console.log(`   - ${row.setting_key} (encrypted: ${row.is_encrypted}, created: ${row.created_at})`)
    })
    console.log('')

    // Delete old encrypted data
    console.log('🗑️  Deleting old encrypted data...')
    const result = await pool.query(
      `DELETE FROM system_settings 
       WHERE setting_key IN ('ai_gateway_api_key', 'master_encryption_key')
       RETURNING setting_key`
    )

    console.log(`✅ Deleted ${result.rowCount} encrypted settings`)
    result.rows.forEach(row => {
      console.log(`   - ${row.setting_key}`)
    })
    console.log('')

    console.log('🎉 SUCCESS! Old encrypted data removed')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Restart backend server (Ctrl+C then npm run dev)')
    console.log('2. Go to http://localhost:3000/settings')
    console.log('3. Re-enter AI Gateway API key:')
    console.log('   vck_4llJYJ1i846ABmvdM7bodtqSYge6IHd4zgBICKspJxJQesBwbR3PO2HI')
    console.log('4. Click Save - will use NEW secure encryption!')
    console.log('5. Test document generation')
    console.log('')

  } catch (error) {
    console.error('❌ Error during migration:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run
fixEncryption()

