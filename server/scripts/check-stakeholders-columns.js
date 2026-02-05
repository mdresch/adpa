const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'stakeholders\' ORDER BY ordinal_position', (err, res) => {
  if (err) console.error(err);
  else {
    console.log('Stakeholders table columns:');
    res.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
  }
  pool.end();
});
