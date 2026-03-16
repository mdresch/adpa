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

        // The previous check showed they already HAVE the ID! 
        // Wait, let me look at the table again.
        // Index 0: id '10fdc016-c2c2-4fae-90d2-33c6b9fb5893' has source_document_id 'fc32f461-1817-4710-bbee-e24ddb9a7793'
        // They ALREADY have it. So why no tasks?

        const taskCount = await pool.query('SELECT count(*) FROM project_tasks WHERE project_id = $1', [projectId]);
        process.stdout.write(`Current project tasks: ${taskCount.rows[0].count}\n`);

        if (taskCount.rows[0].count === '0') {
            console.log('No tasks found. This means the WBS import either didnt run, or failed to create tasks from these activities.');

            // Let's check the activities details to see if they have what WBS import needs (roles, hours, etc)
            const activityDetails = await pool.query(`
        SELECT id, name, description, category, start_date, end_date, source_document_id 
        FROM activities 
        WHERE project_id = $1 AND source_document_id = $2
      `, [projectId, docId]);

            console.log(`Found ${activityDetails.rowCount} activities for this doc.`);
            activityDetails.rows.forEach(a => {
                console.log(`- ${a.name} (Source: ${a.source_document_id})`);
            });
        }

    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await pool.end();
    }
}

backfillAndImport();
