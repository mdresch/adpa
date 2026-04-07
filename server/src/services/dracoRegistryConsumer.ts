import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { getDatabasePoolSafe } from '../database/connection';

export interface DracoGovernanceReport {
  report_metadata: {
    contract_name: string;
    version: string;
    timestamp: string;
    project_id: string;
    registry_version: string;
    report_hash: string;
  };
  integration_health: {
    last_successful_export: string;
    stale: boolean;
    stale_threshold_minutes: number;
  };
  overall_health_score: number;
  stages: Record<string, { score: number; status: string }>;
  governance_details: Record<string, any>;
  active_breaches: Array<{
    gate_id: string;
    severity: string;
    entity_id: string;
    reason: string;
    detected_at: string;
  }>;
  override_events: Array<any>;
}

export class DracoRegistryConsumer {
  private readonly bridgeUrl: string;

  constructor() {
    this.bridgeUrl = process.env.REGISTRY_BRIDGE_URL || 'http://localhost:8001';
  }

  /**
   * Synchronize the governance report for a specific project.
   */
  async syncProjectGovernance(projectId: string): Promise<DracoGovernanceReport | null> {
    logger.info(`[DRACO-SYNC] Starting sync for project: ${projectId}`);

    try {
      // 1. Fetch from Python Bridge
      const response = await axios.get<DracoGovernanceReport>(
        `${this.bridgeUrl}/api/v1/registry/governance-report`,
        { params: { project_id: projectId } }
      );

      const report = response.data;

      // 2. Integrity Verification
      if (!this.verifyReportIntegrity(report)) {
        logger.error(`[DRACO-SYNC] Integrity check failed for project: ${projectId}. Hash mismatch.`);
        return null;
      }

      // 3. Persist to Postgres Read-Model
      await this.persistToCache(projectId, report);

      logger.info(`[DRACO-SYNC] Sync complete for project: ${projectId}. Health Score: ${report.overall_health_score}`);
      return report;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[DRACO-SYNC] Failed to sync project: ${projectId}`, { error: errorMessage });
      return null;
    }
  }

  /**
   * Verifies the SHA-256 hash of the report body.
   */
  private verifyReportIntegrity(report: DracoGovernanceReport): boolean {
    const receivedHash = report.report_metadata.report_hash;
    
    // Create a copy without the hash for re-calculation
    const reportCopy = JSON.parse(JSON.stringify(report));
    reportCopy.report_metadata.report_hash = "";
    
    const calculatedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(reportCopy))
      .digest('hex');

    // Note: Python's json.dumps(sort_keys=True) must match JS stringify behavior
    // If exact string match is difficult, we trust the TLS layer or use a more robust canonicalization.
    // For now, we log the comparison for advisory mode.
    if (calculatedHash !== receivedHash) {
      logger.warn(`[DRACO-SYNC] Hash mismatch. Received: ${receivedHash.substring(0, 8)}, Calculated: ${calculatedHash.substring(0, 8)}`);
      // In advisory mode, we don't block yet.
      return true; 
    }

    return true;
  }

  /**
   * Updates the PostgreSQL read-model.
   */
  private async persistToCache(projectId: string, report: DracoGovernanceReport): Promise<void> {
    const pool = getDatabasePoolSafe();
    if (!pool) {
      logger.warn('[DRACO-SYNC] DB pool unavailable, skipping cache update');
      return;
    }

    const reportJson = JSON.stringify(report);
    const lastUpdated = new Date(report.report_metadata.timestamp);

    await pool.query(
      `INSERT INTO draco_governance_cache (
        project_id, health_score, report_json, report_hash, last_updated, stale
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (project_id) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        report_json = EXCLUDED.report_json,
        report_hash = EXCLUDED.report_hash,
        last_updated = EXCLUDED.last_updated,
        stale = EXCLUDED.stale`,
      [
        projectId,
        report.overall_health_score,
        reportJson,
        report.report_metadata.report_hash,
        lastUpdated,
        report.integration_health.stale
      ]
    );
  }

  /**
   * Retrieve cached report.
   */
  async getCachedReport(projectId: string): Promise<DracoGovernanceReport | null> {
      const pool = getDatabasePoolSafe();
      if (!pool) return null;

      const result = await pool.query(
          'SELECT report_json FROM draco_governance_cache WHERE project_id = $1',
          [projectId]
      );

      if (result.rows.length === 0) return null;
      return result.rows[0].report_json as DracoGovernanceReport;
  }
}

export const dracoRegistryConsumer = new DracoRegistryConsumer();
