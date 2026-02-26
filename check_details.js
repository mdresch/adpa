const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkDetails() {
    const projectId = 'e7950b94-6946-4a58-b6e3-73a66dd47d29';
    try {
        console.log('--- RECENT ACTIVITIES (detailed) ---');
        const activities = await pool.query(`
      SELECT id, name, activity_name, status, created_at, extracted_from_document_id 
      FROM activities 
      WHERE project_id = $1 
      ORDER BY created_at DESC LIMIT 10
    `, [projectId]);
        console.table(activities.rows);

        console.log('\n--- RECENT COMPLETED JOBS (detailed) ---');
        const jobs = await pool.query(`
      SELECT id, type, status, created_at, completed_at, data
      FROM jobs 
      WHERE project_id = $1 AND status = 'completed'
      ORDER BY created_at DESC LIMIT 5
    `, [projectId]);

        jobs.rows.forEach(job => {
            console.log(`Job ID: ${job.id}, Type: ${job.type}, Created: ${job.created_at}`);
            console.log('Data:', JSON.stringify(job.data, null, 2));
            console.log('---');
        });

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDetails();
