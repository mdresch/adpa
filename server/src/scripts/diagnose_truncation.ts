import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';
  console.log(`=== DIAGNOSING TRUNCATION FOR JOB ${jobId} ===`);
  
  const jobResult = await pool.query(`SELECT data, result FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length === 0) {
    console.log('Job not found!');
    process.exit(1);
  }

  const { data, result } = jobResult.rows[0];
  const requests = data?.llm_insights?.requests || [];
  
  console.log(`Total requests in llm_insights: ${requests.length}`);
  
  // 1. Reconstruct Phase 2 drafted sections
  const drafts = requests.filter((r: any) => r.phase === 'drafting');
  // Sort by order if available
  drafts.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  
  console.log(`\n--- Drafted Sections (${drafts.length}) ---`);
  let assembledMarkdown = '';
  drafts.forEach((d: any, idx: number) => {
    console.log(`Section ${idx + 1}: ${d.heading} (Length: ${d.response?.length} chars)`);
    assembledMarkdown += (d.response || '').trim() + '\n\n';
  });
  
  console.log(`Assembled drafted markdown length: ${assembledMarkdown.length} characters`);
  
  // 2. Check the saved document content
  const docId = result?.documentId;
  if (docId) {
    const docRes = await pool.query(`SELECT name, content FROM documents WHERE id = $1`, [docId]);
    if (docRes.rows.length > 0) {
      const doc = docRes.rows[0];
      console.log(`\n--- Saved Document in DB (${docId}) ---`);
      console.log(`Name: ${doc.name}`);
      console.log(`Content Length: ${doc.content?.length} characters`);
      
      console.log('Headings in saved document:');
      doc.content?.split('\n').forEach((line: string) => {
        if (line.startsWith('#')) {
          console.log(`  ${line}`);
        }
      });
    } else {
      console.log(`\nDocument ${docId} not found in documents table!`);
    }
  } else {
    console.log('\nNo documentId in job result!');
  }
  
  // 3. Let's look at the result.ai.content headings
  if (result?.ai?.content) {
    console.log(`\n--- result.ai.content in jobs table ---`);
    console.log(`Content Length: ${result.ai.content.length} characters`);
    console.log('Headings:');
    result.ai.content.split('\n').forEach((line: string) => {
      if (line.startsWith('#')) {
        console.log(`  ${line}`);
      }
    });
  }
  
  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
