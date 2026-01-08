const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function viewSuggestion() {
  try {
    const result = await db.query(`
      SELECT 
        t.name as template_name,
        tis.priority,
        tis.current_avg_quality,
        tis.expected_quality_gain,
        tis.common_issues,
        tis.suggested_improvements,
        tis.improvement_rationale
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE tis.id = '932d5755-ae0c-40d0-b669-4587cdeeefec'
    `);
    
    if (result.rows.length === 0) {
      console.log('Suggestion not found');
      process.exit(1);
    }
    
    const sug = result.rows[0];
    console.log('\n📋 TEMPLATE IMPROVEMENT SUGGESTION\n');
    console.log('═'.repeat(60));
    console.log(`Template:        ${sug.template_name}`);
    console.log(`Priority:        ${sug.priority.toUpperCase()}`);
    console.log(`Current Quality: ${sug.current_avg_quality}%`);
    console.log(`Expected Gain:   +${sug.expected_quality_gain}%`);
    console.log(`Target Quality:  ${sug.current_avg_quality + sug.expected_quality_gain}%`);
    console.log('═'.repeat(60));
    
    console.log('\n🔍 COMMON ISSUES IDENTIFIED:\n');
    if (Array.isArray(sug.common_issues) && sug.common_issues.length > 0) {
      sug.common_issues.forEach((issue: any, i: number) => {
        if (typeof issue === 'string') {
          console.log(`${i + 1}. ${issue}`);
        } else if (typeof issue === 'object') {
          console.log(`${i + 1}. ${JSON.stringify(issue, null, 2)}`);
        }
      });
    } else {
      console.log('No issues listed');
    }
    
    console.log('\n💡 SUGGESTED IMPROVEMENTS:\n');
    if (Array.isArray(sug.suggested_improvements) && sug.suggested_improvements.length > 0) {
      sug.suggested_improvements.forEach((imp: any, i: number) => {
        if (typeof imp === 'string') {
          console.log(`${i + 1}. ${imp}`);
        } else if (typeof imp === 'object') {
          console.log(`${i + 1}. ${JSON.stringify(imp, null, 2)}`);
        }
      });
    } else {
      console.log('No improvements listed');
    }
    
    if (sug.improvement_rationale) {
      console.log('\n📝 RATIONALE:\n');
      console.log(sug.improvement_rationale);
    }
    
    console.log('\n' + '═'.repeat(60));
    
    try { await db.end() } catch (e) {}
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

viewSuggestion();

