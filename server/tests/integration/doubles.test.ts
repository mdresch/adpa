import { aiProviderService } from '../../src/services/aiProviderService';
import { queueService } from '../../src/services/queueService';
import { mockAIProvider, mockQueues } from '../setup/integration-setup';

describe('Test Doubles Verification', () => {
  it('should use MockAIProvider instead of real providers', async () => {
    mockAIProvider.reset();
    
    const response = await aiProviderService.generate({
      prompt: 'Hello world',
    }, 'openai');
    
    expect(response.content).toContain('[MOCK AI RESPONSE]');
    expect(mockAIProvider.callCount).toBe(1);
    expect(mockAIProvider.lastRequest?.prompt).toBe('Hello world');
  });

  it('should use MockQueue and process jobs synchronously', async () => {
    const queueName = 'ai-processing';
    const mockQueue = mockQueues.get(queueName) as any;
    expect(mockQueue).toBeDefined();
    
    mockQueue.reset();
    
    let processed = false;
    mockQueue.process('test-job', 1, async (job: any) => {
      processed = true;
      return { success: true };
    });

    await queueService.addJob('ai-generate' as any, { foo: 'bar', jobId: 'test-job-1' } as any);
    
    // In MockQueue, if isSync is true, it runs the handler immediately (via .then)
    // We might need a small delay or await the event if it was async
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(processed).toBe(true);
    expect(mockQueue.jobs.length).toBe(1);
    expect(mockQueue.jobs[0].data.foo).toBe('bar');
  });

  it('should simulate AI failure correctly', async () => {
    mockAIProvider.reset();
    mockAIProvider.shouldFail = true;
    
    await expect(aiProviderService.generate({
      prompt: 'Will fail',
    }, 'openai')).rejects.toThrow('Simulated AI Provider Timeout/Error');
  });
});
