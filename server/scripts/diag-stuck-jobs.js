const db = require('../src/lib/db');
const fs = require('fs');
require('dotenv').config();

(async function(){ try{ await db.initDb() } catch(e){} })();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function diagnose() {
    const diagnosticResults = {
        timestamp: new Date().toISOString(),
        processingJobs: [],
        waitingJobs: [],
        recentFailedJobs: [],
        workerHeartbeats: [],
        potentialIssues: []
    };

    try {
        // 1. Check Processing Jobs
        const jobsResult = await db.query(`
      SELECT id, queue_name, status, progress, created_at, processing_started_at, 
             EXTRACT(EPOCH FROM (NOW() - COALESCE(processing_started_at, created_at))) as idle_seconds
      FROM jobs 
      WHERE status = 'processing' 
      ORDER BY created_at ASC
    `);
        diagnosticResults.processingJobs = jobsResult.rows;

        // 1.5 Check Waiting Jobs
        const waitingResult = await db.query(`
      SELECT id, queue_name, status, created_at, 
             EXTRACT(EPOCH FROM (NOW() - created_at)) as wait_seconds
      FROM jobs 
      WHERE status = 'waiting' 
      ORDER BY created_at ASC
    `);
        diagnosticResults.waitingJobs = waitingResult.rows;

        // 1.6 Check Recent Failed Jobs
        const failedResult = await db.query(`
      SELECT id, queue_name, status, error_message, created_at, completed_at
      FROM jobs 
      WHERE status = 'failed' 
      ORDER BY completed_at DESC
      LIMIT 10
    `);
        diagnosticResults.recentFailedJobs = failedResult.rows;

        // 2. Check Worker Heartbeats
        const heartbeatsResult = await db.query(`
      SELECT worker_id, worker_process_id, queue_name, cpu_usage_percent, memory_usage_mb, last_heartbeat,
             EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as staleness_seconds
      FROM worker_heartbeats 
      ORDER BY last_heartbeat DESC
    `);
        diagnosticResults.workerHeartbeats = heartbeatsResult.rows;

        // 3. Search for specific parents
        const extractionIssues = await db.query(`
      SELECT id, status, created_at 
      FROM jobs 
      WHERE queue_name = 'project-data-extraction' AND status = 'processing' AND created_at < NOW() - INTERVAL '1 hour'
    `);
        diagnosticResults.potentialIssues = extractionIssues.rows;

        fs.writeFileSync('diag-results.json', JSON.stringify(diagnosticResults, null, 2));

        // 4. Trace Children for one stuck parent
        if (diagnosticResults.processingJobs.length > 0) {
            const parentId = diagnosticResults.processingJobs[0].id;
            console.log(`\n[4] Tracing children for parent ${parentId}:`);
            const childrenResult = await db.query(`
        SELECT id, queue_name, status, progress, error_message, created_at
        FROM jobs 
        WHERE parent_job_id = $1
      `, [parentId]);

            console.log(`Found ${childrenResult.rows.length} children.`);
            childrenResult.rows.forEach(row => {
                console.log(`  - Child ${row.id}: Status=${row.status}, Queue=${row.queue_name}, Progress=${row.progress}%, Error=${row.error_message?.substring(0, 50)}`);
            });

            diagnosticResults.childTrace = {
                parentId,
                children: childrenResult.rows
            };
            fs.writeFileSync('diag-results.json', JSON.stringify(diagnosticResults, null, 2));
        }

        console.log('✅ Diagnostics updated in diag-results.json');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    } finally {
        try { await db.end() } catch (e) {}
    }
}

diagnose();
