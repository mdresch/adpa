require('dotenv').config();
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkStakeholdersSchema() {
    console.log('🔍 Checking stakeholders table for user_id mapping...\n');

    try {
        // 1. Check schema
                await db.initDb()
                const schema = await db.query(`
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
                const samples = await db.query(`
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
                const roles = await db.query(`
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
        await db.end();
    }
}

checkStakeholdersSchema();
