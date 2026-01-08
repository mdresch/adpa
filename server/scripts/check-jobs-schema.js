require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSchema() {
  try {
    await db.initDb()
    console.log('🔍 Checking jobs table schema...\n');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position
    `);

    console.log('Columns in jobs table:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkSchema();

