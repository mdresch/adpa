// Check PMBOK 7 Template Validation Data
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkValidation() {
  try {
    console.log('🔍 Checking PMBOK 7 template validation data...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        development_status,
        validation_count,
        success_count,
        CASE 
          WHEN validation_count = 0 THEN 0
          ELSE ROUND((success_count::NUMERIC / validation_count::NUMERIC * 100), 2)
        END as success_rate,
        quality_threshold,
        prompt_version,
        last_validated_at,
        last_validated_by
      FROM templates 
      WHERE name = 'PMBOK 7 Project Management Plan'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Template not found');
      return;
    }
    
    const template = result.rows[0];
    console.log('✅ Template Found!\n');
    console.log('📊 Validation Metrics:');
    console.log('  Name:', template.name);
    console.log('  Status:', template.development_status);
    console.log('  Validations:', template.validation_count);
    console.log('  Successful:', template.success_count);
    console.log('  Success Rate:', template.success_rate + '%');
    console.log('  Quality Threshold:', (template.quality_threshold * 100) + '%');
    console.log('  Last Validated:', template.last_validated_at);
    console.log('  Version:', template.prompt_version);
    
    console.log('\n✅ Data looks good! Refresh your browser to see it.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkValidation();

