import {
  enqueueClaimsSyncJob,
  processClaimsSyncJob,
  ClaimsSyncDeps
} from '../../../modules/departments/departmentClaimsSyncJob';

function makeDeps(overrides: Partial<ClaimsSyncDeps> = {}): ClaimsSyncDeps {
  return {
    db: { query: jest.fn().mockResolvedValue({ rows: [{ id: 'job-1' }] }) },
    queue: { enqueue: jest.fn().mockResolvedValue({ jobId: 'job-1' }) },
    firebaseAdmin: {
      setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
      revokeRefreshTokens: jest.fn().mockResolvedValue(undefined)
    },
    ...overrides
  };
}

describe('federated-capability-ownership: departmentClaimsSyncJob', () => {
  // REQ-DEPT-004: enqueue never calls Firebase directly — this is the dual-write guard
  describe('REQ-DEPT-004: enqueue never calls Firebase directly', () => {
    it('persists a job row and enqueues onto the queue, without touching Firebase Admin', async () => {
      const deps = makeDeps();
      await enqueueClaimsSyncJob(deps, {
        userId: 'u1',
        claims: [{ portfolioId: 'p1', department: 'Compliance', role: 'member' }],
        isRemoval: false
      });

      expect(deps.db.query).toHaveBeenCalled();
      expect(deps.queue.enqueue).toHaveBeenCalled();
      expect(deps.firebaseAdmin.setCustomUserClaims).not.toHaveBeenCalled();
      expect(deps.firebaseAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });

    it('enqueues even for a removal — revocation happens in the worker, not at enqueue time', async () => {
      const deps = makeDeps();
      await enqueueClaimsSyncJob(deps, { userId: 'u1', claims: [], isRemoval: true });

      expect(deps.firebaseAdmin.setCustomUserClaims).not.toHaveBeenCalled();
      expect(deps.firebaseAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });
  });

  // REQ-DEPT-005: job completes only after a successful Firebase call
  describe('REQ-DEPT-005: job completes only after successful Firebase call', () => {
    const job = {
      id: 'job-1',
      userId: 'u1',
      claims: [{ portfolioId: 'p1', department: 'Compliance', role: 'member' as const }],
      isRemoval: false
    };

    it('calls setCustomUserClaims and marks the job complete on success', async () => {
      const deps = makeDeps();
      await processClaimsSyncJob(deps, job);

      expect(deps.firebaseAdmin.setCustomUserClaims).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ departments: job.claims })
      );
      const completionCall = (deps.db.query as jest.Mock).mock.calls.find(([sql]) =>
        /complete/i.test(sql)
      );
      expect(completionCall).toBeDefined();
    });

    it('also revokes refresh tokens when the job is a removal', async () => {
      const deps = makeDeps();
      await processClaimsSyncJob(deps, { ...job, isRemoval: true });

      expect(deps.firebaseAdmin.revokeRefreshTokens).toHaveBeenCalledWith('u1');
    });

    it('does not revoke refresh tokens when the job is an add/update', async () => {
      const deps = makeDeps();
      await processClaimsSyncJob(deps, job);

      expect(deps.firebaseAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });

    it('propagates the error and does not mark the job complete when Firebase rejects', async () => {
      const deps = makeDeps({
        firebaseAdmin: {
          setCustomUserClaims: jest.fn().mockRejectedValue(new Error('Firebase unavailable')),
          revokeRefreshTokens: jest.fn().mockResolvedValue(undefined)
        }
      });

      await expect(processClaimsSyncJob(deps, job)).rejects.toThrow('Firebase unavailable');

      const completionCall = (deps.db.query as jest.Mock).mock.calls.find(([sql]) =>
        /complete/i.test(sql)
      );
      expect(completionCall).toBeUndefined();
    });
  });
});
