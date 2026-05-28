import pg from 'pg';
import { calculateEffectiveness, classifyEffectiveness } from '../lib/governance/scoringEngine';
import { dispatchGovernanceEscalation } from '../lib/governance/escalationRouter';

// Pass your application's shared pg.Pool instance and connection string
export async function startEffectivenessWorker(pool: pg.Pool, connectionString: string) {
  const listenerClient = new pg.Client({ connectionString });
  
  try {
    await listenerClient.connect();
    await listenerClient.query('LISTEN telemetry_updated');
    console.log('🚀 Governance Engine: Listening for asynchronous telemetry notifications...');
  } catch (err) {
    console.error('❌ Critical: Failed to start governance background listener client:', err);
    return;
  }

  listenerClient.on('notification', async (msg) => {
    if (!msg.payload) return;
    const ruleCode = msg.payload;

    // Use shared execution pool for processing tasks to manage connection overhead
    const processorClient = await pool.connect();

    try {
      // 1. Fetch raw JSONB telemetry data safely using parameterized query
      const fetchQuery = 'SELECT title, control_effectiveness_status, telemetry_metrics FROM policy_library WHERE rule_code = $1;';
      const fetchResult = await processorClient.query(fetchQuery, [ruleCode]);
      
      if (fetchResult.rows.length === 0) return;
      
      const currentRow = fetchResult.rows[0];
      const previousStatus = currentRow.control_effectiveness_status || "INITIALIZING";
      const t = currentRow.telemetry_metrics || {};
      
      // 2. Parse out execution indicators
      const metrics = calculateEffectiveness({
        userOverrideCount: Number(t.userOverrideCount || 0),
        totalInvocations: Number(t.totalRuns || 0),
        successfulPatches: Number(t.successfulPatches || 0),
        averageComplianceScore: Number(t.averageComplianceScore || 1.0)
      });

      const status = classifyEffectiveness(metrics.score);

      // 3. Execute Atomic Parameterized SQL Transaction
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

      // 4. State Machine Evaluation: Did the control degrade to INEFFECTIVE?
      if (status === "INEFFECTIVE" && previousStatus !== "INEFFECTIVE") {
        // Fire-and-forget out of band execution loop
        dispatchGovernanceEscalation({
          ruleCode,
          title: currentRow.title,
          score: metrics.score,
          previousStatus,
          currentStatus: status,
          totalInvocations: Number(t.totalRuns || 0),
          overrideRate: `${(metrics.overrideRate * 100).toFixed(1)}%`
        }).catch(err => console.error("Outbound alert thread exception:", err));
      }

    } catch (transactionError) {
      await processorClient.query('ROLLBACK;');
      console.error(`❌ Transaction failed. Rolled back effectiveness update for ${ruleCode}:`, transactionError);
    } finally {
      processorClient.release();
    }
  });

  // Basic reconnect resiliency block
  listenerClient.on('error', (err) => {
    console.error('⚠️ Governance background listener encountered network drop. Attempting reboot...', err);
    setTimeout(() => startEffectivenessWorker(pool, connectionString), 5000);
  });
}
