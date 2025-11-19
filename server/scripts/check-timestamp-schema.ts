/**
 * Check Database Timestamp Schema
 * Verifies how timestamps are stored in the database
 */

import dotenv from 'dotenv'
import { getDatabasePool, connectDatabase } from '../src/database/connection'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

async function checkTimestampSchema() {
  try {
    console.log('🔍 Connecting to database...')
    await connectDatabase()
    const pool = getDatabasePool()
    
    console.log('\n📊 Checking timestamp columns in key tables...\n')
    
    // Check documents table
    const documentsResult = await pool.query(`
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
    
    console.log('📄 Documents table:')
    if (documentsResult.rows.length > 0) {
      documentsResult.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}:`)
        console.log(`     Type: ${row.data_type}`)
        console.log(`     Precision: ${row.datetime_precision || 'N/A'}`)
        console.log(`     Nullable: ${row.is_nullable}`)
        console.log(`     Default: ${row.column_default || 'None'}`)
        console.log('')
      })
    } else {
      console.log('   No timestamp columns found')
    }
    
    // Check projects table
    const projectsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        datetime_precision,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `)
    
    console.log('📁 Projects table:')
    if (projectsResult.rows.length > 0) {
      projectsResult.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('   No timestamp columns found')
    }
    console.log('')
    
    // Check templates table
    const templatesResult = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        datetime_precision,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
      ORDER BY column_name
    `)
    
    console.log('📋 Templates table:')
    if (templatesResult.rows.length > 0) {
      templatesResult.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('   No timestamp columns found')
    }
    console.log('')
    
    // Check users table
    const usersResult = await pool.query(`
      SELECT 
        column_name, 
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `)
    
    console.log('👤 Users table:')
    if (usersResult.rows.length > 0) {
      usersResult.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('   No timestamp columns found')
    }
    console.log('')
    
    // Check database time
    console.log('⏰ Database time check:')
    const timeResult = await pool.query(`
      SELECT 
        NOW() as db_now,
        CURRENT_TIMESTAMP as current_ts,
        timezone('UTC', NOW()) as utc_now,
        EXTRACT(TIMEZONE FROM NOW()) as timezone_offset
    `)
    
    const timeRow = timeResult.rows[0]
    console.log(`   NOW(): ${timeRow.db_now}`)
    console.log(`   CURRENT_TIMESTAMP: ${timeRow.current_ts}`)
    console.log(`   UTC NOW(): ${timeRow.utc_now}`)
    console.log(`   Timezone offset: ${timeRow.timezone_offset} seconds`)
    console.log('')
    
    // Check sample document timestamps
    console.log('📝 Sample document timestamps:')
    const sampleResult = await pool.query(`
      SELECT 
        id,
        name,
        created_at,
        updated_at,
        created_at AT TIME ZONE 'UTC' as created_at_utc,
        updated_at AT TIME ZONE 'UTC' as updated_at_utc
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 3
    `)
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row: any, idx: number) => {
        console.log(`\n   Document ${idx + 1}: ${row.name?.substring(0, 50) || 'Untitled'}`)
        console.log(`     created_at: ${row.created_at}`)
        console.log(`     created_at (UTC): ${row.created_at_utc}`)
        console.log(`     updated_at: ${row.updated_at}`)
        console.log(`     updated_at (UTC): ${row.updated_at_utc}`)
      })
    } else {
      console.log('   No documents found')
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 SUMMARY')
    console.log('='.repeat(60))
    
    const allTimestampColumns = [
      ...documentsResult.rows,
      ...projectsResult.rows,
      ...templatesResult.rows,
      ...usersResult.rows
    ]
    
    const withTimezone = allTimestampColumns.filter((r: any) => 
      r.data_type === 'timestamp with time zone'
    ).length
    
    const withoutTimezone = allTimestampColumns.filter((r: any) => 
      r.data_type === 'timestamp without time zone'
    ).length
    
    console.log(`\nTotal timestamp columns checked: ${allTimestampColumns.length}`)
    console.log(`✅ TIMESTAMP WITH TIME ZONE: ${withTimezone}`)
    console.log(`⚠️  TIMESTAMP WITHOUT TIME ZONE: ${withoutTimezone}`)
    
    if (withoutTimezone > 0) {
      console.log('\n⚠️  WARNING: Some columns use TIMESTAMP WITHOUT TIME ZONE')
      console.log('   These should be migrated to TIMESTAMP WITH TIME ZONE for UTC storage')
    } else {
      console.log('\n✅ All timestamp columns use TIMESTAMP WITH TIME ZONE (UTC storage)')
    }
    
    await pool.end()
    console.log('\n✅ Schema check complete!')
    
  } catch (error: any) {
    console.error('\n❌ Error checking schema:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

checkTimestampSchema()

