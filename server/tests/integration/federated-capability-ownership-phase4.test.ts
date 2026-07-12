/**
 * Real-Postgres proof for ADR-005 Phase 4 tasks 2/3/5 (see
 * docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md and
 * docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase4-design.md):
 * migration 436's DRACO verdict gate on promote_capability_status's
 * transition to 'active'. draco_reviews rows are inserted directly via SQL
 * (document_id left NULL, which the schema allows) rather than through
 * dracoService -- this packet tests the DB-level gate, not DRACO's own board
 * review pipeline. Each `it` runs inside a transaction that's rolled back
 * afterward (tests/setup/integration-setup.js).
 */
import { randomUUID } from 'crypto';
import { pool } from '../../src/database/connection';

async function createTestPortfolio(): Promise<string> {
  const companyResult = await pool.query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
    [`Test Co ${randomUUID()}`]
  );
  const portfolioResult = await pool.query(
    `SELECT id FROM portfolio_governance WHERE company_id = $1`,
    [companyResult.rows[0].id]
  );
  return portfolioResult.rows[0].id;
}

async function createCapabilityPendingApproval(portfolioId: string): Promise<string> {
  const moduleId = `test-module-${randomUUID()}`;
  const result = await pool.query(
    `INSERT INTO capability_registry (portfolio_id, module_id) VALUES ($1, $2) RETURNING id`,
    [portfolioId, moduleId]
  );
  const capabilityId = result.rows[0].id;
  await pool.query(`SELECT promote_capability_status($1, 'pending_department_approval', NULL, 'submit')`, [capabilityId]);
  return capabilityId;
}

async function createDracoReview(verdict: 'PASS' | 'CONDITIONAL_PASS' | 'REJECT'): Promise<string> {
  const result = await pool.query(`INSERT INTO draco_reviews (verdict) VALUES ($1) RETURNING id`, [verdict]);
  return result.rows[0].id;
}

async function getStatus(capabilityId: string): Promise<string> {
  const result = await pool.query(`SELECT activation_status FROM capability_registry WHERE id = $1`, [capabilityId]);
  return result.rows[0].activation_status;
}

describe('ADR-005 Phase 4 integration: DRACO activation gate', () => {
  describe('task 2: verdict required for activation', () => {
    it('rejects activation with no draco_verdict_id', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapabilityPendingApproval(portfolioId);

      await expect(
        pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'go live')`, [capabilityId])
      ).rejects.toThrow(/activation to active requires a draco_verdict_id/);
      expect(await getStatus(capabilityId)).toBe('pending_department_approval');
    });

    it('rejects activation with a draco_verdict_id that does not reference a real draco_reviews row', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapabilityPendingApproval(portfolioId);
      const fakeVerdictId = randomUUID();

      await expect(
        pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'go live', $2)`, [capabilityId, fakeVerdictId])
      ).rejects.toThrow(/does not reference an existing draco_reviews row/);
    });

    it('accepts activation with a real PASS verdict and no override', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapabilityPendingApproval(portfolioId);
      const verdictId = await createDracoReview('PASS');

      await pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'go live', $2)`, [capabilityId, verdictId]);

      expect(await getStatus(capabilityId)).toBe('active');
      const history = await pool.query(
        `SELECT draco_verdict_id, is_override FROM capability_activation_history WHERE capability_id = $1 ORDER BY changed_at DESC LIMIT 1`,
        [capabilityId]
      );
      expect(history.rows[0].draco_verdict_id).toBe(verdictId);
      expect(history.rows[0].is_override).toBe(false);
    });
  });

  describe('task 3: CONDITIONAL_PASS and REJECT require an override, not just REJECT', () => {
    it.each(['CONDITIONAL_PASS', 'REJECT'] as const)('rejects activation with a %s verdict and no override', async (verdict) => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapabilityPendingApproval(portfolioId);
      const verdictId = await createDracoReview(verdict);

      await expect(
        pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'go live', $2)`, [capabilityId, verdictId])
      ).rejects.toThrow(new RegExp(`draco verdict ${verdict} requires an override to activate`));
      expect(await getStatus(capabilityId)).toBe('pending_department_approval');
    });

    it.each(['CONDITIONAL_PASS', 'REJECT'] as const)(
      'rejects an override attempt for %s with no justification',
      async (verdict) => {
        const portfolioId = await createTestPortfolio();
        const capabilityId = await createCapabilityPendingApproval(portfolioId);
        const verdictId = await createDracoReview(verdict);

        await expect(
          pool.query(
            `SELECT promote_capability_status($1, 'active', NULL, NULL, $2, true, NOW() + INTERVAL '72 hours')`,
            [capabilityId, verdictId]
          )
        ).rejects.toThrow(/requires a non-empty justification/);
      }
    );

    it.each(['CONDITIONAL_PASS', 'REJECT'] as const)(
      'rejects an override attempt for %s with no override_expires_at',
      async (verdict) => {
        const portfolioId = await createTestPortfolio();
        const capabilityId = await createCapabilityPendingApproval(portfolioId);
        const verdictId = await createDracoReview(verdict);

        await expect(
          pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'justified override', $2, true)`, [
            capabilityId,
            verdictId
          ])
        ).rejects.toThrow(/requires override_expires_at to be set/);
      }
    );

    it.each(['CONDITIONAL_PASS', 'REJECT'] as const)(
      'accepts activation with a %s verdict plus a valid override, recording both',
      async (verdict) => {
        const portfolioId = await createTestPortfolio();
        const capabilityId = await createCapabilityPendingApproval(portfolioId);
        const verdictId = await createDracoReview(verdict);

        await pool.query(
          `SELECT promote_capability_status($1, 'active', NULL, 'justified override', $2, true, NOW() + INTERVAL '72 hours')`,
          [capabilityId, verdictId]
        );

        expect(await getStatus(capabilityId)).toBe('active');
        const history = await pool.query(
          `SELECT draco_verdict_id, is_override, override_expires_at FROM capability_activation_history WHERE capability_id = $1 ORDER BY changed_at DESC LIMIT 1`,
          [capabilityId]
        );
        expect(history.rows[0].draco_verdict_id).toBe(verdictId);
        expect(history.rows[0].is_override).toBe(true);
        expect(history.rows[0].override_expires_at).not.toBeNull();
      }
    );
  });

  describe('regression: non-active transitions are unaffected by the DRACO gate', () => {
    it('draft -> pending_department_approval requires no verdict', async () => {
      const portfolioId = await createTestPortfolio();
      const moduleId = `test-module-${randomUUID()}`;
      const result = await pool.query(
        `INSERT INTO capability_registry (portfolio_id, module_id) VALUES ($1, $2) RETURNING id`,
        [portfolioId, moduleId]
      );
      const capabilityId = result.rows[0].id;

      await pool.query(`SELECT promote_capability_status($1, 'pending_department_approval', NULL, 'submit')`, [capabilityId]);
      expect(await getStatus(capabilityId)).toBe('pending_department_approval');
    });

    it('active -> disabled requires no verdict', async () => {
      const portfolioId = await createTestPortfolio();
      const capabilityId = await createCapabilityPendingApproval(portfolioId);
      const verdictId = await createDracoReview('PASS');
      await pool.query(`SELECT promote_capability_status($1, 'active', NULL, 'go live', $2)`, [capabilityId, verdictId]);

      await pool.query(`SELECT promote_capability_status($1, 'disabled', NULL, 'shut down')`, [capabilityId]);
      expect(await getStatus(capabilityId)).toBe('disabled');
    });
  });
});
