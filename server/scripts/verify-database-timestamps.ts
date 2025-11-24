/**
 * Verify Database Timestamp Schema and Current Time
 * 
 * Checks:
 * - Database current time vs server time
 * - Timestamp column types (WITH/WITHOUT TIME ZONE)
 * - Recent document timestamps
 */

import dotenv from 'dotenv'
import { getDatabasePool, connectDatabase } from '../src/database/connection'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

async function verifyDatabaseTimestamps() {
  try {
    console.log('🔍 Connecting to database...')
    await connectDatabase()
    const pool = getDatabasePool()

    console.log('\n=== DATABASE TIME VERIFICATION ===\n')
    
    // Check database current time
    const timeResult = await pool.query(`
      SELECT 
        NOW() as db_time,
        CURRENT_TIMESTAMP as current_ts,
        timezone('UTC', NOW()) as utc_time,
        EXTRACT(TIMEZONE FROM NOW()) as timezone_offset
    `)
    
    const dbTime = timeResult.rows[0].db_time
    const utcTime = timeResult.rows[0].utc_time
    const timezoneOffset = timeResult.rows[0].timezone_offset
    
    console.log('Database Time (NOW()):', dbTime)
    console.log('UTC Time:', utcTime)
    console.log('Timezone Offset (seconds):', timezoneOffset)
    console.log('Server Time:', new Date().toISOString())
    console.log('Server Local:', new Date().toLocaleString())
    
    // Check documents table schema
    console.log('\n=== DOCUMENTS TABLE SCHEMA ===\n')
    const schemaResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        datetime_precision,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
      ORDER BY column_name
    `)
    
    if (schemaResult.rows.length === 0) {
      console.log('⚠️  No timestamp columns found in documents table')
    } else {
      schemaResult.rows.forEach((r: any) => {
        console.log(`${r.column_name}:`)
        console.log(`  Type: ${r.data_type}`)
        console.log(`  Precision: ${r.datetime_precision || 'N/A'}`)
        console.log(`  Nullable: ${r.is_nullable}`)
        console.log(`  Default: ${r.column_default || 'N/A'}`)
        
        // Check if it's WITH TIME ZONE
        if (r.data_type === 'timestamp with time zone') {
          console.log(`  ✅ Uses TIME ZONE (stores UTC)`)
        } else if (r.data_type === 'timestamp without time zone') {
          console.log(`  ⚠️  WITHOUT TIME ZONE (may cause issues)`)
        }
        console.log('')
      })
    }
    
    // Check projects table schema
    console.log('=== PROJECTS TABLE SCHEMA ===\n')
    const projectsSchema = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        datetime_precision,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `)
    
    if (projectsSchema.rows.length === 0) {
      console.log('⚠️  No timestamp columns found in projects table')
    } else {
      projectsSchema.rows.forEach((r: any) => {
        console.log(`${r.column_name}:`)
        console.log(`  Type: ${r.data_type}`)
        console.log(`  Precision: ${r.datetime_precision || 'N/A'}`)
        console.log(`  Default: ${r.column_default || 'N/A'}`)
        if (r.data_type === 'timestamp with time zone') {
          console.log(`  ✅ Uses TIME ZONE (stores UTC)`)
        } else if (r.data_type === 'timestamp without time zone') {
          console.log(`  ⚠️  WITHOUT TIME ZONE (may cause issues)`)
        }
        console.log('')
      })
    }
    
    // Check templates table schema
    console.log('=== TEMPLATES TABLE SCHEMA ===\n')
    const templatesSchema = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        datetime_precision,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
      ORDER BY column_name
    `)
    
    if (templatesSchema.rows.length === 0) {
      console.log('⚠️  No timestamp columns found in templates table')
    } else {
      templatesSchema.rows.forEach((r: any) => {
        console.log(`${r.column_name}:`)
        console.log(`  Type: ${r.data_type}`)
        console.log(`  Precision: ${r.datetime_precision || 'N/A'}`)
        console.log(`  Default: ${r.column_default || 'N/A'}`)
        if (r.data_type === 'timestamp with time zone') {
          console.log(`  ✅ Uses TIME ZONE (stores UTC)`)
        } else if (r.data_type === 'timestamp without time zone') {
          console.log(`  ⚠️  WITHOUT TIME ZONE (may cause issues)`)
        }
        console.log('')
      })
    }
    
    // Check recent document timestamps
    console.log('=== RECENT DOCUMENT TIMESTAMPS ===\n')
    const recentDocs = await pool.query(`
      SELECT 
        name, 
        created_at, 
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as days_ago
      FROM documents 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    if (recentDocs.rows.length === 0) {
      console.log('No documents found')
    } else {
      recentDocs.rows.forEach((doc: any, idx: number) => {
        console.log(`${idx + 1}. ${doc.name}`)
        console.log(`   Created: ${doc.created_at}`)
        console.log(`   Updated: ${doc.updated_at}`)
        console.log(`   Days Ago: ${parseFloat(doc.days_ago).toFixed(2)}`)
        console.log('')
      })
    }
    
    // Compare database time with server time
    console.log('=== TIME COMPARISON ===\n')
    const serverTime = new Date()
    const dbTimeDate = new Date(dbTime)
    const timeDiff = Math.abs(serverTime.getTime() - dbTimeDate.getTime())
    const timeDiffSeconds = timeDiff / 1000
    const timeDiffMinutes = timeDiffSeconds / 60
    
    console.log(`Server Time: ${serverTime.toISOString()}`)
    console.log(`Database Time: ${dbTimeDate.toISOString()}`)
    console.log(`Time Difference: ${timeDiffSeconds.toFixed(2)} seconds (${timeDiffMinutes.toFixed(2)} minutes)`)
    
    if (timeDiffSeconds > 60) {
      console.log('⚠️  WARNING: Database and server times differ by more than 1 minute!')
    } else {
      console.log('✅ Database and server times are synchronized')
    }
    
    // Check for timezone issues
    console.log('\n=== TIMEZONE ANALYSIS ===\n')
    const timezoneCheck = await pool.query(`
      SELECT 
        name,
        created_at,
        created_at AT TIME ZONE 'UTC' as created_at_utc,
        created_at AT TIME ZONE 'America/New_York' as created_at_ny,
        created_at AT TIME ZONE 'Europe/Amsterdam' as created_at_ams
      FROM documents 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 3
    `)
    
    if (timezoneCheck.rows.length > 0) {
      console.log('Sample timezone conversions:')
      timezoneCheck.rows.forEach((row: any) => {
        console.log(`\nDocument: ${row.name}`)
        console.log(`  Original: ${row.created_at}`)
        console.log(`  UTC: ${row.created_at_utc}`)
        console.log(`  New York: ${row.created_at_ny}`)
        console.log(`  Amsterdam: ${row.created_at_ams}`)
      })
    }
    
    await pool.end()
    console.log('\n✅ Verification complete!')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

verifyDatabaseTimestamps()

