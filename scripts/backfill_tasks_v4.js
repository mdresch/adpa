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
        console.log(`--- BACKFILLING FOR PROJECT ${projectId}, DOC ${docId} ---`);

        // Update activities by name matching (more robust than timestamp given the 0 results so far)
        const activityNames = [
            'Phase 1 - Proof of Concept',
            'Design and Development',
            'Testing and Validation',
            'Deployment and Training',
            'Monitoring and Optimization',
            'Phase 2 - Pilot Deployment',
            'Phase 3 - Full Rollout',
            'Phase 4 - Optimization and Enhancement',
            'Identify Change',
            'Approve/Reject Change'
        ];

        const updateActivities = await pool.query(`
      UPDATE activities 
      SET source_document_id = $1 
      WHERE project_id = $2 
      AND (source_document_id IS NULL OR source_document_id != $1)
      AND activity_name = ANY($3)
    `, [docId, projectId, activityNames]);
        console.log(`Updated ${updateActivities.rowCount} activities.`);

        const updatePhases = await pool.query(`
      UPDATE phases SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL
    `, [docId, projectId]);
        console.log(`Updated ${updatePhases.rowCount} phases.`);

        const updateDeliverables = await pool.query(`
      UPDATE deliverables SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL
    `, [docId, projectId]);
        console.log(`Updated ${updateDeliverables.rowCount} deliverables.`);

        const updateResources = await pool.query(`
      UPDATE resources SET source_document_id = $1 WHERE project_id = $2 AND source_document_id IS NULL
    `, [docId, projectId]);
        console.log(`Updated ${updateResources.rowCount} resources.`);

        // Final check
        const taskCount = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        console.log(`\nCurrent project tasks: ${taskCount.rows[0].count}`);
        console.log('Backfill complete. Please trigger "Import WBS" in the UI to see the tasks.');

    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await pool.end();
    }
}

backfillAndImport();
