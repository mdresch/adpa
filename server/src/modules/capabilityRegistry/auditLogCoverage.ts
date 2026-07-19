import { PoolClient } from 'pg';

export interface AuditLogDigestWrite {
  tableName: string;
  rowId: string;
  action: string;
  actorUserId: string | null;
  /** Row content as stored (raw pg row shape), before the write. Digested, never stored raw. */
  oldRow?: Record<string, unknown> | null;
  /** Row content as stored (raw pg row shape), after the write. Digested, never stored raw. */
  newRow?: Record<string, unknown> | null;
}

/**
 * Inserts one audit_log row through the existing hash-chain trigger
 * (trg_audit_log_before_insert, 000_baseline.sql) -- prev_hash/hash are
 * computed by the trigger itself, never by this function. Uses
 * capability_row_digest (migration 444) so old_values/new_values carry a
 * digest of the canonicalized row, never the raw justification text or
 * requester identity (ADR-012 §D, hard requirement) -- see that migration's
 * own comment for why casting through jsonb is sufficient canonicalization.
 *
 * Caller MUST run this against the same PoolClient/transaction as the write
 * it's auditing -- this function never opens its own transaction. A caller
 * that passes a bare Pool here (instead of the in-flight transaction's
 * client) reopens exactly the "coverage, not integrity" gap this Action
 * Item exists to close: the audit row would land in a different, unguarded
 * transaction from the write it's supposed to prove happened.
 */
export async function insertAuditLogDigest(client: PoolClient, write: AuditLogDigestWrite): Promise<void> {
  await client.query(
    `INSERT INTO audit_log (table_name, row_id, action, actor_user_id, old_values, new_values)
     VALUES (
       $1, $2, $3, $4,
       CASE WHEN $5::jsonb IS NULL THEN NULL ELSE jsonb_build_object('digest', capability_row_digest($5::jsonb)) END,
       CASE WHEN $6::jsonb IS NULL THEN NULL ELSE jsonb_build_object('digest', capability_row_digest($6::jsonb)) END
     )`,
    [
      write.tableName,
      write.rowId,
      write.action,
      write.actorUserId,
      write.oldRow ? JSON.stringify(write.oldRow) : null,
      write.newRow ? JSON.stringify(write.newRow) : null
    ]
  );
}
