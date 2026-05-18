---
title: "AI Module"
description: "Reference for the ADPA AI connectors, fallback executor, and provider-management API surface."
---

Import path: `@/modules/ai`  
Primary source files: `server/src/modules/ai/index.ts`, `openai.ts`, `google.ts`, `ollama.ts`, `FallbackExecutor.ts`, `server/src/routes/ai-providers.ts`

This page covers the exported AI building blocks.

## `OpenAIConnector`

Singleton export:

```ts
export const openaiConnector = new OpenAIConnector();
```

### Public methods

```ts
async initializeProviders(): Promise<void>
async generateCompletion(request: OpenAIRequest, preferredProvider?: string): Promise<OpenAIResponse>
async getAvailableModels(preferredProvider?: string): Promise<any[]>
async testConnection(providerName: string): Promise<boolean>
```

## `GoogleConnector`

Singleton export:

```ts
export const googleConnector = new GoogleConnector();
```

### Public methods

```ts
async initializeProviders(): Promise<void>
async addProvider(provider: GoogleProvider): Promise<void>
async generateCompletion(request: GoogleRequest, preferredProvider?: string): Promise<GoogleResponse>
async getAvailableModels(providerName?: string): Promise<any[]>
async testConnection(providerName: string): Promise<boolean>
```

## `ollamaConnector`

Exported object:

```ts
export const ollamaConnector = {
  generateText: generateTextWithOllama,
  streamText: streamTextWithOllama,
  checkStatus: checkOllamaStatus,
  getRecommendedModel: getRecommendedOllamaModel,
  models: OLLAMA_MODELS,
};
```

### Exported functions

```ts
export async function generateTextWithOllama(
  request: OllamaRequest,
  config: OllamaConfig
): Promise<OllamaResponse>

export async function* streamTextWithOllama(
  request: OllamaRequest,
  config: OllamaConfig
): AsyncGenerator<string, void, unknown>

export async function checkOllamaStatus(
  config: OllamaConfig
): Promise<{ available: boolean; models: string[] }>

export function getRecommendedOllamaModel(task: string): OllamaModelId
```

## `FallbackExecutor`

```ts
class FallbackExecutor {
  constructor(options: FallbackExecutorOptions)
  async executeWithFallback(taskType: string, request: unknown): Promise<FallbackRunResult>
}
```

### `FallbackExecutorOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `getChain` | `(taskType: string) => Promise<FallbackChain \| null>` | — | Returns the provider/model chain for the task. |
| `runner` | `FallbackRunner` | — | Executes one attempt for one chain entry. |
| `auditLogger` | `FallbackAuditLogger` | — | Optional audit sink for attempt data. |
| `defaultTimeoutMs` | `number` | `30000` | Timeout per attempt when the entry does not override it. |

## Provider Management Routes

```text
GET  /api/ai-providers
POST /api/ai-providers
POST /api/ai-providers/:id/toggle
GET  /api/ai-providers/:id/discover-models
POST /api/ai-providers/:id/sync-models
POST /api/ai-providers/:name/configure
```

These same routes are also mounted under `/api/ai` in `server/src/server.ts`.

## Example

```ts
import { openaiConnector, googleConnector, FallbackExecutor } from '@/modules/ai';

await openaiConnector.initializeProviders();
await googleConnector.initializeProviders();

const executor = new FallbackExecutor({
  getChain: async () => ({
    id: 'general',
    taskType: 'general',
    entries: [
      { provider: 'openai', modelId: 'gpt-4o', priority: 1, retryAttempts: 2 },
      { provider: 'google', modelId: 'gemini-1.5-pro', priority: 2, retryAttempts: 1 }
    ]
  }),
  runner: async ({ provider, modelId, request }) => ({
    success: true,
    provider,
    modelId,
    output: request
  })
});
```

Use the connectors directly when you want provider-specific capabilities. Use `FallbackExecutor` when you want a uniform retry-and-fallback abstraction across providers.
