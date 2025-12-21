const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function diagnose() {
    console.log('🔍 Simplified Diagnostic for Extraction Pipeline 🔍\n');

    try {
        //  1. Check stuck extraction jobs
        console.log('[1] Stuck extraction jobs (project-data-extraction queue):');
        const stuck = await pool.query(`
      SELECT id, status, progress, created_at, processing_started_at,
             EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
      FROM jobs 
      WHERE queue_name = 'project-data-extraction' 
        AND status = 'processing'
      ORDER BY created_at ASC
      LIMIT 5
    `);

        if (stuck.rows.length === 0) {
            console.log('   ✅ No stuck jobs\n');
        } else {
            stuck.rows.forEach(row => {
                const ageMinutes = Math.floor(row.age_seconds / 60);
                console.log(`   🚨 Job ${row.id}`);
                console.log(`      Progress: ${row.progress}% | Age: ${ageMinutes} minutes`);
                console.log(`      Created: ${row.created_at}`);
                console.log(`      Started processing: ${row.processing_started_at}\n`);
            });
        }

        // 2. Check for any jobs referencing these IDs
        if (stuck.rows.length > 0) {
            const parentId = stuck.rows[0].id;
            console.log(`[2] Looking for jobs related to parent ${parentId}:`);

            // Check if there's a parent_job_id column
            const columns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'jobs'
      `);

            const hasParentJobId = columns.rows.some(r => r.column_name === 'parent_job_id');
            console.log(`   parent_job_id column exists: ${hasParentJobId}\n`);

            if (hasParentJobId) {
                const children = await pool.query(`
          SELECT id, queue_name, status, progress
          FROM jobs 
          WHERE parent_job_id = $1
          LIMIT 10
        `, [parentId]);
                console.log(`   Found ${children.rows.length} child jobs`);
                if (children.rows.length > 0) {
                    console.table(children.rows);
                }
            } else {
                console.log('   ℹ️ This database schema does not track parent-child relationships\n');
            }
        }

        // 3. Worker status
        console.log('[3] Worker Heartbeats:');
        const workers = await pool.query(`
      SELECT worker_id, worker_process_id, cpu_usage_percent, memory_usage_mb, last_heartbeat,
             EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as stale_seconds
      FROM worker_heartbeats 
      ORDER BY last_heartbeat DESC
      LIMIT 5
    `);

        workers.rows.forEach(w => {
            const isStale = w.stale_seconds > 30;
            const status = isStale ? '❌ STALE' : '✅ ACTIVE';
            console.log(`   ${status} PID ${w.worker_process_id}: CPU ${w.cpu_usage_percent}%, Mem ${Math.round(w.memory_usage_mb)}MB (${Math.round(w.stale_seconds)}s ago)`);
        });

        console.log('\n✅ Diagnostic complete');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    } finally {
        await pool.end();
    }
}

diagnose();
