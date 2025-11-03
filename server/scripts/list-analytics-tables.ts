import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%analytics%'
        OR table_name LIKE '%ai%'
        OR table_name LIKE '%usage%'
        OR table_name LIKE '%tracking%'
      )
      ORDER BY table_name
    `);
    
    console.log('\n📋 Analytics/AI Tracking Tables:\n');
    if (result.rows.length === 0) {
      console.log('❌ No analytics or AI tracking tables found\n');
      console.log('💡 CONCLUSION:');
      console.log('   AI Analytics tracking is NOT currently set up.');
      console.log('   Quality audits and template improvements are NOT being tracked in analytics.\n');
      console.log('✅ RECOMMENDATION:');
      console.log('   This is mentioned in your memories as a TODO:');
      console.log('   "Integrate AI extraction jobs into AI analytics dashboard"');
      console.log('   Need to create ai_provider_usage or similar table.\n');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
      console.log('');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listTables();

