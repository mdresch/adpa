import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';

async function run() {
  await connectDatabase();

  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';
  console.log(`=== SIMULATING AUDIT FOR JOB ${jobId} ===`);
  
  const jobResult = await pool.query(`SELECT data, result FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length === 0) {
    console.log('Job not found!');
    process.exit(1);
  }

  const { data, result } = jobResult.rows[0];
  const requests = data?.llm_insights?.requests || [];
  
  const drafts = requests.filter((r: any) => r.phase === 'drafting');
  drafts.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  
  let assembledMarkdown = '';
  drafts.forEach((d: any) => {
    assembledMarkdown += (d.response || '').trim() + '\n\n';
  });
  
  console.log(`Assembled drafted markdown length: ${assembledMarkdown.length} characters`);
  
  // Let's run the audit
  console.log('Running auditDocumentAgainstPolicies...');
  const auditResult = await (documentGenerationService as any).auditDocumentAgainstPolicies(
    assembledMarkdown,
    'Business Case',
    'google',
    'gemini-3.5-flash'
  );
  
  console.log('Audit Result:', JSON.stringify(auditResult, null, 2));

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
