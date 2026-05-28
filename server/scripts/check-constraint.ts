import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function checkConstraint() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();

    console.log('🔍 Fetching constraint definition...');
    const res = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS constraint_def
       FROM pg_constraint
       WHERE conname = 'entity_extractions_entity_type_check';`
    );

    if (res.rows.length === 0) {
      console.log('❌ Constraint not found.');
    } else {
      console.log('=======================================');
      console.log('Constraint Definition:');
      console.log(res.rows[0].constraint_def);
      console.log('=======================================');
    }
  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
    process.exit(0);
  }
}

checkConstraint();
