/**
 * Digital Twin Assets API
 * GET/POST /api/digital-twin/assets, GET/PUT/DELETE /api/digital-twin/assets/:id,
 * GET /api/digital-twin/assets/:id/current-state, GET /api/digital-twin/assets/:id/history
 * POST /api/digital-twin/assets/import - import from extracted_dt_assets (source_document_id traceability)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import {
  getAssetsByProject,
  getAssetById,
  registerAsset,
  updateAsset,
  deleteAsset,
  getCurrentState,
  getStateHistory,
  DigitalTwinAssetInput,
  PlatformType,
} from '../services/digitalTwinAssetService';
import {
  importDTAssetsFromDocument,
  importDTAssetsFromProjectEntities,
} from '../services/dtAssetImportService';
import { logger } from '../utils/logger';

const router = Router();
const PLATFORMS: PlatformType[] = ['iTwin', 'AzureDT', 'Generic'];

function parseProjectId(req: Request): string | null {
  const q = req.query.projectId ?? req.query.project_id;
  return typeof q === 'string' ? q : null;
}

/**
 * GET /api/digital-twin/assets?projectId=...
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) {
      return res.status(400).json({ error: 'projectId (or project_id) query is required' });
    }
    const assets = await getAssetsByProject(projectId);
    res.json({ assets });
  } catch (e: any) {
    logger.error('Digital Twin assets list failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

/**
 * POST /api/digital-twin/assets
 * Body: { projectId, ...DigitalTwinAssetInput }
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.body?.projectId ?? req.body?.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId (or project_id) is required' });
    }
    const { name, external_id, platform_type, platform_instance_url, description, asset_type, location, company_id, metadata } = req.body;
    if (!name || !external_id || !platform_type) {
      return res.status(400).json({ error: 'name, external_id, and platform_type are required' });
    }
    if (!PLATFORMS.includes(platform_type)) {
      return res.status(400).json({ error: `platform_type must be one of: ${PLATFORMS.join(', ')}` });
    }
    const input: DigitalTwinAssetInput = {
      name,
      external_id,
      platform_type,
      platform_instance_url: platform_instance_url ?? null,
      description: description ?? null,
      asset_type: asset_type ?? null,
      location: location ?? null,
      company_id: company_id ?? null,
      metadata: metadata ?? {},
    };
    const asset = await registerAsset(projectId, input);
    res.status(201).json({ asset });
  } catch (e: any) {
    logger.error('Digital Twin asset create failed', { error: e?.message });
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Asset with same external_id/platform_type/platform_instance_url already exists' });
    }
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

/**
 * POST /api/digital-twin/assets/import
 * Import DT assets from extracted_dt_assets (entities) into the Digital Twin Assets Register.
 * Same pattern as WBS import: entities → project_tasks. Each created asset has
 * source_document_id and source_entity_id for traceability.
 * Body: { projectId, documentId?, useProjectEntities?: boolean, options?: { overwriteExisting } }
 */
router.post('/import', authenticateToken, requirePermission('projects.manage'), async (req: Request, res: Response) => {
  try {
    const projectId = (req.body?.projectId ?? req.body?.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId (or project_id) is required' });
    }
    const userId = (req as any).user?.id as string;
    const documentId = req.body?.documentId as string | undefined;
    const useProjectEntities = !!req.body?.useProjectEntities;
    const options = req.body?.options ?? {};

    if (documentId && !useProjectEntities) {
      const result = await importDTAssetsFromDocument(projectId, documentId, userId, options);
      return res.status(201).json({
        success: true,
        data: result,
        message: `Imported ${result.assetsCreated} created, ${result.assetsUpdated} updated`,
      });
    }
    const result = await importDTAssetsFromProjectEntities(projectId, userId, options);
    return res.status(201).json({
      success: true,
      data: result,
      message: `Imported ${result.assetsCreated} created, ${result.assetsUpdated} updated`,
    });
  } catch (e: any) {
    logger.error('DT asset import failed', { error: e?.message });
    return res.status(500).json({ error: e?.message ?? 'Failed to import DT assets' });
  }
});

/**
 * PUT /api/digital-twin/assets/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updates = req.body ?? {};
    const asset = await updateAsset(req.params.id, updates);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset });
  } catch (e: any) {
    logger.error('Digital Twin asset update failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

/**
 * DELETE /api/digital-twin/assets/:id (soft delete)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const ok = await deleteAsset(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Asset not found' });
    res.status(204).send();
  } catch (e: any) {
    logger.error('Digital Twin asset delete failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

/**
 * GET /api/digital-twin/assets/:id/current-state
 * Returns 200 with { state: null } when the asset has no current state (e.g. layout-only assets).
 */
router.get('/:id/current-state', authenticateToken, async (req: Request, res: Response) => {
  try {
    const state = await getCurrentState(req.params.id);
    res.json({ state: state ?? null });
  } catch (e: any) {
    logger.error('Digital Twin current-state failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get current state' });
  }
});

/**
 * GET /api/digital-twin/assets/:id/history?limit=50
 */
router.get('/:id/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const states = await getStateHistory(req.params.id, limit);
    res.json({ states });
  } catch (e: any) {
    logger.error('Digital Twin state history failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get state history' });
  }
});

/**
 * GET /api/digital-twin/assets/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const asset = await getAssetById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset });
  } catch (e: any) {
    logger.error('Digital Twin asset get failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

export default router;
