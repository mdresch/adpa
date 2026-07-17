/**
 * Dual-write-safe Firebase claims sync job (ADR-005 Phase 0).
 * Enqueue persists a DB row + hands off to the queue; it must never call the
 * Firebase Admin SDK inline (REQ-DEPT-004). The worker only marks the job
 * complete after a successful Firebase call (REQ-DEPT-005).
 */
import { DepartmentClaim } from './departmentClaims';

export interface ClaimsSyncDb {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export interface ClaimsSyncQueue {
  enqueue: (jobName: string, payload: Record<string, unknown>) => Promise<{ jobId: string }>;
}

export interface ClaimsSyncFirebaseAdmin {
  setCustomUserClaims: (uid: string, claims: { departments: DepartmentClaim[] }) => Promise<void>;
  revokeRefreshTokens: (uid: string) => Promise<void>;
}

export interface ClaimsSyncDeps {
  db: ClaimsSyncDb;
  queue: ClaimsSyncQueue;
  firebaseAdmin: ClaimsSyncFirebaseAdmin;
}

export interface ClaimsSyncJobInput {
  userId: string;
  claims: DepartmentClaim[];
  isRemoval: boolean;
}

export interface ClaimsSyncJob extends ClaimsSyncJobInput {
  id: string;
}

/**
 * REQ-DEPT-004: persist a job row and enqueue it — never call Firebase Admin
 * inline from the request path, including for removals (revocation happens
 * in the worker, not at enqueue time).
 */
export async function enqueueClaimsSyncJob(
  deps: Pick<ClaimsSyncDeps, 'db' | 'queue'>,
  input: ClaimsSyncJobInput
): Promise<{ id: string }> {
  const result = await deps.db.query(
    `INSERT INTO department_claims_sync_jobs (user_id, claims, is_removal, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    [input.userId, JSON.stringify(input.claims), input.isRemoval]
  );

  const jobId = result.rows[0].id;
  await deps.queue.enqueue('department-claims-sync', { jobId, ...input });

  return { id: jobId };
}

/**
 * REQ-DEPT-005: mark the job complete only after setCustomUserClaims (and,
 * for removals, revokeRefreshTokens) resolves. A rejection propagates and
 * leaves the job retryable — no completion write happens.
 */
export async function processClaimsSyncJob(deps: ClaimsSyncDeps, job: ClaimsSyncJob): Promise<void> {
  await deps.firebaseAdmin.setCustomUserClaims(job.userId, { departments: job.claims });

  if (job.isRemoval) {
    await deps.firebaseAdmin.revokeRefreshTokens(job.userId);
  }

  await deps.db.query(
    `UPDATE department_claims_sync_jobs SET status = 'complete', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [job.id]
  );
}
