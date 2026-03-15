/**
 * Digital Twin Trigger Service
 * Trigger rules CRUD, evaluate rules, create document triggers.
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md
 */

import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

const TRIGGER_TYPES = [
  'state_change',
  'attribute_change',
  'threshold_breach',
  'scheduled',
  'manual',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export interface DigitalTwinTriggerRule {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  rule_config: Record<string, unknown>;
  trigger_type: string;
  template_id: string | null;
  generation_params: Record<string, unknown>;
  is_active: boolean;
  trigger_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DigitalTwinDocumentTrigger {
  id: string;
  asset_id: string;
  event_id: string | null;
  trigger_rule: Record<string, unknown>;
  trigger_type: TriggerType;
  template_id: string | null;
  document_id: string | null;
  generation_params: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  status_message: string | null;
  job_id: string | null;
  retry_count: number;
  max_retries: number;
  triggered_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerRuleInput {
  name: string;
  description?: string | null;
  rule_config: Record<string, unknown>;
  trigger_type: string;
  template_id?: string | null;
  generation_params?: Record<string, unknown>;
  is_active?: boolean;
}

const pool = () => getDatabasePool();

function parseRule(row: any): DigitalTwinTriggerRule {
  const r = row as DigitalTwinTriggerRule;
  if (typeof r.rule_config === 'string') {
    try {
      (r as any).rule_config = JSON.parse(r.rule_config);
    } catch {
      (r as any).rule_config = {};
    }
  }
  if (typeof r.generation_params === 'string') {
    try {
      (r as any).generation_params = JSON.parse(r.generation_params);
    } catch {
      (r as any).generation_params = {};
    }
  }
  return r;
}

function parseDocTrigger(row: any): DigitalTwinDocumentTrigger {
  const t = row as DigitalTwinDocumentTrigger;
  if (typeof t.trigger_rule === 'string') {
    try {
      (t as any).trigger_rule = JSON.parse(t.trigger_rule);
    } catch {
      (t as any).trigger_rule = {};
    }
  }
  if (typeof t.generation_params === 'string') {
    try {
      (t as any).generation_params = JSON.parse(t.generation_params);
    } catch {
      (t as any).generation_params = {};
    }
  }
  return t;
}

export async function createTriggerRule(
  projectId: string,
  input: TriggerRuleInput
): Promise<DigitalTwinTriggerRule> {
  const res = await pool().query(
    `INSERT INTO digital_twin_trigger_rules (
       project_id, name, description, rule_config, trigger_type,
       template_id, generation_params, is_active
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8)
     RETURNING *`,
    [
      projectId,
      input.name,
      input.description ?? null,
      JSON.stringify(input.rule_config ?? {}),
      input.trigger_type,
      input.template_id ?? null,
      JSON.stringify(input.generation_params ?? {}),
      input.is_active !== false,
    ]
  );
  const row = res.rows[0];
  logger.info({ ruleId: row.id, projectId, name: row.name }, 'Digital Twin trigger rule created');
  return parseRule(row);
}

export async function getActiveRules(projectId: string): Promise<DigitalTwinTriggerRule[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_trigger_rules
     WHERE project_id = $1 AND is_active = true
     ORDER BY name`,
    [projectId]
  );
  return res.rows.map(parseRule);
}

export async function getRulesByProject(projectId: string): Promise<DigitalTwinTriggerRule[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_trigger_rules
     WHERE project_id = $1
     ORDER BY name`,
    [projectId]
  );
  return res.rows.map(parseRule);
}

export async function getRuleById(ruleId: string): Promise<DigitalTwinTriggerRule | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_trigger_rules WHERE id = $1`,
    [ruleId]
  );
  if (res.rows.length === 0) return null;
  return parseRule(res.rows[0]);
}

export async function updateTriggerRule(
  ruleId: string,
  updates: Partial<TriggerRuleInput>
): Promise<DigitalTwinTriggerRule | null> {
  const allowed = ['name', 'description', 'rule_config', 'trigger_type', 'template_id', 'generation_params', 'is_active'];
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.includes(k)) continue;
    if (k === 'rule_config' || k === 'generation_params') {
      set.push(`${k} = $${i}`);
      vals.push(v != null ? JSON.stringify(v) : '{}');
    } else if (k === 'is_active') {
      set.push(`${k} = $${i}`);
      vals.push(!!v);
    } else {
      set.push(`${k} = $${i}`);
      vals.push(v ?? null);
    }
    i++;
  }
  if (set.length === 0) return getRuleById(ruleId);
  set.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(ruleId);
  const res = await pool().query(
    `UPDATE digital_twin_trigger_rules SET ${set.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (res.rows.length === 0) return null;
  return parseRule(res.rows[0]);
}

export async function deleteTriggerRule(ruleId: string): Promise<boolean> {
  const res = await pool().query(
    `DELETE FROM digital_twin_trigger_rules WHERE id = $1`,
    [ruleId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Create document triggers when rules match. Only creates triggers for rules
 * whose trigger_type matches eventType (e.g. state_change -> state_change).
 */
export async function evaluateTriggerRules(
  assetId: string,
  stateId: string,
  eventId: string | null,
  eventType?: string
): Promise<DigitalTwinDocumentTrigger[]> {
  const assetRes = await pool().query(
    `SELECT project_id FROM digital_twin_assets WHERE id = $1`,
    [assetId]
  );
  if (assetRes.rows.length === 0) return [];
  const projectId = assetRes.rows[0].project_id;

  const rules = await getActiveRules(projectId);
  const created: DigitalTwinDocumentTrigger[] = [];

  for (const rule of rules) {
    const triggerType = rule.trigger_type as TriggerType;
    if (!TRIGGER_TYPES.includes(triggerType)) continue;
    if (eventType != null && rule.trigger_type !== eventType) continue;

    const ins = await pool().query(
      `INSERT INTO digital_twin_document_triggers (
         asset_id, event_id, trigger_rule, trigger_type,
         template_id, generation_params, status
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, 'pending')
       RETURNING *`,
      [
        assetId,
        eventId,
        JSON.stringify(rule.rule_config),
        rule.trigger_type,
        rule.template_id,
        JSON.stringify(rule.generation_params ?? {}),
      ]
    );
    const tr = parseDocTrigger(ins.rows[0]);
    created.push(tr);

    await pool().query(
      `UPDATE digital_twin_trigger_rules SET trigger_count = trigger_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [rule.id]
    );

    // Queue trigger for processing
    try {
      const { digitalTwinTriggerQueue } = await import('../services/queueService');
      await digitalTwinTriggerQueue.add('process-trigger', { triggerId: tr.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      });
      logger.debug({ triggerId: tr.id }, 'Digital Twin document trigger queued for processing');
    } catch (error: any) {
      logger.error({ triggerId: tr.id, error: error.message }, 'Failed to queue trigger for processing');
      // Don't throw - trigger is still created, just not queued
    }
  }

  return created;
}

export async function getDocumentTriggersByAsset(assetId: string, limit = 50): Promise<DigitalTwinDocumentTrigger[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_document_triggers
     WHERE asset_id = $1
     ORDER BY triggered_at DESC
     LIMIT $2`,
    [assetId, limit]
  );
  return res.rows.map(parseDocTrigger);
}

export async function getDocumentTriggersByProject(projectId: string, limit = 100): Promise<DigitalTwinDocumentTrigger[]> {
  const res = await pool().query(
    `SELECT t.* FROM digital_twin_document_triggers t
     JOIN digital_twin_assets a ON a.id = t.asset_id
     WHERE a.project_id = $1
     ORDER BY t.triggered_at DESC
     LIMIT $2`,
    [projectId, limit]
  );
  return res.rows.map(parseDocTrigger);
}

export async function getPendingTriggers(limit = 50): Promise<DigitalTwinDocumentTrigger[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_document_triggers
     WHERE status = 'pending'
     ORDER BY triggered_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows.map(parseDocTrigger);
}

export async function getTriggerById(triggerId: string): Promise<DigitalTwinDocumentTrigger | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_document_triggers WHERE id = $1`,
    [triggerId]
  );
  if (res.rows.length === 0) return null;
  return parseDocTrigger(res.rows[0]);
}

/**
 * Process document trigger: generate document from template using asset state.
 */
export async function processDocumentTrigger(triggerId: string): Promise<{ id: string; name: string }> {
  const trigger = await getTriggerById(triggerId);
  if (!trigger) {
    throw new Error(`Document trigger not found: ${triggerId}`);
  }

  if (trigger.status === 'completed') {
    if (trigger.document_id) {
      const docRes = await pool().query('SELECT id, name FROM documents WHERE id = $1', [trigger.document_id]);
      if (docRes.rows.length > 0) {
        return { id: docRes.rows[0].id, name: docRes.rows[0].name };
      }
    }
    throw new Error('Trigger already completed but document not found');
  }

  if (trigger.status === 'processing') {
    throw new Error('Trigger is already being processed');
  }

  if (!trigger.template_id) {
    throw new Error('Trigger has no template_id');
  }

  // Update status to processing
  await pool().query(
    `UPDATE digital_twin_document_triggers
     SET status = 'processing', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [triggerId]
  );

  try {
    // Get asset and current state
    const assetRes = await pool().query(
      `SELECT a.*, s.state_snapshot, s.state_version
       FROM digital_twin_assets a
       LEFT JOIN digital_twin_asset_states s ON s.id = a.current_state_id
       WHERE a.id = $1`,
      [trigger.asset_id]
    );
    if (assetRes.rows.length === 0) {
      throw new Error(`Asset not found: ${trigger.asset_id}`);
    }
    const asset = assetRes.rows[0];
    const stateSnapshot = asset.state_snapshot || {};

    // Get template
    const templateRes = await pool().query('SELECT * FROM templates WHERE id = $1', [trigger.template_id]);
    if (templateRes.rows.length === 0) {
      throw new Error(`Template not found: ${trigger.template_id}`);
    }
    const template = templateRes.rows[0];

    // Generate document using existing document generation service
    const { documentGenerationService } = await import('./documentGenerationService');

    // Build generation context from asset and state
    const generationParams = trigger.generation_params || {};
    const prompt = generationParams.prompt as string || 
      `Generate a ${template.name} document for Digital Twin asset "${asset.name}" (${asset.asset_type || 'asset'}) based on current state.

Asset Details:
- Name: ${asset.name}
- Type: ${asset.asset_type || 'N/A'}
- Platform: ${asset.platform_type}
- State Version: ${asset.state_version || 0}

Current State:
${JSON.stringify(stateSnapshot, null, 2)}

Generate a comprehensive document that reflects the current state of this Digital Twin asset.`;

    // Use document generation service to generate content
    const generationParams_config = generationParams as any;
    const aiResponse = await documentGenerationService.generateDocument({
      projectId: asset.project_id,
      templateId: trigger.template_id,
      userId: 'system', // System-generated
      userPrompt: prompt,
      provider: generationParams_config.provider || 'Groq AI',
      model: generationParams_config.model,
      temperature: generationParams_config.temperature || 0.7,
    });

    // Create document in database directly (we're in backend service)
    const docName = `${asset.name} - ${template.name} (Triggered)`;
    const docRes = await pool().query(
      `INSERT INTO documents (
         project_id, name, content, template_id, status, created_by, updated_by
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
       RETURNING id, name`,
      [
        asset.project_id,
        docName,
        JSON.stringify({ type: 'markdown', content: aiResponse.content }),
        trigger.template_id,
        'draft',
        'system',
        'system',
      ]
    );

    const document = docRes.rows[0];

    // Update trigger with document ID and mark as completed
    await pool().query(
      `UPDATE digital_twin_document_triggers
       SET document_id = $1, status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [document.id, triggerId]
    );

    logger.info({
      triggerId,
      documentId: document.id,
      assetId: trigger.asset_id,
    }, 'Digital Twin document trigger processed');

    return { id: document.id, name: document.name };
  } catch (error: any) {
    const msg = error?.message || String(error);
    await pool().query(
      `UPDATE digital_twin_document_triggers
       SET status = 'failed', status_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [triggerId, msg]
    );
    logger.error({ triggerId, error: msg }, 'Digital Twin document trigger processing failed');
    throw error;
  }
}
