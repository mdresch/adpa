import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkAssessmentSchema() {
  try {
    // Get table schema
    const schema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assessments'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ASSESSMENTS TABLE COLUMNS:\n');
    schema.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });

    // Get the actual assessment
    const assessment = await pool.query(`
      SELECT * FROM assessments 
      WHERE batch_id = $1
    `, ['bd916951-641a-4990-954a-ca1c6e9efa70']);

    if (assessment.rows.length > 0) {
      console.log('\n📊 ASSESSMENT DATA:\n');
      console.log(JSON.stringify(assessment.rows[0], null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAssessmentSchema();

