import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSuggestions() {
  try {
    await db.initDb()
    const result = await db.query(`
      SELECT id, status, priority, current_avg_quality, expected_quality_gain, created_at
      FROM template_improvement_suggestions
      WHERE template_id = '6c7ec59f-084b-4c55-8629-3e889ece985d'
      ORDER BY created_at DESC
    `);

    console.log('\n📋 All Suggestions for Ideation Template:\n');
    console.log(`Found ${result.rows.length} suggestions\n`);
    
    result.rows.forEach((row, i) => {
      console.log(`[${i+1}] Status: ${row.status}`);
      console.log(`    Priority: ${row.priority}`);
      console.log(`    Current Quality: ${row.current_avg_quality}%`);
      console.log(`    Expected Gain: +${row.expected_quality_gain}%`);
      console.log(`    Created: ${row.created_at}`);
      console.log(`    ID: ${row.id}`);
      console.log('');
    });

    // Check what the API would return
    console.log('\n🔍 Simulating API filter (status=all):\n');
    const apiResult = await db.query(`
      SELECT 
        tis.*,
        t.name as template_name
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE tis.template_id = '6c7ec59f-084b-4c55-8629-3e889ece985d'
      ORDER BY 
        CASE tis.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        tis.created_at DESC
    `);
    
    console.log(`API would return ${apiResult.rows.length} suggestions:\n`);
    apiResult.rows.forEach((row, i) => {
      console.log(`[${i+1}] ${row.priority.toUpperCase()} priority - Status: ${row.status} - Gain: +${row.expected_quality_gain}%`);
    });

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSuggestions();

