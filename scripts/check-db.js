const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://myuser:mypassword@localhost:5432/adpa'
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    const docColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
    `);
    console.log('\nColumns in "documents" table:');
    docColumns.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    
  } catch (err) {
    console.error('Error checking database:', err.message);
  } finally {
    await pool.end();
  }
}

checkTables();
