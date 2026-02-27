const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkProjectState() {
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        console.log('--- ALL PROJECT ACTIVITIES (recent) ---');
        const activities = await pool.query(`
      SELECT id, name, status, created_at, extracted_from_document_id, project_id
      FROM activities 
      WHERE project_id = $1 
      ORDER BY created_at DESC LIMIT 5
    `, [projectId]);
        console.table(activities.rows);

        console.log('\n--- PARENT EXTRACTION JOBS ---');
        // Using columns that are likely to exist based on common patterns
        const parentJobs = await pool.query(`
      SELECT id, status, type, error_message, data, created_at
      FROM jobs 
      WHERE project_id = $1 AND type = 'project-data-extraction'
      ORDER BY created_at DESC LIMIT 5
    `, [projectId]);

        parentJobs.rows.forEach(job => {
            console.log(`Job ID: ${job.id}, Status: ${job.status}, Error: ${job.error_message}`);
            console.log('Data (summary):', JSON.stringify({
                documentIds: job.data?.documentIds,
                domains: job.data?.domains,
                childJobIdsCount: job.data?.childJobIds?.length
            }, null, 2));
            console.log('---');
        });

        console.log('\n--- CHECKING TABLE SCHEMAS ---');
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('activities', 'project_tasks', 'jobs', 'extraction_jobs')
    `);
        console.table(tables.rows);

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkProjectState();
