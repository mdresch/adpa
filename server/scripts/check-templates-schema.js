require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSchema() {
  try {
    await db.initDb()
    console.log('🔍 Checking templates table schema...\n');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'templates'
      ORDER BY ordinal_position
    `);

    console.log('Columns in templates table:');
    console.table(result.rows.map(r => ({ 
      column: r.column_name, 
      type: r.data_type,
      nullable: r.is_nullable
    })));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkSchema();

