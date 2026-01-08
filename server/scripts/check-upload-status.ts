#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule
async function checkStatus() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5
  });

  try {
    console.log('📦 Recent Upload Batches:');
    console.log('═'.repeat(80));
    
    await db.initDb()
    const batches = await db.query(`
      SELECT 
        id, 
        project_id, 
        total_files, 
        processed_files, 
        successful_files, 
        failed_files, 
        status, 
        batch_metadata,
        created_at 
      FROM upload_batches 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (batches.rows.length === 0) {
      console.log('No upload batches found.');
    } else {
      batches.rows.forEach((b, i) => {
        console.log(`\n${i + 1}. Batch ID: ${b.id.substring(0, 8)}...`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Progress: ${b.processed_files}/${b.total_files} files processed`);
        console.log(`   Success: ${b.successful_files} | Failed: ${b.failed_files}`);
        console.log(`   Client: ${b.batch_metadata?.clientName || 'N/A'}`);
        console.log(`   Assessment: ${b.batch_metadata?.assessmentName || 'N/A'}`);
        console.log(`   Created: ${new Date(b.created_at).toLocaleString()}`);
      });
    }

    console.log('\n\n📊 Recent Assessments:');
    console.log('═'.repeat(80));
    
    const assessments = await db.query(`
      SELECT 
        id, 
        batch_id, 
        status, 
        total_documents,
        overall_maturity_level,
        created_at 
      FROM assessments 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (assessments.rows.length === 0) {
      console.log('No assessments found yet.');
      console.log('\n⚠️  This means assessments haven\'t been generated from the upload batches.');
    } else {
      assessments.rows.forEach((a, i) => {
        console.log(`\n${i + 1}. Assessment ID: ${a.id.substring(0, 8)}...`);
        console.log(`   Batch: ${a.batch_id?.substring(0, 8)}...`);
        console.log(`   Status: ${a.status}`);
        console.log(`   Documents: ${a.total_documents}`);
        console.log(`   Maturity: Level ${a.overall_maturity_level || 'N/A'}`);
        console.log(`   Created: ${new Date(a.created_at).toLocaleString()}`);
      });
    }

    console.log('\n\n📄 Recent Documents:');
    console.log('═'.repeat(80));
    
    const docs = await db.query(`
      SELECT 
        id, 
        name, 
        framework,
        mime_type,
        source,
        status,
        created_at 
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (docs.rows.length === 0) {
      console.log('No documents found in database.');
      console.log('\n⚠️  This means document processing failed or hasn\'t started.');
    } else {
      docs.rows.forEach((d, i) => {
        console.log(`${i + 1}. ${d.name || 'Untitled'} (${d.framework || d.mime_type || 'unknown'})`);
        console.log(`   Status: ${d.status || 'N/A'} | Source: ${d.source || 'N/A'}`);
        console.log(`   Created: ${new Date(d.created_at).toLocaleString()}`);
      });
    }

    await db.end();
    console.log('\n✅ Status check complete!\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

checkStatus();

