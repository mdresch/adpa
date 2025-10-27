/**
 * Check AI Provider Testing Tables
 * Diagnostic script to verify testing suite database tables exist
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false  // Accept self-signed certificates in dev
  }
})

interface TableCheck {
  table_name: string
  exists: boolean
  row_count?: number
}

async function checkTables(): Promise<void> {
  console.log('🔍 Checking AI Provider Testing Tables...\n')

  const requiredTables = [
    'ai_provider_health_metrics',
    'ai_provider_test_results',
    'ai_provider_test_configs'
  ]

  const results: TableCheck[] = []

  try {
    for (const tableName of requiredTables) {
      // Check if table exists
      const existsQuery = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])

      const exists = existsQuery.rows[0].exists

      if (exists) {
        // Count rows
        const countQuery = await pool.query(`SELECT COUNT(*) FROM ${tableName}`)
        const rowCount = parseInt(countQuery.rows[0].count, 10)

        results.push({
          table_name: tableName,
          exists: true,
          row_count: rowCount
        })
      } else {
        results.push({
          table_name: tableName,
          exists: false
        })
      }
    }

    // Display results
    console.log('📊 Table Status:\n')
    let allExist = true
    let hasData = false

    for (const result of results) {
      const status = result.exists ? '✅' : '❌'
      const dataInfo = result.exists && result.row_count !== undefined
        ? ` (${result.row_count} rows)`
        : ''
      
      console.log(`${status} ${result.table_name}${dataInfo}`)

      if (!result.exists) {
        allExist = false
      }
      if (result.exists && result.row_count! > 0) {
        hasData = true
      }
    }

    console.log('\n')

    // Recommendations
    if (!allExist) {
      console.log('⚠️  TABLES MISSING!')
      console.log('📝 Run migration to create them:')
      console.log('   psql $DATABASE_URL -f server/migrations/058_ai_provider_testing_tables.sql\n')
    } else {
      console.log('✅ All tables exist!\n')

      if (!hasData) {
        console.log('📋 Tables are empty. Run a test to populate them:')
        console.log('   1. Go to AI Providers page: http://localhost:3000/ai-providers')
        console.log('   2. Switch to "Testing Suite" tab')
        console.log('   3. Click "Run Full Test Suite"\n')
      } else {
        console.log('✅ Testing data available!\n')
      }
    }

    // Check if routes are registered
    console.log('🔗 Expected API Endpoints:')
    console.log('   POST /api/ai-provider-testing/run-full-suite')
    console.log('   GET  /api/ai-provider-testing/health-dashboard')
    console.log('   POST /api/ai-provider-testing/test/:providerId')
    console.log('   GET  /api/ai-provider-testing/test-history/:providerId')
    console.log('   GET  /api/ai-provider-testing/statistics/:providerId')
    console.log('   POST /api/ai-provider-testing/configure/:providerId')
    console.log('   GET  /api/ai-provider-testing/config/:providerId\n')

    // Check if route is registered in server
    const serverFile = path.join(__dirname, '../server/src/server.ts')
    const fs = require('fs')
    if (fs.existsSync(serverFile)) {
      const serverContent = fs.readFileSync(serverFile, 'utf-8')
      if (serverContent.includes('ai-provider-testing')) {
        console.log('✅ Routes registered in server.ts\n')
      } else {
        console.log('⚠️  Routes NOT registered in server.ts!')
        console.log('📝 Add to server.ts:')
        console.log('   import aiProviderTestingRoutes from \'./routes/ai-provider-testing\'')
        console.log('   app.use(\'/api/ai-provider-testing\', aiProviderTestingRoutes)\n')
      }
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error)
  } finally {
    await pool.end()
  }
}

// Run check
checkTables()
  .then(() => {
    console.log('✅ Diagnostic complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error)
    process.exit(1)
  })

