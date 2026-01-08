const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'regeneration_jobs' 
        AND column_name = 'conflict_id'
      ORDER BY column_name
    `);
    console.log('✅ regeneration_jobs.conflict_id:', result.rows);

    const result2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_version_conflicts' 
        AND column_name = 'existing_version_id'
      ORDER BY column_name
    `);
    console.log('✅ document_version_conflicts.existing_version_id:', result2.rows);

    const result3 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_audit_trail' 
        AND column_name IN ('event_type', 'event_data', 'user_id')
      ORDER BY column_name
    `);
    console.log('✅ document_audit_trail new columns:', result3.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
