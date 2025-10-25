const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../server/.env') })
const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function auditDatabase() {
  try {
    console.log('🔍 Starting Database Schema Audit...\n')
    
    const report = []
    
    // 1. Get all tables
    console.log('📊 Fetching all tables...')
    const tables = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    
    report.push('# ADPA Database Schema Audit Report')
    report.push(`Generated: ${new Date().toISOString()}`)
    report.push(`\n## Overview`)
    report.push(`Total tables: ${tables.rows.length}`)
    report.push(`\n## Tables\n`)
    
    console.log(`Found ${tables.rows.length} tables\n`)
    
    // 2. For each table, get row count, columns, indexes, and relationships
    for (const table of tables.rows) {
      const tableName = table.tablename
      console.log(`\n📋 Analyzing: ${tableName}`)
      
      // Row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      const rowCount = parseInt(countResult.rows[0].count)
      
      // Columns
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName])
      
      // Indexes
      const indexes = await pool.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName])
      
      // Foreign keys
      const foreignKeys = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName])
      
      // Add to report
      report.push(`### ${tableName}`)
      report.push(`- **Row Count**: ${rowCount.toLocaleString()}`)
      report.push(`- **Size**: ${table.size}`)
      report.push(`- **Status**: ${rowCount > 0 ? '✅ Populated' : '⚠️ Empty'}`)
      report.push(`\n#### Columns (${columns.rows.length})`)
      report.push('| Column | Type | Nullable | Default |')
      report.push('|--------|------|----------|---------|')
      columns.rows.forEach(col => {
        report.push(`| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || 'NULL'} |`)
      })
      
      if (indexes.rows.length > 0) {
        report.push(`\n#### Indexes (${indexes.rows.length})`)
        indexes.rows.forEach(idx => {
          report.push(`- \`${idx.indexname}\``)
        })
      }
      
      if (foreignKeys.rows.length > 0) {
        report.push(`\n#### Foreign Keys (${foreignKeys.rows.length})`)
        foreignKeys.rows.forEach(fk => {
          report.push(`- \`${fk.column_name}\` → \`${fk.foreign_table_name}.${fk.foreign_column_name}\``)
        })
      }
      
      report.push('')
      
      console.log(`  ├─ Rows: ${rowCount.toLocaleString()}`)
      console.log(`  ├─ Columns: ${columns.rows.length}`)
      console.log(`  ├─ Indexes: ${indexes.rows.length}`)
      console.log(`  └─ Foreign Keys: ${foreignKeys.rows.length}`)
    }
    
    // 3. Summary statistics
    const populatedTables = tables.rows.length
    const emptyTablesCount = await Promise.all(
      tables.rows.map(async t => {
        const result = await pool.query(`SELECT COUNT(*) as count FROM "${t.tablename}"`)
        return parseInt(result.rows[0].count) === 0
      })
    ).then(results => results.filter(Boolean).length)
    
    report.push(`\n## Summary\n`)
    report.push(`- **Total Tables**: ${populatedTables}`)
    report.push(`- **Populated Tables**: ${populatedTables - emptyTablesCount}`)
    report.push(`- **Empty Tables**: ${emptyTablesCount}`)
    
    // Create summary table
    console.log('\n\n📊 Table Summary:')
    const summary = []
    for (const table of tables.rows) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table.tablename}"`)
      summary.push({
        table: table.tablename,
        rows: parseInt(countResult.rows[0].count),
        size: table.size,
        status: parseInt(countResult.rows[0].count) > 0 ? '✅ Active' : '⚠️ Empty'
      })
    }
    console.table(summary)
    
    report.push('\n## Quick Reference Table\n')
    report.push('| Table | Row Count | Size | Status |')
    report.push('|-------|-----------|------|--------|')
    summary.forEach(s => {
      report.push(`| ${s.table} | ${s.rows.toLocaleString()} | ${s.size} | ${s.status} |`)
    })
    
    // 4. Recommendations
    report.push(`\n## Recommendations\n`)
    const emptyTables = summary.filter(s => s.rows === 0)
    if (emptyTables.length > 0) {
      report.push(`### Empty Tables to Review\n`)
      report.push('Consider whether these tables are needed or can be removed:\n')
      emptyTables.forEach(t => {
        report.push(`- \`${t.table}\``)
      })
    }
    
    // Write report
    const reportPath = path.join(__dirname, '../docs/07-architecture/database-schema-audit.md')
    fs.writeFileSync(reportPath, report.join('\n'))
    
    console.log(`\n\n✅ Audit Complete!`)
    console.log(`📄 Report saved to: ${reportPath}`)
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  }
}

auditDatabase()

