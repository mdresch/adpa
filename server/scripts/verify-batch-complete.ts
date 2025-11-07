import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function verifyBatchComplete() {
  try {
    const batchId = 'bd916951-641a-4990-954a-ca1c6e9efa70';

    console.log('\n✅ VERIFICATION REPORT\n');
    console.log('='.repeat(60));

    // Check batch status
    const batch = await pool.query(`
      SELECT * FROM upload_batches WHERE id = $1
    `, [batchId]);

    console.log('\n📦 BATCH STATUS:');
    console.log(`   ID: ${batch.rows[0].id}`);
    console.log(`   Status: ${batch.rows[0].status}`);
    console.log(`   Total: ${batch.rows[0].total_files}`);
    console.log(`   Successful: ${batch.rows[0].successful_files}`);
    console.log(`   Failed: ${batch.rows[0].failed_files}`);

    // Check documents
    const docs = await pool.query(`
      SELECT 
        id,
        name,
        LENGTH(content) as content_length,
        framework,
        metadata->>'original_format' as format,
        metadata->'conversion_metadata'->>'wordCount' as word_count
      FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      ORDER BY created_at
    `, [batchId]);

    console.log('\n📄 DOCUMENTS:');
    docs.rows.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.name}`);
      console.log(`      Type: ${doc.framework}`);
      console.log(`      Size: ${doc.content_length} chars`);
      console.log(`      Words: ${doc.word_count}`);
      console.log(`      Format: ${doc.format}`);
    });

    // Check quality audits
    const audits = await pool.query(`
      SELECT COUNT(*) as audit_count
      FROM quality_audits qa
      JOIN documents d ON qa.document_id = d.id
      WHERE d.metadata->>'upload_batch_id' = $1
    `, [batchId]);

    console.log('\n🔍 QUALITY AUDITS:');
    console.log(`   Generated: ${audits.rows[0].audit_count}`);

    // Check assessment
    const assessment = await pool.query(`
      SELECT 
        id,
        status,
        average_quality_score,
        maturity_level,
        maturity_score,
        total_documents,
        gaps_identified
      FROM assessments
      WHERE batch_id = $1
    `, [batchId]);

    if (assessment.rows.length > 0) {
      const a = assessment.rows[0];
      console.log('\n📊 ASSESSMENT:');
      console.log(`   ID: ${a.id}`);
      console.log(`   Status: ${a.status}`);
      console.log(`   Quality Score: ${a.average_quality_score}`);
      console.log(`   Maturity Level: ${a.maturity_level}`);
      console.log(`   Maturity Score: ${a.maturity_score}`);
      console.log(`   Documents Analyzed: ${a.total_documents}`);
      console.log(`   Gaps Identified: ${a.gaps_identified}`);
    } else {
      console.log('\n⚠️  No assessment found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ SUMMARY:');
    
    const allDocsGood = docs.rows.every(d => d.content_length > 100);
    const hasAudits = audits.rows[0].audit_count === docs.rows.length;
    const hasAssessment = assessment.rows.length > 0;
    
    console.log(`   ${allDocsGood ? '✅' : '❌'} All documents have proper content`);
    console.log(`   ${hasAudits ? '✅' : '❌'} All documents have quality audits`);
    console.log(`   ${hasAssessment ? '✅' : '❌'} Assessment generated`);
    
    if (allDocsGood && hasAudits && hasAssessment) {
      console.log('\n🎊 SUCCESS! Everything is working perfectly!\n');
    } else {
      console.log('\n⚠️  Some issues detected\n');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyBatchComplete();

