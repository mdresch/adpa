import 'dotenv/config';
import { pool, connectDatabase } from '../database/connection';

async function checkTables() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();

    console.log('🔍 Fetching all public tables...');
    const res = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name;`
    );

    const tables = res.rows.map((row: any) => row.table_name);
    console.log(`=======================================`);
    console.log(`Found ${tables.length} tables in public schema:`);
    console.log(JSON.stringify(tables, null, 2));
    console.log(`=======================================`);

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
    process.exit(0);
  }
}

checkTables();
