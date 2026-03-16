const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkDatabase() {
    const docId = 'fc32f461-1817-4710-bbee-e24ddb9a7793';
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        console.log('--- JOBS STATUS ---');
        const jobs = await pool.query(`
      SELECT id, status, type, created_at, completed_at, data->>'documentId' as doc_id
      FROM jobs 
      WHERE (data->>'documentId' = $1 OR project_id = $2)
      ORDER BY created_at DESC LIMIT 10
    `, [docId, projectId]);
        console.table(jobs.rows);

        console.log('\n--- ACTIVITIES COUNT ---');
        const activities = await pool.query('SELECT count(*) FROM activities WHERE project_id = $1', [projectId]);
        console.log(`Total activities of project: ${activities.rows[0].count}`);

        console.log('\n--- EXTRACTED ACTIVITIES (Specific to Doc) ---');
        const docActivities = await pool.query('SELECT count(*) FROM activities WHERE extracted_from_document_id = $1', [docId]);
        console.log(`Activities from doc: ${docActivities.rows[0].count}`);

        console.log('\n--- PROJECT TASKS COUNT ---');
        const tasks = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        console.log(`Total tasks of project: ${tasks.rows[0].count}`);

        console.log('\n--- LOGS (Recent) ---');
        const logs = await pool.query('SELECT message, level, created_at FROM logs ORDER BY created_at DESC LIMIT 10');
        console.table(logs.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDatabase();
