const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkExtraction() {
    const docId = 'fc32f461-1817-4710-bbee-e24ddb9a7793';
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        console.log('--- EXTRACTION JOBS ---');
        const jobs = await pool.query('SELECT id, status, created_at, completed_at FROM extraction_jobs WHERE document_id = $1 ORDER BY created_at DESC LIMIT 5', [docId]);
        console.table(jobs.rows);

        console.log('\n--- EXTRACTED ACTIVITIES COUNT ---');
        const activities = await pool.query('SELECT count(*) FROM activities WHERE extracted_from_document_id = $1', [docId]);
        console.log(`Total activities of doc: ${activities.rows[0].count}`);

        console.log('\n--- PROJECT TASKS COUNT ---');
        const tasks = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        console.log(`Total tasks of project: ${tasks.rows[0].count}`);

        console.log('\n--- RECENT ACTIVITIES ---');
        const recentActivities = await pool.query('SELECT activity_name, status, created_at FROM activities WHERE project_id = $1 ORDER BY created_at DESC LIMIT 5', [projectId]);
        console.table(recentActivities.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkExtraction();
