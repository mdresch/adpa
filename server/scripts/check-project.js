const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const projectId = '9ad00240-4dd8-4e83-9333-89515c2422f0';
  console.log(`Checking database for project ID: ${projectId}...`);
  try {
    const res = await pool.query('SELECT id, name, description, framework, status FROM projects WHERE id = $1', [projectId]);
    if (res.rows.length > 0) {
      console.log('Project FOUND in database:', res.rows[0]);
    } else {
      console.log('Project NOT FOUND in database!');
      
      // Let's list some projects that DO exist so we can see what valid IDs are
      const allProj = await pool.query('SELECT id, name FROM projects LIMIT 5');
      console.log('Available projects in database:', allProj.rows);
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
