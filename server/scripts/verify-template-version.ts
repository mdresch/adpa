import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verifyVersion() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        prompt_version,
        updated_at,
        LENGTH(system_prompt) as prompt_length,
        system_prompt IS NOT NULL as has_prompt
      FROM templates 
      WHERE id = '6c7ec59f-084b-4c55-8629-3e889ece985d'
    `);
    
    if (result.rows.length === 0) {
      console.log('Template not found');
      process.exit(1);
    }
    
    const t = result.rows[0];
    console.log('\n📋 DATABASE STATE:\n');
    console.log(`Template:      ${t.name}`);
    console.log(`Version in DB: ${t.prompt_version || 'NULL'}`);
    console.log(`Last Updated:  ${t.updated_at}`);
    console.log(`Has Prompt:    ${t.has_prompt ? 'YES' : 'NO'}`);
    console.log(`Prompt Length: ${t.prompt_length} chars`);
    
    console.log('\n🔍 ANALYSIS:\n');
    if (t.prompt_version === 3) {
      console.log('✅ Template WAS successfully updated to v3 in database');
      console.log('⚠️  UI showing v1 is a DISPLAY BUG (stale cache)');
      console.log('\n💡 SOLUTION:');
      console.log('   Hard refresh the template page: Ctrl+Shift+R or Ctrl+F5');
      console.log('   This will bypass browser cache and show v3');
    } else if (t.prompt_version === 2) {
      console.log('❌ Template is still at v2 - update did not apply');
      console.log('⚠️  But suggestion was marked as implemented');
      console.log('\n💡 SOLUTION:');
      console.log('   The status update worked, but template update failed');
      console.log('   I already reverted the status to pending_review');
      console.log('   Try applying again');
    } else {
      console.log(`❓ Unexpected version: ${t.prompt_version}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyVersion();

