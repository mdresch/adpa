import { pool } from '../database/connection'

export interface AuditContext {
  userId?: string
  ip?: string
  userAgent?: string
  requestId?: string
}

export class AuditService {
  static async log(options: {
    table: string
    rowId?: string
    action: 'read' | 'create' | 'update' | 'delete' | 'soft_delete' | 'restore' | 'permanent_delete'
    reason?: string
    oldValues?: any
    newValues?: any
    ctx?: AuditContext
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_log (
           occurred_at, actor_user_id, ip, user_agent, request_id,
           table_name, row_id, action, reason, old_values, new_values
         ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          options.ctx?.userId || null,
          options.ctx?.ip || null,
          options.ctx?.userAgent || null,
          options.ctx?.requestId || null,
          options.table,
          options.rowId || null,
          options.action,
          options.reason || null,
          options.oldValues ? JSON.stringify(options.oldValues) : null,
          options.newValues ? JSON.stringify(options.newValues) : null,
        ]
      )
    } catch {
      // Never block primary flow on audit failure
    }
  }
}

export default AuditService


