import { getDatabasePool } from "../database/connection";
import { logger } from "../utils/logger";
import { templateAuditService } from "../services/templateAuditService";

/**
 * Cleanup script to fix "hanging" template audits.
 * - Identifies audits stuck in 'pending' status for more than 15 minutes.
 * - Resumes them if the template still exists.
 * - Marks as failed if they cannot be resumed.
 */
async function cleanupHangingAudits() {
  const pool = getDatabasePool();
  logger.info("[AUDIT-CLEANUP] Starting cleanup of hanging template audits...");

  try {
    // 1. Find audits stuck in 'pending' or 'processing' for > 15 mins
    // Note: 'processing' isn't explicitly used in template_audits yet but good for future proofing
    const stuckAudits = await pool.query(`
      SELECT ta.*, t.id as template_exists
      FROM template_audits ta
      LEFT JOIN templates t ON t.id = ta.template_id
      WHERE ta.status IN ('pending', 'processing')
        AND ta.created_at < NOW() - INTERVAL '15 minutes'
    `);

    logger.info(`[AUDIT-CLEANUP] Found ${stuckAudits.rowCount} stuck audits.`);

    for (const audit of stuckAudits.rows) {
      logger.info(`[AUDIT-CLEANUP] Processing stuck audit: ${audit.id} (Template: ${audit.template_id})`);

      if (!audit.template_exists) {
        logger.warn(`[AUDIT-CLEANUP] Template ${audit.template_id} no longer exists. Marking audit as failed.`);
        await pool.query(
          "UPDATE template_audits SET status = 'failed', error_message = 'Template deleted before audit completion', completed_at = NOW() WHERE id = $1",
          [audit.id]
        );
        continue;
      }

      // 2. Fetch full template data to resume
      const templateResult = await pool.query(
        "SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL",
        [audit.template_id]
      );
      
      if (templateResult.rows.length === 0) {
        logger.warn(`[AUDIT-CLEANUP] Template ${audit.template_id} is deleted. Marking audit as failed.`);
        await pool.query(
          "UPDATE template_audits SET status = 'failed', error_message = 'Template deleted', completed_at = NOW() WHERE id = $1",
          [audit.id]
        );
        continue;
      }

      const templateData = templateResult.rows[0];

      // 3. Resume the audit
      logger.info(`[AUDIT-CLEANUP] Resuming audit ${audit.id} for template ${templateData.name}...`);
      
      // Update status to processing first to prevent re-pickup if script is run again
      await pool.query("UPDATE template_audits SET status = 'processing' WHERE id = $1", [audit.id]);

      try {
        await templateAuditService.runAudit(audit.id, templateData);
        logger.info(`[AUDIT-CLEANUP] Successfully resumed and completed audit ${audit.id}.`);
      } catch (err: any) {
        logger.error(`[AUDIT-CLEANUP] Failed to resume audit ${audit.id}:`, err.message);
        await pool.query(
          "UPDATE template_audits SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2",
          [err.message || 'Resume failed', audit.id]
        );
      }
    }

    logger.info("[AUDIT-CLEANUP] Cleanup finished.");
  } catch (error: any) {
    logger.error("[AUDIT-CLEANUP] Fatal error during cleanup:", error.message);
  }
}

// Run if called directly
if (require.main === module) {
  const { connectDatabase } = require("../database/connection");
  connectDatabase()
    .then(() => cleanupHangingAudits())
    .catch((err: any) => logger.error("DB Connection failed:", err))
    .finally(() => process.exit(0));
}

export { cleanupHangingAudits };
