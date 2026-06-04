import { pool } from './server/src/database/connection.ts';

async function checkConstraint() {
  try {
    const result = await pool.query(
      `SELECT pg_get_constraintdef(c.oid) AS constraint_def, c.conname
       FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       JOIN pg_namespace n ON t.relnamespace = n.oid
       WHERE t.relname = 'engagement_actions'
         AND n.nspname = 'public'
         AND c.contype = 'c'`
    );
    console.log('Constraints for engagement_actions:');
    result.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.constraint_def}`);
    });
  } catch (error) {
    console.error('Error checking constraint:', error);
  } finally {
    await pool.end();
  }
}

checkConstraint();
