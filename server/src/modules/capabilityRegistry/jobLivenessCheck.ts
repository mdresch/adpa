/**
 * Pure, DB-independent contract for scheduled-job liveness monitoring (ADR-005
 * Phase 5 task 4: "the reconciliation job needs its own liveness monitoring").
 * Generic across any periodic job using scheduled_job_heartbeats (migration
 * 437), not specific to capability-registry jobs, but introduced here since
 * this packet is what first needed it -- see
 * docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase5-design.md.
 */

export interface JobHeartbeatRow {
  jobName: string;
  lastSuccessAt: Date | string | null;
}

export interface JobLivenessExpectation {
  jobName: string;
  expectedIntervalMs: number;
}

export interface StaleJob {
  jobName: string;
  lastSuccessAt: Date | null;
}

/**
 * A job is stale if it has never recorded a success, or its last success is
 * older than 2x its expected run interval -- a detective control staying
 * silent for one missed tick shouldn't alarm; staying silent for two should.
 */
export function findStaleJobs(
  heartbeats: JobHeartbeatRow[],
  expectations: JobLivenessExpectation[],
  now: Date
): StaleJob[] {
  const heartbeatByName = new Map(heartbeats.map((row) => [row.jobName, row]));
  const stale: StaleJob[] = [];

  for (const expectation of expectations) {
    const heartbeat = heartbeatByName.get(expectation.jobName);
    const lastSuccessAt = heartbeat?.lastSuccessAt
      ? heartbeat.lastSuccessAt instanceof Date
        ? heartbeat.lastSuccessAt
        : new Date(heartbeat.lastSuccessAt)
      : null;

    const staleThresholdMs = expectation.expectedIntervalMs * 2;
    const isStale = !lastSuccessAt || now.getTime() - lastSuccessAt.getTime() > staleThresholdMs;

    if (isStale) {
      stale.push({ jobName: expectation.jobName, lastSuccessAt });
    }
  }

  return stale;
}
