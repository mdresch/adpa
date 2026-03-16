import { mockDeep } from "jest-mock-extended"
import { OpenAIConnector } from "../../modules/ai/openai"
import { FallbackExecutor } from "../../modules/ai/FallbackExecutor"

/**
 * Mock OpenAI Connector
 */
export const createMockOpenAIConnector = () => {
  const mock = mockDeep<OpenAIConnector>()
  mock.generateCompletion.mockResolvedValue({
    id: "mock-openai-id",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "MOCK_OPENAI_RESPONSE" },
        finish_reason: "stop"
      }
    ],
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
    provider: "openai"
  })
  return mock
}

/**
 * Mock Google Connector
 */
export const createMockGoogleConnector = () => {
  const mock = mockDeep<any>()
  mock.generateCompletion.mockResolvedValue({
    id: "mock-google-id",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gemini-pro",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "MOCK_GOOGLE_RESPONSE" },
        finish_reason: "stop"
      }
    ],
    usage: { prompt_tokens: 12, completion_tokens: 18, total_tokens: 30 },
    provider: "google"
  })
  return mock
}

/**
 * Mock Ollama Connector
 */
export const createMockOllamaConnector = () => {
  const mock = mockDeep<any>()
  mock.generateText.mockResolvedValue({
    model: "llama3.2",
    created_at: new Date().toISOString(),
    message: { role: "assistant", content: "MOCK_OLLAMA_RESPONSE" },
    done: true
  })
  return mock
}

/**
 * Mock Fallback Executor
 */
export const createMockFallbackExecutor = () => {
  const mock = mockDeep<FallbackExecutor>()
  mock.executeWithFallback.mockResolvedValue({
    success: true,
    provider: "mock-provider",
    modelId: "mock-model",
    output: "MOCK_FALLBACK_RESPONSE",
    latencyMs: 100,
    attempts: 1,
    usage: { inputTokens: 10, outputTokens: 15 }
  })
  return mock
}
