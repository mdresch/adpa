import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSchema() {
  try {
    await db.initDb()
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'templates'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Templates Table Schema:\n');
    result.rows.forEach((col: any) => {
      console.log(`  ${col.column_name.padEnd(25, ' ')} ${col.data_type.padEnd(20, ' ')} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n');
    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

