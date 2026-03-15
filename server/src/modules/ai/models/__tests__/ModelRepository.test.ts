import { ModelRepository } from './ModelRepository';

describe('ModelRepository', () => {
  it('should create, find, and update a model', async () => {
    // Insert a dummy provider first (required foreign key)
    const provider = await db.query(
      `INSERT INTO ai_providers (id, name, is_active) VALUES (gen_random_uuid(), 'TestProvider', true) RETURNING *`
    );
    const provider_id = provider[0].id;

    // Create model
    const model = await ModelRepository.createModel({
      provider_id,
      name: 'test-model',
      display_name: 'Test Model',
      is_active: true,
      is_default: false,
      priority: 1
    });
    expect(model).toBeDefined();
    expect(model.name).toBe('test-model');

    // Find all
    const all = await ModelRepository.findAllModels();
    expect(all.some(m => m.id === model.id)).toBe(true);

    // Update
    const updated = await ModelRepository.updateModel(model.id, { display_name: 'Updated Model' });
    expect(updated?.display_name).toBe('Updated Model');
  });

  it('should create and find fallback chains', async () => {
    const chain = await ModelRepository.createChain({
      name: 'test-chain',
      task_type: 'chat',
      is_active: true
    });
    expect(chain).toBeDefined();
    expect(chain.name).toBe('test-chain');

    const found = await ModelRepository.findChainById(chain.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(chain.id);
  });
});
