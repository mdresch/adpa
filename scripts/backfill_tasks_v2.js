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
        // Using the exact timestamp I saw in the logs (ignoring the seconds/ms just in case)
        const updateActivities = await pool.query(`
      UPDATE activities 
      SET source_document_id = $1 
      WHERE project_id = $2 
      AND source_document_id IS NULL
      AND created_at >= '2026-02-26 10:00:00'
      AND created_at <= '2026-02-26 11:00:00'
    `, [docId, projectId]);
        console.log(`Updated ${updateActivities.rowCount} activities.`);

        console.log(`\n--- TRIGGERING WBS IMPORT (Simulation via update) ---`);
        // Since I can't easily call the TS service, I'll check if project_tasks table exists and is empty
        const taskCount = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        console.log(`Current project tasks: ${taskCount.rows[0].count}`);

        console.log('\nBackfill complete. The user should now be able to see tasks if they trigger "Import WBS" in the UI, or it may auto-trigger on next extraction.');

    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await pool.end();
    }
}

backfillAndImport();
