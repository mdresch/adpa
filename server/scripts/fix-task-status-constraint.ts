/**
 * Fix project_tasks status constraint
 * Updates the constraint to allow current status values including 'in_progress'
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function fixTaskStatusConstraint() {
  console.log('🔧 Fixing project_tasks status constraint\n');
  console.log('=' .repeat(60));

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Drop old constraint if exists
    console.log('🗑️  Dropping old constraint...');
    await pool.query(`
      ALTER TABLE project_tasks 
      DROP CONSTRAINT IF EXISTS project_tasks_status_check
    `);
    console.log('✅ Old constraint dropped\n');

    // Add new constraint with all valid statuses
    console.log('➕ Adding updated constraint...');
    await pool.query(`
      ALTER TABLE project_tasks
      ADD CONSTRAINT project_tasks_status_check
      CHECK (status IN (
        'not_started',
        'in_progress',
        'completed',
        'on_hold',
        'cancelled',
        'blocked',
        'pending',
        'active',
        'done'
      ))
    `);
    console.log('✅ New constraint added\n');

    // Verify
    console.log('🔍 Verifying constraint...');
    const result = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_schema = 'public'
      AND constraint_name = 'project_tasks_status_check'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Constraint verified:');
      console.log(`   ${result.rows[0].check_clause}\n`);
    }

    // Check existing statuses in database
    console.log('📊 Current status values in database:');
    const statusResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM project_tasks
      GROUP BY status
      ORDER BY count DESC
    `);

    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} tasks`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Status constraint fixed successfully!');
    console.log('   Tasks with "in_progress" status should now work.\n');

  } catch (error) {
    console.error('\n❌ Fix failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTaskStatusConstraint();

