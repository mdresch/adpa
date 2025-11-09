import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function deleteCorruptDocuments() {
  try {
    const batchId = '13e79f1f-fb52-476b-9f88-1c31d2e540e3';

    // First, show what we're about to delete
    const docsToDelete = await pool.query(`
      SELECT id, name, LENGTH(content) as content_length
      FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      AND LENGTH(content) = 15
      AND content = '[object Object]'
    `, [batchId]);

    console.log('\n🗑️  Documents to delete:\n');
    docsToDelete.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name} (ID: ${doc.id})`);
    });

    if (docsToDelete.rows.length === 0) {
      console.log('\nNo corrupt documents found.');
      await pool.end();
      return;
    }

    // Delete quality_audits for these documents first (foreign key constraint)
    const auditDelete = await pool.query(`
      DELETE FROM quality_audits
      WHERE document_id IN (
        SELECT id FROM documents
        WHERE metadata->>'upload_batch_id' = $1
        AND LENGTH(content) = 15
        AND content = '[object Object]'
      )
    `, [batchId]);

    console.log(`\n✅ Deleted ${auditDelete.rowCount} quality audit records`);

    // Delete the documents
    const docDelete = await pool.query(`
      DELETE FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      AND LENGTH(content) = 15
      AND content = '[object Object]'
      RETURNING id, name
    `, [batchId]);

    console.log(`✅ Deleted ${docDelete.rowCount} documents`);

    // Also delete the assessment record for this batch
    const assessmentDelete = await pool.query(`
      DELETE FROM assessments
      WHERE batch_id = $1
      RETURNING id
    `, [batchId]);

    if (assessmentDelete.rowCount > 0) {
      console.log(`✅ Deleted ${assessmentDelete.rowCount} assessment record`);
    }

    // Mark the batch as failed so it can be re-uploaded
    await pool.query(`
      UPDATE upload_batches
      SET 
        status = 'failed',
        failed_files = total_files,
        successful_files = 0,
        batch_metadata = jsonb_set(
          COALESCE(batch_metadata, '{}'::jsonb),
          '{deletion_reason}',
          '"Corrupt buffer serialization - documents contained [object Object]"'
        )
      WHERE id = $1
    `, [batchId]);

    console.log(`✅ Marked batch as failed for re-upload`);

    console.log('\n✨ Cleanup complete! You can now re-upload the documents.\n');

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteCorruptDocuments();

