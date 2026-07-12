import { findStaleJobs, JobHeartbeatRow, JobLivenessExpectation } from '../../../modules/capabilityRegistry/jobLivenessCheck';

describe('federated-capability-ownership: jobLivenessCheck', () => {
  const now = new Date('2026-07-12T12:00:00Z');
  const hourly: JobLivenessExpectation = { jobName: 'capability-attestation', expectedIntervalMs: 60 * 60 * 1000 };

  it('REQ-PHASE5-LIVE-001: does not flag a job that succeeded recently (within the interval)', () => {
    const heartbeats: JobHeartbeatRow[] = [
      { jobName: 'capability-attestation', lastSuccessAt: new Date('2026-07-12T11:30:00Z') }
    ];
    expect(findStaleJobs(heartbeats, [hourly], now)).toEqual([]);
  });

  it('REQ-PHASE5-LIVE-002: does not flag a job that missed one tick but is still under 2x the interval', () => {
    const heartbeats: JobHeartbeatRow[] = [
      { jobName: 'capability-attestation', lastSuccessAt: new Date('2026-07-12T10:30:00Z') } // 1.5h ago
    ];
    expect(findStaleJobs(heartbeats, [hourly], now)).toEqual([]);
  });

  it('REQ-PHASE5-LIVE-003: flags a job whose last success is older than 2x the expected interval', () => {
    const heartbeats: JobHeartbeatRow[] = [
      { jobName: 'capability-attestation', lastSuccessAt: new Date('2026-07-12T09:00:00Z') } // 3h ago
    ];
    const result = findStaleJobs(heartbeats, [hourly], now);
    expect(result).toHaveLength(1);
    expect(result[0].jobName).toBe('capability-attestation');
  });

  it('REQ-PHASE5-LIVE-004: flags a job with no heartbeat row at all', () => {
    const result = findStaleJobs([], [hourly], now);
    expect(result).toEqual([{ jobName: 'capability-attestation', lastSuccessAt: null }]);
  });

  it('REQ-PHASE5-LIVE-005: flags a job whose heartbeat row exists but has never succeeded (lastSuccessAt null)', () => {
    const heartbeats: JobHeartbeatRow[] = [{ jobName: 'capability-attestation', lastSuccessAt: null }];
    const result = findStaleJobs(heartbeats, [hourly], now);
    expect(result).toEqual([{ jobName: 'capability-attestation', lastSuccessAt: null }]);
  });

  it('REQ-PHASE5-LIVE-006: accepts string dates (raw DB rows), not only Date instances', () => {
    const heartbeats: JobHeartbeatRow[] = [
      { jobName: 'capability-attestation', lastSuccessAt: '2026-07-12T09:00:00Z' }
    ];
    const result = findStaleJobs(heartbeats, [hourly], now);
    expect(result).toHaveLength(1);
  });
});
