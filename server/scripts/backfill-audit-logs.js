/**
 * Backfill Audit Logs for AI Analytics
 * 
 * Creates audit_logs entries for historical AI generation jobs
 * so AI Analytics dashboard shows historical data.
 * 
 * Usage: node scripts/backfill-audit-logs.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function backfillAuditLogs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : false
  });

  try {
    console.log('📊 Starting Audit Log Backfill for AI Analytics...\n');

    // Step 1: Find completed AI generation jobs that don't have audit logs
    console.log('🔍 Finding completed AI generation jobs without audit logs...');
    
    const jobsResult = await pool.query(`
      SELECT 
        j.id as job_id,
        j.created_by as user_id,
        j.type,
        j.data as job_data,
        j.result as job_result,
        j.completed_at,
        j.created_at,
        EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) * 1000 as duration_ms
      FROM jobs j
      WHERE j.type = 'ai-generate'
        AND j.status = 'completed'
        AND j.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.new_values->>'job_id' = j.id::text
            AND al.action = 'ai_generate'
        )
      ORDER BY j.completed_at DESC
    `);

    console.log(`✅ Found ${jobsResult.rows.length} jobs to backfill\n`);

    if (jobsResult.rows.length === 0) {
      console.log('✨ No jobs to backfill. All caught up!');
      return;
    }

    // Step 2: Get provider mapping (name -> id)
    const providersResult = await pool.query('SELECT id, name FROM ai_providers');
    const providerMap = new Map(providersResult.rows.map(p => [p.name, p.id]));
    console.log(`📋 Loaded ${providerMap.size} AI providers:`, Array.from(providerMap.keys()).join(', '), '\n');

    // Step 3: Create audit logs for each job
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const job of jobsResult.rows) {
      try {
        // Parse job data
        const jobData = typeof job.job_data === 'string' ? JSON.parse(job.job_data) : job.job_data;
        const jobResult = typeof job.job_result === 'string' ? JSON.parse(job.job_result) : job.job_result;

        // Extract metadata
        const provider = jobData?.provider || 'unknown';
        const model = jobData?.model || 'unknown';
        const prompt = jobData?.prompt || '';
        const template_id = jobData?.template_id || null;
        
        // Get user ID (from created_by or data->userId)
        const userId = job.user_id || jobData?.userId || null;
        
        // Get provider ID
        const providerId = providerMap.get(provider);
        if (!providerId) {
          console.log(`⚠️  Skipping job ${job.job_id} - Unknown provider: ${provider}`);
          skipped++;
          continue;
        }

        // Extract usage stats from result
        const usage = jobResult?.ai?.usage || {};
        const documentId = jobResult?.documentId || null;

        // Create audit log
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId || null,
            'ai_generate',
            'ai_provider',
            providerId,
            JSON.stringify({
              prompt_length: prompt.length,
              provider,
              model,
              template_id,
              document_id: documentId,
              job_id: job.job_id,
              usage: {
                prompt_tokens: usage.prompt_tokens || 0,
                completion_tokens: usage.completion_tokens || 0,
                total_tokens: usage.total_tokens || 0
              },
              success: true,
              response_time: Math.round(job.duration_ms || 0),
              backfilled: true,
              backfill_date: new Date().toISOString()
            }),
            job.completed_at // Use original completion time for accurate historical data
          ]
        );

        created++;
        console.log(`✅ [${created}/${jobsResult.rows.length}] Created audit log for job ${job.job_id} (${provider} ${model})`);

      } catch (jobErr) {
        errors++;
        console.error(`❌ Error processing job ${job.job_id}:`, jobErr.message);
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created:  ${created} audit logs`);
    console.log(`⚠️  Skipped:  ${skipped} jobs (unknown provider)`);
    console.log(`❌ Errors:   ${errors} jobs`);
    console.log('='.repeat(60));

    // Step 5: Show current analytics counts
    console.log('\n📈 Current AI Analytics Stats:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as last_90d,
        COUNT(*) as all_time
      FROM audit_logs
      WHERE action = 'ai_generate'
    `);

    const stats = statsResult.rows[0];
    console.log(`  Last 7 days:  ${stats.last_7d} generations`);
    console.log(`  Last 30 days: ${stats.last_30d} generations`);
    console.log(`  Last 90 days: ${stats.last_90d} generations`);
    console.log(`  All time:     ${stats.all_time} generations`);

    console.log('\n✨ Backfill complete! AI Analytics dashboard should now show historical data.');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run backfill
backfillAuditLogs()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });

