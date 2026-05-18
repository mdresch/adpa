---
title: "Configure AI Providers And Ollama"
description: "Register hosted providers through the API and wire local Ollama models into ADPA’s AI workflow."
---

This guide covers the operational side of AI in ADPA: provider records for hosted APIs and a local path for Ollama-backed generation.

## Problem

You need resilient model access, but one API key or one model endpoint is not enough for production-like work. You also may want a local model path for document analysis or privacy-sensitive workflows.

## Solution

Use the `/api/ai-providers` routes for managed provider records and the `ollama.ts` helpers for local inference.

<Steps>
<Step>
### Create a hosted provider

```bash
curl -X POST http://localhost:5000/api/ai-providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "primary-google",
    "provider_type": "google",
    "api_key": "your-google-key",
    "configuration": {
      "model": "gemini-1.5-pro",
      "priority": 1
    }
  }'
```

</Step>
<Step>
### Discover and sync models

```bash
curl http://localhost:5000/api/ai-providers/<provider-id>/discover-models
```

```bash
curl -X POST http://localhost:5000/api/ai-providers/<provider-id>/sync-models \
  -H "Content-Type: application/json" \
  -d '{
    "models": ["gemini-1.5-pro", "gemini-1.5-flash"],
    "default_model": "gemini-1.5-pro"
  }'
```

</Step>
<Step>
### Verify local Ollama availability

```bash
export OLLAMA_BASE_URL=http://127.0.0.1:11434
curl "$OLLAMA_BASE_URL/api/tags"
```

</Step>
<Step>
### Use the Ollama helper in code

```ts
import {
  checkOllamaStatus,
  generateTextWithOllama,
  getRecommendedOllamaModel
} from '@/modules/ai/ollama';

const config = { baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434' };
const status = await checkOllamaStatus(config);

if (!status.available) throw new Error('Ollama is not available');

const model = getRecommendedOllamaModel('document analysis');

const result = await generateTextWithOllama({
  model,
  messages: [{ role: 'user', content: 'Summarize the change request impacts.' }]
}, config);
```

</Step>
</Steps>

## Complete Runnable Example

```ts
import { FallbackExecutor } from '@/modules/ai';
import { checkOllamaStatus, generateTextWithOllama } from '@/modules/ai/ollama';

const config = { baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434' };

export async function runWithLocalFallback(request: string) {
  const executor = new FallbackExecutor({
    getChain: async () => ({
      id: 'analysis-chain',
      taskType: 'analysis',
      entries: [
        { provider: 'openai', modelId: 'gpt-4o', priority: 1, retryAttempts: 2 },
        { provider: 'ollama', modelId: 'kimi-k2.5', priority: 2, retryAttempts: 1 }
      ]
    }),
    runner: async ({ provider, modelId }) => {
      if (provider === 'ollama') {
        const status = await checkOllamaStatus(config);
        if (!status.available) throw new Error('Local Ollama unavailable');
        const output = await generateTextWithOllama({
          model: modelId,
          messages: [{ role: 'user', content: request }]
        }, config);
        return { success: true, provider, modelId, output };
      }

      throw new Error(`Hosted runner not wired for provider ${provider}`);
    }
  });

  return executor.executeWithFallback('analysis', request);
}
```

This pattern keeps local fallback explicit. The important operational detail is that `ollama.ts` only knows how to talk to the local endpoint; it does not provision models for you.
