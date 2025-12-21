const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkStakeholdersSchema() {
    console.log('🔍 Checking stakeholders table for user_id mapping...\n');

    try {
        // 1. Check schema
        const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stakeholders'
      AND column_name IN ('id', 'name', 'role', 'user_id', 'is_internal', 'project_id')
      ORDER BY ordinal_position
    `);

        console.log('[1] Relevant Columns:');
        console.table(schema.rows);

        // 2. Sample data showing internal stakeholders with user_ids
        console.log('\n[2] Sample Internal Stakeholders with user_id:');
        const samples = await pool.query(`
      SELECT id, name, role, user_id, is_internal, project_id
      FROM stakeholders
      WHERE user_id IS NOT NULL
      LIMIT 10
    `);

        if (samples.rows.length > 0) {
            console.table(samples.rows);
        } else {
            console.log('   No stakeholders with user_id found\n');
        }

        // 3. Check role distribution
        console.log('\n[3] Common Roles in Stakeholders:');
        const roles = await pool.query(`
      SELECT role, COUNT(*) as count, COUNT(user_id) as has_user_id
      FROM stakeholders
      WHERE role IS NOT NULL
      GROUP BY role
      ORDER BY count DESC
      LIMIT 10
    `);

        if (roles.rows.length > 0) {
            console.table(roles.rows);
        }

    } catch (error) {
        console.error('❌ Check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkStakeholdersSchema();
