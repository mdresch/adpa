import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  const docId = '0657e256-dad6-4440-a410-14181474f140';
  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';

  console.log(`=== CHECKING DOCUMENT HEADINGS FOR ${docId} ===`);
  const docResult = await pool.query(`SELECT content FROM documents WHERE id = $1`, [docId]);
  if (docResult.rows.length === 0) {
    console.log('Document not found!');
  } else {
    const content = docResult.rows[0].content || '';
    console.log(`Document Content Length: ${content.length} characters`);
    console.log('Headings in final document:');
    const lines = content.split('\n');
    lines.forEach((line: string) => {
      if (line.startsWith('#')) {
        console.log(` - ${line}`);
      }
    });
    
    console.log('\nLast 500 characters of final document:');
    console.log(content.substring(Math.max(0, content.length - 500)));
  }

  console.log(`\n=== CHECKING JOB RESULT CONTENT HEADINGS FOR ${jobId} ===`);
  const jobResult = await pool.query(`SELECT result FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length > 0 && jobResult.rows[0].result) {
    const res = jobResult.rows[0].result;
    const content = res.ai?.content || '';
    console.log(`Job Result AI Content Length: ${content.length} characters`);
    console.log('Headings in job result AI content:');
    const lines = content.split('\n');
    lines.forEach((line: string) => {
      if (line.startsWith('#')) {
        console.log(` - ${line}`);
      }
    });
  }

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
