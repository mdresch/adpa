/**
 * ADR-012 PR6a: manual, real-Postgres verification for decide_capability_request
 * (migration 445). Not a Jest test -- server/tests/integration/'s shared harness
 * (tests/setup/integration-setup.js) unconditionally requires src/server.ts, which
 * is currently broken repo-wide by unrelated pre-existing issues (see PR2/PR3's
 * own notes), the same reason the existing Phase 6/7 suites already fell back to
 * a standalone script instead of a blocked integration test.
 *
 * Everything here runs inside one transaction that is always ROLLBACK'd at the
 * end, success or failure -- safe to run repeatedly against a real, shared
 * database (including this project's persistent Azure dev instance) without
 * leaving any seeded data or actually deciding anything behind.
 *
 * Run: cd server && npx tsx --require dotenv/config scripts/verify-decide-capability-request.ts
 */
import { randomUUID } from 'crypto';
import { connectDatabase, getDatabasePool, getDatabasePoolSafe } from '../src/database/connection';

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label: string, detail: unknown) {
  failed++;
  console.error(`  ❌ ${label}`, detail);
}

async function expectThrows(label: string, fn: () => Promise<unknown>, messagePattern: RegExp) {
  try {
    await fn();
    fail(label, 'expected an exception, none was thrown');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (messagePattern.test(message)) {
      ok(label);
    } else {
      fail(label, `wrong exception: ${message}`);
    }
  }
}

async function main() {
  await connectDatabase();
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const suffix = randomUUID().slice(0, 8);
    const requesterEmail = `verify-decide-requester-${suffix}@example.com`;
    const approverEmail = `verify-decide-approver-${suffix}@example.com`;
    const outsiderEmail = `verify-decide-outsider-${suffix}@example.com`;

    const requester = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, 'x', 'Verify Requester', 'user') RETURNING id`,
      [requesterEmail]
    );
    const approver = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, 'x', 'Verify Approver', 'user') RETURNING id`,
      [approverEmail]
    );
    const outsider = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, 'x', 'Verify Outsider', 'user') RETURNING id`,
      [outsiderEmail]
    );
    const requesterId = requester.rows[0].id;
    const approverId = approver.rows[0].id;
    const outsiderId = outsider.rows[0].id;

    const company = await client.query(`INSERT INTO companies (name) VALUES ($1) RETURNING id`, [
      `Verify Decide Co ${suffix}`
    ]);
    const portfolio = await client.query(`SELECT id FROM portfolio_governance WHERE company_id = $1`, [
      company.rows[0].id
    ]);
    const portfolioId = portfolio.rows[0].id;

    await client.query(
      `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'Compliance', 'member')`,
      [requesterId, portfolioId]
    );
    await client.query(
      `INSERT INTO user_departments (user_id, portfolio_id, department, department_role) VALUES ($1, $2, 'Compliance', 'member')`,
      [approverId, portfolioId]
    );

    const capability = await client.query(
      `INSERT INTO capability_registry (portfolio_id, module_id, functional_owner_department)
       VALUES ($1, $2, 'Compliance') RETURNING id`,
      [portfolioId, `verify-decide-${suffix}`]
    );
    const capabilityId = capability.rows[0].id;

    async function createRequest(): Promise<string> {
      const result = await client.query(
        `INSERT INTO capability_override_requests
           (capability_id, requested_new_status, justification, requested_by, requested_by_department)
         VALUES ($1, 'active', 'verification run', $2, 'Compliance') RETURNING id`,
        [capabilityId, requesterId]
      );
      return result.rows[0].id;
    }

    async function auditRowFor(requestId: string, action: string) {
      const result = await client.query(
        `SELECT new_values FROM audit_log WHERE table_name = 'capability_override_requests' AND row_id = $1 AND action = $2 ORDER BY occurred_at DESC LIMIT 1`,
        [requestId, action]
      );
      return result.rows[0] ?? null;
    }

    // --- REQ-CAP-6A-001: approved ---
    {
      const requestId = await createRequest();
      await client.query(`SELECT decide_capability_request($1, 'approved', $2, 'Compliance', $3, $4)`, [
        requestId,
        approverId,
        'looks justified',
        new Date(Date.now() + 72 * 60 * 60 * 1000)
      ]);
      const row = await client.query(`SELECT status, approved_by, override_expires_at FROM capability_override_requests WHERE id = $1`, [
        requestId
      ]);
      if (row.rows[0].status === 'approved' && row.rows[0].approved_by === approverId && row.rows[0].override_expires_at) {
        ok('REQ-CAP-6A-001: approved transition sets status/approved_by/override_expires_at');
      } else {
        fail('REQ-CAP-6A-001', row.rows[0]);
      }
      const audit = await auditRowFor(requestId, 'approved');
      if (audit && audit.new_values?.digest && !JSON.stringify(audit.new_values).includes('looks justified')) {
        ok('REQ-CAP-6A-001: audit_log row carries a digest, not the raw justification');
      } else {
        fail('REQ-CAP-6A-001 audit row', audit);
      }
    }

    // --- REQ-CAP-6A-002: denied ---
    {
      const requestId = await createRequest();
      await client.query(`SELECT decide_capability_request($1, 'denied', $2, 'Compliance', $3, NULL)`, [
        requestId,
        approverId,
        'not justified'
      ]);
      const row = await client.query(`SELECT status, denial_reason FROM capability_override_requests WHERE id = $1`, [requestId]);
      if (row.rows[0].status === 'denied' && row.rows[0].denial_reason === 'not justified') {
        ok('REQ-CAP-6A-002: denied transition sets status/denial_reason');
      } else {
        fail('REQ-CAP-6A-002', row.rows[0]);
      }
    }

    // --- REQ-CAP-6A-003: withdrawn ---
    {
      const requestId = await createRequest();
      await client.query(`SELECT decide_capability_request($1, 'withdrawn', $2, NULL, NULL, NULL)`, [requestId, requesterId]);
      const row = await client.query(`SELECT status, withdrawn_at, approved_by FROM capability_override_requests WHERE id = $1`, [
        requestId
      ]);
      if (row.rows[0].status === 'withdrawn' && row.rows[0].withdrawn_at && row.rows[0].approved_by === null) {
        ok('REQ-CAP-6A-003: withdrawn transition sets status/withdrawn_at, leaves approved_by null');
      } else {
        fail('REQ-CAP-6A-003', row.rows[0]);
      }
    }

    // --- Negative cases ---
    {
      const requestId = await createRequest();
      await expectThrows(
        'REQ-CAP-6A-004: a non-requester cannot withdraw',
        () => client.query(`SELECT decide_capability_request($1, 'withdrawn', $2, NULL, NULL, NULL)`, [requestId, outsiderId]),
        /only the requester may withdraw/
      );
    }
    {
      const requestId = await createRequest();
      await expectThrows(
        'REQ-CAP-6A-005: the requester cannot approve their own request',
        () => client.query(`SELECT decide_capability_request($1, 'approved', $2, 'Compliance', $3, $4)`, [
          requestId,
          requesterId,
          'self-approval attempt',
          new Date()
        ]),
        /must be a different person from the requester/
      );
    }
    {
      const requestId = await createRequest();
      await expectThrows(
        'REQ-CAP-6A-006: a non-department-member cannot approve',
        () => client.query(`SELECT decide_capability_request($1, 'approved', $2, 'Compliance', $3, $4)`, [
          requestId,
          outsiderId,
          'outsider attempt',
          new Date()
        ]),
        /has no active member in portfolio/
      );
    }
    {
      const requestId = await createRequest();
      await client.query(`SELECT decide_capability_request($1, 'approved', $2, 'Compliance', $3, $4)`, [
        requestId,
        approverId,
        'first decision',
        new Date()
      ]);
      await expectThrows(
        'REQ-CAP-6A-007: an already-decided request cannot be decided again',
        () => client.query(`SELECT decide_capability_request($1, 'denied', $2, 'Compliance', $3, NULL)`, [
          requestId,
          approverId,
          'second decision attempt'
        ]),
        /has already been decided/
      );
    }

    // --- PR6c: decision-column trigger lockdown (migration 446) ---
    {
      const requestId = await createRequest();
      await expectThrows(
        'REQ-CAP-6C-001: a direct UPDATE of status bypassing the procedure is rejected',
        () => client.query(`UPDATE capability_override_requests SET status = 'approved' WHERE id = $1`, [requestId]),
        /decision columns may only be changed via decide_capability_request/
      );
    }
    {
      const requestId = await createRequest();
      await expectThrows(
        'REQ-CAP-6C-002: a direct UPDATE of another guarded column (denial_reason) is also rejected',
        () => client.query(`UPDATE capability_override_requests SET denial_reason = 'sneaking this in' WHERE id = $1`, [requestId]),
        /decision columns may only be changed via decide_capability_request/
      );
    }
    {
      const requestId = await createRequest();
      try {
        await client.query(`UPDATE capability_override_requests SET justification = 'edited justification' WHERE id = $1`, [
          requestId
        ]);
        const row = await client.query(`SELECT justification FROM capability_override_requests WHERE id = $1`, [requestId]);
        if (row.rows[0].justification === 'edited justification') {
          ok('REQ-CAP-6C-003: an UPDATE touching only a non-decision column still succeeds (trigger scoped, not row-wide)');
        } else {
          fail('REQ-CAP-6C-003', row.rows[0]);
        }
      } catch (error) {
        fail('REQ-CAP-6C-003: non-decision-column UPDATE unexpectedly rejected', error);
      }
    }
    {
      // The trigger fires even for UPDATEs issued from inside decide_capability_request
      // itself (it's a row-level BEFORE UPDATE trigger, not aware of its own caller) --
      // this is the test that would have caught forgetting to set the guard variable
      // before the procedure's own UPDATE.
      const requestId = await createRequest();
      try {
        await client.query(`SELECT decide_capability_request($1, 'approved', $2, 'Compliance', $3, $4)`, [
          requestId,
          approverId,
          'still works once the lockdown is active',
          new Date()
        ]);
        const row = await client.query(`SELECT status FROM capability_override_requests WHERE id = $1`, [requestId]);
        if (row.rows[0].status === 'approved') {
          ok('REQ-CAP-6C-004: decide_capability_request still works once its own trigger is enforcing');
        } else {
          fail('REQ-CAP-6C-004', row.rows[0]);
        }
      } catch (error) {
        fail('REQ-CAP-6C-004: decide_capability_request broke under its own lockdown', error);
      }
    }

    console.log(`\n${passed} passed, ${failed} failed`);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

main()
  .then(async () => {
    await getDatabasePool().end().catch(() => {});
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(async (error) => {
    console.error('verify-decide-capability-request crashed:', error);
    await getDatabasePoolSafe()?.end().catch(() => {});
    process.exit(1);
  });
