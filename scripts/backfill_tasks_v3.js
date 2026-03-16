const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function backfillAndImport() {
    const docId = 'fc32f461-1817-4710-bbee-e24ddb9a7793';
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';

    try {
        console.log(`--- BACKFILLING ACTIVITIES FOR DOC ${docId} ---`);
        // I noticed the records are at '2026-02-26T10:43:27.831Z' which is UTC.
        // Let's use a more robust query using name matching as well just in case.
        const updateActivities = await pool.query(`
      UPDATE activities 
      SET source_document_id = $1 
      WHERE project_id = $2 
      AND source_document_id IS NULL
      AND (
        (created_at AT TIME ZONE 'UTC' >= '2026-02-26 10:40:00' AND created_at AT TIME ZONE 'UTC' <= '2026-02-26 10:45:00')
        OR name IN ('Phase 1 - Proof of Concept', 'Design and Development', 'Testing and Validation', 'Deployment and Training', 'Monitoring and Optimization')
      )
    `, [docId, projectId]);
        console.log(`Updated ${updateActivities.rowCount} activities.`);

        const updateOther = await pool.query(`
      UPDATE phases SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL;
      UPDATE deliverables SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL;
      UPDATE resources SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL;
    `, [docId, projectId]);

        // Check if tasks were created
        const taskCount = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        process.stdout.write(`Current project tasks: ${taskCount.rows[0].count}\n`);

    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await pool.end();
    }
}

backfillAndImport();
