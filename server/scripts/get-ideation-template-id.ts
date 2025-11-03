import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function getTemplateId() {
  try {
    const result = await pool.query(`
      SELECT id, name, framework
      FROM templates
      WHERE name ILIKE '%ideation%'
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('\n📋 Ideation Template Found:\n');
      console.log(`Template ID:  ${template.id}`);
      console.log(`Name:         ${template.name}`);
      console.log(`Framework:    ${template.framework}`);
      console.log('\n🌐 UI URLs:\n');
      console.log(`Template Page:        http://localhost:3000/templates/${template.id}`);
      console.log(`Recommendations Tab:  http://localhost:3000/templates/${template.id}#recommendations`);
      console.log('\n📍 Navigation Steps:\n');
      console.log('1. Go to: http://localhost:3000/templates');
      console.log('2. Find "Ideation Template" in the list');
      console.log('3. Click on it');
      console.log('4. Click the "Recommendations" tab');
      console.log('5. You should see the HIGH PRIORITY suggestion with +15% expected gain');
    } else {
      console.log('❌ Ideation Template not found in database');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getTemplateId();

