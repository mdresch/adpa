import { FallbackExecutor } from '../FallbackExecutor';
import { AIModelService } from '../AIModelService';
import { getTestUser, mockProviders, mockModels, mockChains } from './testUtils';

// Mocks and helpers would be implemented in testUtils or inline as needed

describe('AI Fallback Chain - End-to-End', () => {
  let fallbackExecutor: FallbackExecutor;
  let aiModelService: AIModelService;
  let user: any;

  beforeAll(async () => {
    // Setup test user, providers, models, and fallback chains
    user = await getTestUser();
    await mockProviders();
    await mockModels();
    await mockChains();
    fallbackExecutor = new FallbackExecutor();
    aiModelService = new AIModelService();
  });

  it('should fallback to Ollama if primary provider fails', async () => {
    // Simulate OpenAI failure, ensure Ollama is used
    const taskType = 'document-extraction';
    const request = { text: 'Extract this document.' };
    const options = { userId: user.id };
    // Simulate OpenAI down
    aiModelService.simulateProviderFailure('openai');
    const response = await fallbackExecutor.executeWithFallback(taskType, request, options);
    expect(response.provider).toBe('ollama');
    expect(response.success).toBe(true);
  });

  it('should log cost for each model used', async () => {
    // Run a fallback chain and check audit logs for cost entries
    const taskType = 'chat';
    const request = { message: 'Hello!' };
    const options = { userId: user.id };
    await fallbackExecutor.executeWithFallback(taskType, request, options);
    // Fetch audit logs (mocked)
    const logs = await aiModelService.getAuditLogs({ userId: user.id });
    expect(logs.some(log => log.cost > 0)).toBe(true);
  });

  it('should benchmark Ollama vs cloud provider latency', async () => {
    // Run both providers and compare latency
    const taskType = 'chat';
    const request = { message: 'Benchmark test' };
    const options = { userId: user.id };
    const cloudStart = Date.now();
    await aiModelService.useProvider('openai', request, options);
    const cloudLatency = Date.now() - cloudStart;
    const ollamaStart = Date.now();
    await aiModelService.useProvider('ollama', request, options);
    const ollamaLatency = Date.now() - ollamaStart;
    expect(typeof cloudLatency).toBe('number');
    expect(typeof ollamaLatency).toBe('number');
    // Optionally log or assert on latency difference
  });

  it('should succeed on full extraction job even if primary is down', async () => {
    // Simulate full extraction with primary down
    aiModelService.simulateProviderFailure('openai');
    const taskType = 'document-extraction';
    const request = { text: 'Full document content.' };
    const options = { userId: user.id };
    const response = await fallbackExecutor.executeWithFallback(taskType, request, options);
    expect(response.success).toBe(true);
    expect(response.provider).toBe('ollama');
  });
});
