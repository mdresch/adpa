import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function checkTemplates() {
  try {
    await connectDatabase();
    const result = await pool.query(
      `SELECT id, name, framework, category, system_prompt, template_paragraphs 
       FROM templates 
       ORDER BY name ASC`
    );

    console.log(`Found ${result.rows.length} templates:`);
    for (const row of result.rows) {
      console.log(`- Template Name: ${row.name}`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Framework: ${row.framework}`);
      console.log(`  Category: ${row.category}`);
      console.log(`  Paragraphs Count: ${row.template_paragraphs ? (Array.isArray(row.template_paragraphs) ? row.template_paragraphs.length : 'Not an array') : 0}`);
      if (row.template_paragraphs && Array.isArray(row.template_paragraphs)) {
        console.log(`  Paragraphs:`, JSON.stringify(row.template_paragraphs.slice(0, 3), null, 2));
      }
      console.log('--------------------------------------------------');
    }
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

checkTemplates();
