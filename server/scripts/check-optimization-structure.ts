import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkStructure() {
  try {
    await db.initDb()
    const result = await db.query(`
      SELECT 
        id,
        suggested_improvements
      FROM template_improvement_suggestions
      WHERE id = '932d5755-ae0c-40d0-b669-4587cdeeefec'
    `);
    
    if (result.rows.length === 0) {
      console.log('Suggestion not found');
      process.exit(1);
    }
    
    const sug = result.rows[0];
    console.log('\n📋 Optimization Suggestion Structure:\n');
    console.log('Suggestion ID:', sug.id);
    console.log('\nsuggested_improvements array:');
    console.log(JSON.stringify(sug.suggested_improvements, null, 2));
    
    console.log('\n🔍 First improvement object keys:');
    if (sug.suggested_improvements && sug.suggested_improvements.length > 0) {
      const firstImprovement = sug.suggested_improvements[0];
      console.log(Object.keys(firstImprovement));
      
      console.log('\n📝 Available fields:');
      Object.keys(firstImprovement).forEach(key => {
        const value = firstImprovement[key];
        if (typeof value === 'string') {
          console.log(`  ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`  ${key}:`, typeof value);
        }
      });
    }
    
    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStructure();

