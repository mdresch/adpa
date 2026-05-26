import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();
  
  // Check what columns jobs table has
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('=== JOBS TABLE COLUMNS ===');
  cols.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));
  
  // Try the exact metrics query
  try {
    const r = await pool.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as total_waiting,
        COUNT(*) FILTER (WHERE status = 'processing' AND error_message IS NULL) as total_active,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'failed' OR (status = 'processing' AND error_message IS NOT NULL)) as total_failed,
        COUNT(DISTINCT worker_id) FILTER (WHERE status = 'processing' AND worker_id IS NOT NULL AND error_message IS NULL) as active_workers,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour') as completed_last_hour,
        AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) FILTER (WHERE status = 'completed' AND processing_started_at IS NOT NULL AND completed_at > NOW() - INTERVAL '24 hours') as avg_processing_time
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    console.log('METRICS_OK:', JSON.stringify(r.rows[0]));
  } catch(e: any) {
    console.error('METRICS_ERROR:', e.message);
    console.error('METRICS_CODE:', e.code);
  }
  
  process.exit(0);
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
