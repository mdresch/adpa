/**
 * One-off: enqueue save-inline-entities for a document that has H8 tags but no persistence job.
 * Usage: node scripts/tmp-backfill-inline-entities.mjs <documentId> [userId] [parentJobId]
 */
import dotenv from 'dotenv';
dotenv.config();

const documentId = process.argv[2] || '43391f4c-f5d8-43af-93c6-33b830f1433a';
const userId = process.argv[3] || '42ca7333-b37e-4e1b-bd50-ac04abd7e682';
const parentJobId = process.argv[4] || '835863d2-3823-4306-8a61-1b274a13cd0e';

const { enqueueEntityPersistence } = await import('../dist/src/services/jobs/enqueueEntityPersistence.js').catch(
  () => import('../src/services/jobs/enqueueEntityPersistence.ts')
);

const jobId = await enqueueEntityPersistence({
  projectId: '9ad00240-4dd8-4e83-9333-89515c2422f0',
  userId,
  documentId,
  parentJobId,
  triggeredBy: 'manual-backfill',
  autoTriggered: false,
});

console.log(jobId ? `Enqueued save-inline-entities job: ${jobId}` : 'Skipped (no H8 tags or empty content)');
