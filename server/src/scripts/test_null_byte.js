const dotenv = require('dotenv');
const pg = require('pg');

dotenv.config();

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Find a project
  const projResult = await pool.query('SELECT id FROM projects LIMIT 1');
  if (projResult.rows.length === 0) {
    console.error("No projects found!");
    process.exit(1);
  }
  const projectId = projResult.rows[0].id;
  
  try {
    console.log("Attempting insert with null byte \\x00...");
    await pool.query(
      `INSERT INTO project_context_items (
        id, project_id, type, title, content
      ) VALUES ($1,$2,$3,$4,$5)`,
      [
        'c9a0c1de-aa27-6325-53bc-81a22d87651a',
        projectId,
        'reference_document',
        'Null Byte Test',
        'Some text content \x00 with a null byte.'
      ]
    );
    console.log("SUCCESS!");
  } catch (error) {
    console.error("INSERT FAILED:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
  } finally {
    await pool.end();
  }
  process.exit(0);
}

run();
