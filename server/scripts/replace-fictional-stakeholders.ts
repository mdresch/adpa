import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Fictional names to replace
const FICTIONAL_NAMES = [
  { find: 'Eleanor Vance', replace: 'Vacancy' },
  { find: 'Jane Doe', replace: 'Vacancy' },
  { find: 'David Chen', replace: 'Vacancy' },
  { find: 'Priya Patel', replace: 'Vacancy' },
  { find: 'Tom Ivers', replace: 'Vacancy' },
  { find: 'Maria Garcia', replace: 'Vacancy' },
];

async function replaceFictionalStakeholders() {
  try {
    const projectId = 'e8edf585-a14d-42dc-8009-660784d31387'; // ADPA Unicorn COAS

    console.log('\n🔍 Finding documents in ADPA Unicorn COAS project...\n');

    // Get all documents in the project
    const docs = await pool.query(`
      SELECT id, name, content, LENGTH(content) as content_length
      FROM documents
      WHERE project_id = $1
      ORDER BY created_at
    `, [projectId]);

    console.log(`Found ${docs.rows.length} documents\n`);

    let totalReplacements = 0;

    for (const doc of docs.rows) {
      console.log(`\n📄 Processing: ${doc.name}`);
      console.log(`   Original length: ${doc.content_length} chars`);

      let updatedContent = doc.content;
      let docReplacements = 0;

      // Replace each fictional name
      for (const { find, replace } of FICTIONAL_NAMES) {
        const regex = new RegExp(find, 'g');
        const matches = (updatedContent.match(regex) || []).length;
        
        if (matches > 0) {
          updatedContent = updatedContent.replace(regex, replace);
          console.log(`   ✅ Replaced ${matches}x: "${find}" → "${replace}"`);
          docReplacements += matches;
          totalReplacements += matches;
        }
      }

      if (docReplacements > 0) {
        // Update the document
        await pool.query(
          'UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2',
          [updatedContent, doc.id]
        );
        console.log(`   💾 Updated document (${docReplacements} replacements)`);
      } else {
        console.log(`   ℹ️  No fictional names found`);
      }
    }

    console.log(`\n✨ COMPLETE!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Documents processed: ${docs.rows.length}`);
    console.log(`   Total replacements: ${totalReplacements}`);
    console.log(`\n✅ All fictional stakeholder names replaced with "Vacancy"`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

replaceFictionalStakeholders();

