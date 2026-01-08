import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAssessmentSchema() {
  try {
    // Get table schema
    const schema = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assessments'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ASSESSMENTS TABLE COLUMNS:\n');
    schema.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });

    await db.initDb()
    // Get the actual assessment
    const assessment = await db.query(`
      SELECT * FROM assessments 
      WHERE batch_id = $1
    `, ['bd916951-641a-4990-954a-ca1c6e9efa70']);

    if (assessment.rows.length > 0) {
      console.log('\n📊 ASSESSMENT DATA:\n');
      console.log(JSON.stringify(assessment.rows[0], null, 2));
    }

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAssessmentSchema();

