const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function findMatches() {
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        console.log('--- ALL ACTIVITIES FOR PROJECT ---');
        const activities = await pool.query(`
      SELECT id, name, activity_name, source_document_id, created_at 
      FROM activities 
      WHERE project_id = $1 
      ORDER BY created_at DESC LIMIT 50
    `, [projectId]);
        console.table(activities.rows);

        console.log('\n--- BVP DOCUMENT DATA ---');
        const doc = await pool.query('SELECT name, template_id, created_at FROM documents WHERE id = $1', ['fc32f461-1817-4710-bbee-e24ddb9a7793']);
        console.table(doc.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

findMatches();
