const generateTextMock = jest.fn();
const generateObjectMock = jest.fn();
const createOpenAIMock = jest.fn();
const createGoogleMock = jest.fn();
const createMistralMock = jest.fn();
const createAzureMock = jest.fn();
const createOllamaMock = jest.fn();
const poolQueryMock = jest.fn();

jest.mock('ai', () => ({
  generateText: (...args: any[]) => generateTextMock(...args),
  generateObject: (...args: any[]) => generateObjectMock(...args),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: (...args: any[]) => createOpenAIMock(...args),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: (...args: any[]) => createGoogleMock(...args),
}));

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: (...args: any[]) => createMistralMock(...args),
}));

jest.mock('@ai-sdk/azure', () => ({
  createAzure: (...args: any[]) => createAzureMock(...args),
}));

jest.mock('ollama-ai-provider-v2', () => ({
  createOllama: (...args: any[]) => createOllamaMock(...args),
}));

jest.mock('../database/connection', () => ({
  pool: {
    query: (...args: any[]) => poolQueryMock(...args),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../tracing', () => ({
  isTracingEnabled: jest.fn(() => false),
  isNativeLangfuseEnabled: jest.fn(() => false),
}));

jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    flushAsync: jest.fn(),
    trace: jest.fn(),
  })),
}));

jest.mock('../infrastructure/logger', () => ({
  asyncLocalStorage: {
    getStore: jest.fn(),
  },
}));

describe('UnifiedAIService provider factories', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    createOpenAIMock.mockImplementation(() => (model: string) => ({ provider: 'openai', model }));
    createGoogleMock.mockImplementation(() => (model: string) => ({ provider: 'google', model }));
    createMistralMock.mockImplementation(() => (model: string) => ({ provider: 'mistral', model }));
    createAzureMock.mockImplementation(() => (model: string) => ({ provider: 'azure', model }));
    createOllamaMock.mockImplementation(() => (model: string) => ({ provider: 'ollama', model }));
    generateTextMock.mockResolvedValue({
      text: 'Generated content',
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      finishReason: 'stop',
    });
  });

  it('initializes local providers without encrypted API keys', async () => {
    const { unifiedAIService } = require('../services/unifiedAIService');
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 'provider-ollama',
          name: 'Ollama',
          provider_type: 'ollama',
          api_key_encrypted: null,
          configuration: { endpoint: 'http://localhost:11434' },
          is_active: true,
          priority: 1,
        },
        {
          id: 'provider-foundry',
          name: 'Foundry Local',
          provider_type: 'foundry-local',
          api_key_encrypted: null,
          configuration: { endpoint: 'http://localhost:8080' },
          is_active: true,
          priority: 2,
        },
      ],
    });

    await unifiedAIService.initializeProviders();

    expect(createOllamaMock).toHaveBeenCalledWith({ baseURL: 'http://localhost:11434/api' });
    expect(createOpenAIMock).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'http://localhost:8080/v1',
      apiKey: 'not-required',
    }));
  });

  it('lazily initializes database providers before generation', async () => {
    const { unifiedAIService } = require('../services/unifiedAIService');
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 'provider-google',
          name: 'Google Gemini',
          provider_type: 'google',
          api_key_encrypted: Buffer.from('google-key').toString('base64'),
          configuration: { baseURL: 'https://generativelanguage.googleapis.com/v1beta', default_model: 'gemini-2.5-flash' },
          is_active: true,
          priority: 1,
        },
      ],
    });

    const response = await unifiedAIService.generate({
      provider: 'google',
      prompt: 'Write a short test.',
    });

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
    expect(createGoogleMock).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'google-key',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    }));
    expect(generateTextMock).toHaveBeenCalledWith(expect.objectContaining({
      model: { provider: 'google', model: 'gemini-2.5-flash' },
    }));
    expect(response.content).toBe('Generated content');
  });

  it('falls back from a rate-limited Mistral model to the next provider default model', async () => {
    const { unifiedAIService } = require('../services/unifiedAIService');
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 'provider-mistral',
          name: 'Mistral',
          provider_type: 'mistral',
          api_key_encrypted: Buffer.from('mistral-key').toString('base64'),
          configuration: { default_model: 'mistral-large-2411' },
          is_active: true,
          priority: 1,
          default_model: 'mistral-large-2411',
        },
        {
          id: 'provider-google',
          name: 'Google Gemini',
          provider_type: 'google',
          api_key_encrypted: Buffer.from('google-key').toString('base64'),
          configuration: { default_model: 'gemini-2.5-flash' },
          is_active: true,
          priority: 2,
          default_model: 'gemini-2.5-flash',
        },
      ],
    });
    generateTextMock
      .mockRejectedValueOnce(Object.assign(new Error('Rate limit exceeded'), { statusCode: 429 }))
      .mockResolvedValueOnce({
        text: 'Generated through fallback',
        usage: { promptTokens: 4, completionTokens: 5, totalTokens: 9 },
        finishReason: 'stop',
      });

    const response = await unifiedAIService.generate({
      provider: 'mistral',
      model: 'mistral-large-2411',
      prompt: 'Write a short test.',
    });

    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(generateTextMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: { provider: 'mistral', model: 'mistral-large-2411' },
    }));
    expect(generateTextMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: { provider: 'google', model: 'gemini-2.5-flash' },
    }));
    expect(response).toMatchObject({
      content: 'Generated through fallback',
      provider: 'Google Gemini',
      model: 'gemini-2.5-flash',
    });
  });
});
