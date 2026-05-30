import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { executeDracoDebate } from '../services/governance/dracoDebateEngine';
import { calculateEffectiveness, classifyEffectiveness } from '../lib/governance/scoringEngine';
import { dispatchGovernanceEscalation } from '../lib/governance/escalationRouter';

interface ControlDegradationPayload {
  ruleCode: string;
  documentType: 'TECHNICAL_SPEC' | 'STRATEGIC_CHARTER' | 'OPERATIONAL_PLAYBOOK';
  minimumRequiredScore: number;
  mandatoryKeywords: string[];
  historicalTrend: any[];
  failureLogs: any[];
}

/**
 * Listens to database control state mutations and routes INEFFECTIVE 
 * statuses out-of-band to the Draco Tribunal Engine.
 */
export async function initializeEffectivenessListener(): Promise<void> {
  const client = await pool.connect();

  try {
    // ─── LAYER 1: EVENT-DRIVEN FAST PATH (LISTEN/NOTIFY) ────────────────────
    await client.query('LISTEN governance_control_mutation');
    logger.info('📡 ADPA Worker Loop: Actively listening on channel [governance_control_mutation]...');

    client.on('notification', async (msg) => {
      if (!msg.payload || msg.channel !== 'governance_control_mutation') return;

      try {
        const payload: ControlDegradationPayload = JSON.parse(msg.payload);
        await triggerAdjudication(payload);
      } catch (parseError) {
        logger.error('❌ Worker failed to parse governance notification payload:', parseError);
      }
    });

    // ─── LAYER 2: POLLING FALLBACK (SAFETY SWEEP) ──────────────────────────
    // Every 5 minutes, sweep for INEFFECTIVE controls that missed the notify trigger
    setInterval(async () => {
      await performSafetySweep();
    }, 5 * 60 * 1000);

    // Run one sweep immediately on startup
    performSafetySweep().catch(err => logger.error('[WORKER] Initial safety sweep failed', err));

    // Basic reconnect resiliency block
    client.on('error', (err) => {
      logger.error('⚠️ Governance background listener encountered network drop. Attempting reboot...', err);
      client.release();
      setTimeout(() => initializeEffectivenessListener(), 5000);
    });

  } catch (error) {
    logger.error('🚨 Critical: Failed to establish background database event listener hook:', error);
    client.release();
    throw error;
  }
}

/**
 * Triggers the Draco Tribunal for a specific control failure.
 */
async function triggerAdjudication(payload: ControlDegradationPayload) {
  logger.warn(`🚨 ADJUDICATION TRIGGERED: Control '${payload.ruleCode}' is INEFFECTIVE.`);
  logger.info(`[WORKER] Spawning autonomous Draco Tribunal for template profile: ${payload.documentType}`);

  try {
    const templateGates = {
      minimumRequiredScore: payload.minimumRequiredScore,
      mandatoryKeywords: payload.mandatoryKeywords
    };

    const outcome = await executeDracoDebate(
      payload.ruleCode,
      payload.documentType,
      templateGates,
      payload.historicalTrend,
      payload.failureLogs
    );

    logger.info(`[WORKER] Draco Tribunal processing complete. Outcome Status: ${outcome.finalStatus}`);
  } catch (error) {
    logger.error(`[WORKER] Adjudication failed for ${payload.ruleCode}:`, error);
  }
}

/**
 * Sweeps for INEFFECTIVE controls that do not have a PENDING audit record.
 */
async function performSafetySweep() {
  logger.info('[WORKER] Running Governance Safety Sweep...');
  
  try {
    // Find active, ineffective policies that don't have a PENDING ledger record
    const res = await pool.query(`
      SELECT 
        rule_code, 
        target_document_types, 
        execution_schema,
        control_effectiveness_score
      FROM policy_library 
      WHERE control_effectiveness_status = 'INEFFECTIVE'
      AND status = 'ACTIVE'
      AND rule_code NOT IN (
        SELECT rule_code FROM governance_audit_ledger WHERE decision_status = 'PENDING'
      );
    `);

    if (res.rows.length === 0) {
      logger.info('[WORKER] Safety sweep complete. No orphaned ineffective controls found.');
      return;
    }

    logger.warn(`[WORKER] Found ${res.rows.length} orphaned ineffective controls. Triggering tribunals...`);

    for (const row of res.rows) {
      const docType = (row.target_document_types && row.target_document_types[0]) || 'TECHNICAL_SPEC';
      
      const payload: ControlDegradationPayload = {
        ruleCode: row.rule_code,
        documentType: docType,
        minimumRequiredScore: row.execution_schema?.minimumRequiredScore || 90,
        mandatoryKeywords: row.execution_schema?.mandatoryKeywords || [],
        historicalTrend: [], // Trend will be gathered by the tribunal logic or we can inject it here
        failureLogs: []
      };

      await triggerAdjudication(payload);
    }

  } catch (error) {
    logger.error('[WORKER] Safety sweep execution failed:', error);
  }
}

/**
 * Legacy/Score Update Worker
 * Listens for telemetry updates and calculates control effectiveness scores.
 */
export async function startEffectivenessWorker() {
  const client = await pool.connect();
  
  try {
    await client.query('LISTEN telemetry_updated');
    logger.info('🚀 Governance Engine: Listening for asynchronous telemetry notifications on [telemetry_updated]...');

    client.on('notification', async (msg) => {
      if (!msg.payload || msg.channel !== 'telemetry_updated') return;
      const ruleCode = msg.payload;

      // Use shared execution pool for processing tasks
      const processorClient = await pool.connect();

      try {
        const fetchQuery = 'SELECT title, control_effectiveness_status, telemetry_metrics FROM policy_library WHERE rule_code = $1;';
        const fetchResult = await processorClient.query(fetchQuery, [ruleCode]);
        
        if (fetchResult.rows.length === 0) return;
        
        const currentRow = fetchResult.rows[0];
        const previousStatus = currentRow.control_effectiveness_status || "INITIALIZING";
        const t = currentRow.telemetry_metrics || {};
        
        const metrics = calculateEffectiveness({
          userOverrideCount: Number(t.userOverrideCount || 0),
          totalInvocations: Number(t.totalRuns || 0),
          successfulPatches: Number(t.successfulPatches || 0),
          averageComplianceScore: Number(t.averageComplianceScore || 1.0)
        });

        const status = classifyEffectiveness(metrics.score);

        await processorClient.query('BEGIN;');

        const insertLedgerQuery = `
          INSERT INTO rule_control_effectiveness (
            rule_code, override_rate, patch_success_rate, avg_compliance_score, 
            effectiveness_score, effectiveness_status, total_invocations, 
            user_override_count, successful_patches
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `;
        await processorClient.query(insertLedgerQuery, [
          ruleCode, metrics.overrideRate, metrics.patchSuccessRate, Number(t.averageComplianceScore || 1.0),
          metrics.score, status, Number(t.totalRuns || 0), 
          Number(t.userOverrideCount || 0), Number(t.successfulPatches || 0)
        ]);

        const updateCacheQuery = `
          UPDATE policy_library 
          SET control_effectiveness_score = $1, 
              control_effectiveness_status = $2, 
              last_effectiveness_update = NOW()
          WHERE rule_code = $3;
        `;
        await processorClient.query(updateCacheQuery, [metrics.score, status, ruleCode]);

        await processorClient.query('COMMIT;');

        if (status === "INEFFECTIVE" && previousStatus !== "INEFFECTIVE") {
          dispatchGovernanceEscalation({
            ruleCode,
            title: currentRow.title,
            score: metrics.score,
            previousStatus,
            currentStatus: status,
            totalInvocations: Number(t.totalRuns || 0),
            overrideRate: `${(metrics.overrideRate * 100).toFixed(1)}%`
          }).catch(err => logger.error("Outbound alert thread exception:", err));
        }

      } catch (transactionError) {
        await processorClient.query('ROLLBACK;');
        logger.error(`❌ Transaction failed. Rolled back effectiveness update for ${ruleCode}:`, transactionError);
      } finally {
        processorClient.release();
      }
    });

    client.on('error', (err) => {
      logger.error('⚠️ Telemetry background listener encountered network drop. Attempting reboot...', err);
      client.release();
      setTimeout(() => startEffectivenessWorker(), 5000);
    });

  } catch (error) {
    logger.error('🚨 Critical: Failed to establish background telemetry event listener hook:', error);
    client.release();
    throw error;
  }
}
