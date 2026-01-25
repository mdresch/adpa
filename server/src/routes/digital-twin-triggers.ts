/**
 * Digital Twin Triggers API
 * Rules: GET/POST /api/digital-twin/triggers/rules, GET/PUT/DELETE .../rules/:id
 * Document triggers: GET /api/digital-twin/triggers?projectId=... or ?assetId=...
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createTriggerRule,
  getActiveRules,
  getRulesByProject,
  getRuleById,
  updateTriggerRule,
  deleteTriggerRule,
  getDocumentTriggersByAsset,
  getDocumentTriggersByProject,
  type TriggerRuleInput,
  type TriggerType,
} from '../services/digitalTwinTriggerService';
import { logger } from '../utils/logger';

const router = Router();
const TRIGGER_TYPES = ['state_change', 'attribute_change', 'threshold_breach', 'scheduled', 'manual'] as const;

/**
 * GET /api/digital-twin/triggers?projectId=...
 * List document triggers for project.
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId ?? req.query.project_id) as string | undefined;
    const assetId = (req.query.assetId ?? req.query.asset_id) as string | undefined;
    if (assetId) {
      const triggers = await getDocumentTriggersByAsset(assetId);
      return res.json({ triggers });
    }
    if (!projectId) {
      return res.status(400).json({ error: 'projectId or assetId query is required' });
    }
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const triggers = await getDocumentTriggersByProject(projectId, limit);
    res.json({ triggers });
  } catch (e: any) {
    logger.error('Digital Twin triggers list failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list triggers' });
  }
});

/**
 * GET /api/digital-twin/triggers/rules?projectId=...&activeOnly=false
 */
router.get('/rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId ?? req.query.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId query is required' });
    }
    const activeOnly = req.query.activeOnly === 'true';
    const rules = activeOnly ? await getActiveRules(projectId) : await getRulesByProject(projectId);
    res.json({ rules });
  } catch (e: any) {
    logger.error('Digital Twin rules list failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list rules' });
  }
});

/**
 * POST /api/digital-twin/triggers/rules
 * Body: { projectId, name, description?, rule_config, trigger_type, template_id?, generation_params?, is_active? }
 */
router.post('/rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.body?.projectId ?? req.body?.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const { name, description, rule_config, trigger_type, template_id, generation_params, is_active } = req.body ?? {};
    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'name and trigger_type are required' });
    }
    if (!TRIGGER_TYPES.includes(trigger_type as TriggerType)) {
      return res.status(400).json({ error: `trigger_type must be one of: ${TRIGGER_TYPES.join(', ')}` });
    }
    const input: TriggerRuleInput = {
      name,
      description: description ?? null,
      rule_config: rule_config && typeof rule_config === 'object' ? rule_config : {},
      trigger_type,
      template_id: template_id ?? null,
      generation_params: generation_params && typeof generation_params === 'object' ? generation_params : {},
      is_active,
    };
    const rule = await createTriggerRule(projectId, input);
    res.status(201).json({ rule });
  } catch (e: any) {
    logger.error('Digital Twin rule create failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * GET /api/digital-twin/triggers/rules/:id
 */
router.get('/rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rule = await getRuleById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  } catch (e: any) {
    logger.error('Digital Twin rule get failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

/**
 * PUT /api/digital-twin/triggers/rules/:id
 */
router.put('/rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updates = req.body ?? {};
    const rule = await updateTriggerRule(req.params.id, updates);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  } catch (e: any) {
    logger.error('Digital Twin rule update failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/digital-twin/triggers/rules/:id
 */
router.delete('/rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const ok = await deleteTriggerRule(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Rule not found' });
    res.status(204).send();
  } catch (e: any) {
    logger.error('Digital Twin rule delete failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

export default router;
