const db = require('../src/lib/db');
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function findTemplate() {
  try {
    const result = await db.query(`
      SELECT id, name, framework, category, is_public 
      FROM templates 
      WHERE LOWER(name) LIKE '%market%' 
         OR LOWER(name) LIKE '%competitive%' 
         OR LOWER(category) LIKE '%analysis%'
         OR LOWER(category) LIKE '%business%'
      ORDER BY name
    `);
    
    console.log('\n📋 Relevant Templates:\n');
    
    if (result.rows.length === 0) {
      console.log('❌ No Market/Competitive Analysis templates found.');
      console.log('\n💡 You may need to create this template in the Template Builder.');
    } else {
      result.rows.forEach((t, i) => {
        console.log(`${i+1}. ${t.name}`);
        console.log(`   Framework: ${t.framework || 'None'}`);
        console.log(`   Category: ${t.category || 'None'}`);
        console.log(`   ID: ${t.id}`);
        console.log('---');
      });
    }
    
    // Also show all available templates
    const allTemplates = await db.query(`
      SELECT id, name, framework, category 
      FROM templates 
      WHERE is_public = true
      ORDER BY category, name
      LIMIT 20
    `);
    
    console.log('\n📚 All Available Templates (first 20):\n');
    allTemplates.rows.forEach((t, i) => {
      console.log(`${i+1}. ${t.name} (${t.category || 'Uncategorized'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

findTemplate();

