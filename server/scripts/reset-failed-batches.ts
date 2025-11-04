#!/usr/bin/env tsx
/**
 * Reset failed/corrupted upload batches
 * Fixes counters from retry-based counting bug
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function resetBatches() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🧹 Resetting failed/corrupted batches...\n');

    // Delete assessments with no documents (ghost records)
    const deleteAssessments = await pool.query(`
      DELETE FROM assessments 
      WHERE total_documents = 0 OR status = 'processing'
      RETURNING id
    `);
    console.log(`✅ Deleted ${deleteAssessments.rowCount} incomplete assessments`);

    // Reset corrupted upload batches (where processed > total)
    const resetBatches = await pool.query(`
      UPDATE upload_batches
      SET processed_files = successful_files + failed_files,
          status = CASE 
            WHEN failed_files >= total_files THEN 'failed'
            WHEN successful_files >= total_files THEN 'completed'
            ELSE 'processing'
          END,
          updated_at = NOW()
      WHERE processed_files > total_files OR processed_files != (successful_files + failed_files)
      RETURNING id, total_files, processed_files, successful_files, failed_files, status
    `);

    if (resetBatches.rowCount === 0) {
      console.log('✅ No batches needed correction');
    } else {
      console.log(`✅ Reset ${resetBatches.rowCount} corrupted batches:\n`);
      resetBatches.rows.forEach(b => {
        console.log(`   Batch ${b.id.substring(0,8)}: ${b.processed_files}/${b.total_files} (${b.successful_files} ok, ${b.failed_files} failed) → ${b.status}`);
      });
    }

    console.log('\n✅ Database cleaned! Ready for fresh upload.\n');
    
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetBatches();

