import { Request, Response, Router } from 'express';
import { ModelRepository } from './ModelRepository';

const router = Router();

// List all models
router.get('/models', async (req: Request, res: Response) => {
  const models = await ModelRepository.findAllModels();
  res.json(models);
});

// Get model by ID
router.get('/models/:id', async (req: Request, res: Response) => {
  const model = await ModelRepository.findModelById(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
});

// Create new model
router.post('/models', async (req: Request, res: Response) => {
  try {
    const model = await ModelRepository.createModel(req.body);
    res.status(201).json(model);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update model
router.put('/models/:id', async (req: Request, res: Response) => {
  try {
    const model = await ModelRepository.updateModel(req.params.id, req.body);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Deactivate model
router.delete('/models/:id', async (req: Request, res: Response) => {
  try {
    const model = await ModelRepository.updateModel(req.params.id, { is_active: false });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Fallback Chains
router.get('/fallback-chains', async (req: Request, res: Response) => {
  const chains = await ModelRepository.findAllChains();
  res.json(chains);
});

router.get('/fallback-chains/:id', async (req: Request, res: Response) => {
  const chain = await ModelRepository.findChainById(req.params.id);
  if (!chain) return res.status(404).json({ error: 'Chain not found' });
  res.json(chain);
});

router.post('/fallback-chains', async (req: Request, res: Response) => {
  try {
    const chain = await ModelRepository.createChain(req.body);
    res.status(201).json(chain);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/fallback-chains/:id', async (req: Request, res: Response) => {
  try {
    const chain = await ModelRepository.updateChain(req.params.id, req.body);
    if (!chain) return res.status(404).json({ error: 'Chain not found' });
    res.json(chain);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Fallback Chain Entries
router.get('/fallback-chains/:id/entries', async (req: Request, res: Response) => {
  const entries = await ModelRepository.findEntriesByChain(req.params.id);
  res.json(entries);
});

router.post('/fallback-chains/:id/entries', async (req: Request, res: Response) => {
  try {
    const entry = await ModelRepository.createEntry({ ...req.body, chain_id: req.params.id });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/fallback-chain-entries/:entryId', async (req: Request, res: Response) => {
  try {
    const entry = await ModelRepository.updateEntry(req.params.entryId, req.body);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
