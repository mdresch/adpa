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
    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682'; // From recent job data

    try {
        console.log(`--- BACKFILLING ACTIVITIES FOR DOC ${docId} ---`);
        const updateActivities = await pool.query(`
      UPDATE activities 
      SET source_document_id = $1 
      WHERE project_id = $2 
      AND source_document_id IS NULL
      AND (
        created_at > '2026-02-26 09:00:00' 
        OR name IN ('Phase 1 - Proof of Concept', 'Design and Development', 'Testing and Validation', 'Deployment and Training', 'Monitoring and Optimization')
      )
    `, [docId, projectId]);
        console.log(`Updated ${updateActivities.rowCount} activities.`);

        console.log(`\n--- BACKFILLING PHASES FOR DOC ${docId} ---`);
        const updatePhases = await pool.query(`
      UPDATE phases 
      SET source_document_id = $1 
      WHERE project_id = $2 AND source_document_id IS NULL
    `, [docId, projectId]);
        console.log(`Updated ${updatePhases.rowCount} phases.`);

        console.log(`\n--- BACKFILLING DELIVERABLES FOR DOC ${docId} ---`);
        const updateDeliverables = await pool.query(`
      UPDATE deliverables 
      SET source_document_id = $1 
      WHERE project_id = $2 AND source_document_id IS NULL
    `, [docId, projectId]);
        console.log(`Updated ${updateDeliverables.rowCount} deliverables.`);

        console.log(`\n--- TRIGGERING WBS IMPORT ---`);
        // Note: We can't easily call the service method directly from here without setting up the whole environment,
        // but the user can now trigger it from the UI, OR we can try to find a way to invoke the API.
        // However, I will check if I can find an API route for this.
        console.log('Backfill complete. The user should now be able to see tasks after triggering the import or if the auto-trigger kicks in.');

    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await pool.end();
    }
}

backfillAndImport();
