/**
 * Adapts the real RabbitMQ-backed IQueue (.add/.process) to the bespoke
 * ClaimsSyncQueue shape (.enqueue) that departmentClaimsSyncJob.ts already
 * expects and is unit-tested against. Keeping ClaimsSyncQueue's interface
 * unchanged (rather than rewriting departmentClaimsSyncJob.ts to depend on
 * IQueue directly) preserves the existing passing unit tests, which mock
 * `.enqueue`.
 */
import { IQueue } from '../../services/jobs/queue/IQueue';
import type { DepartmentClaimsSyncJobData } from '../../services/jobs/types';
import { ClaimsSyncQueue } from './departmentClaimsSyncJob';

export function createClaimsSyncQueueAdapter(queue: IQueue): ClaimsSyncQueue {
  return {
    enqueue: async (jobName, payload) => {
      // payload is always a DepartmentClaimsSyncJobData shape at the one call
      // site (enqueueClaimsSyncJob); ClaimsSyncQueue's generic Record<string,
      // unknown> signature doesn't statically narrow to the JobData union IQueue expects.
      const job = await queue.add(jobName, payload as unknown as DepartmentClaimsSyncJobData);
      return { jobId: String(job.id) };
    }
  };
}
