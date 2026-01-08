#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSchema() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  await db.initDb()

  try {
    console.log('📋 Documents table schema:');
    console.log('═'.repeat(80));
    
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);

    if (columns.rows.length === 0) {
      console.log('⚠️  No columns found. Table might not exist.');
    } else {
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    console.log('\n\n📄 Sample document (if any):');
    console.log('═'.repeat(80));
    
    const sample = await db.query(`
      SELECT * FROM documents LIMIT 1
    `);

    if (sample.rows.length === 0) {
      console.log('No documents in table.');
    } else {
      console.log('Column names:', Object.keys(sample.rows[0]).join(', '));
    }

    await db.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();

