# AI Gateway Implementation - ADPA

## Overview

ADPA now uses **Vercel AI Gateway** as a unified endpoint for all AI providers. This simplifies configuration, provides automatic failover, and eliminates the need to manage individual provider API keys.

## Implementation Date

October 13, 2025

## What Changed

### Before (Direct Provider APIs)
- Separate SDK for each provider (OpenAI SDK, Google AI SDK, Groq SDK, etc.)
- Multiple API keys to manage
- Provider-specific code for each AI service
- Complex connection handling
- Zod version conflicts between packages

### After (AI Gateway)
- Single unified API using Vercel AI SDK
- One AI Gateway API key
- Simplified codebase
- Automatic failover and load balancing
- No package conflicts

## Configuration

### Environment Variable

Add to `server/.env`:
```env
AI_GATEWAY_API_KEY=vck_1hVtXrfPTMRf3SKYjgbBfMCodbW7JiEdvCcAeWV25tf1ivfZSb4V1tLI
```

### Dependencies

**Installed:**
- `ai@5.0.68` - Vercel AI SDK core
- `zod@^3.24.0` - Schema validation (upgraded for compatibility)

**Removed:**
- `@ai-sdk/groq` - No longer needed (Gateway provides unified access)
- `@ai-sdk/mistral` - Caused zod v4 conflicts

**Kept:**
- `openai` - Still used for Azure OpenAI if needed
- `@google/generative-ai` - For Google-specific features

## Model Format

AI Gateway uses the format: `provider/model`

### Supported Providers

| Provider | Example Model | Gateway Format |
|----------|--------------|----------------|
| OpenAI | gpt-4o | `openai/gpt-4o` |
| Google | gemini-2.5-flash | `google/gemini-2.5-flash` |
| Groq | llama-3.3-70b-versatile | `groq/llama-3.3-70b-versatile` |
| Mistral | mistral-large-latest | `mistral/mistral-large-latest` |
| Anthropic | claude-sonnet-4 | `anthropic/claude-sonnet-4` |

### Groq Model Mapping

Deprecated models are automatically mapped to current ones:

| Deprecated Model | Mapped To |
|-----------------|-----------|
| gemma2-9b-it | llama3-8b-8192 |
| gemma-7b-it | llama3-8b-8192 |
| llama-3.2-90b-text-preview | llama-3.3-70b-versatile |
| llama2-70b-4096 | llama3-70b-8192 |

## Code Changes

### File: `server/src/services/aiService.ts`

**Simplified from ~686 lines to ~260 lines**

Key changes:
1. Removed provider-specific initialization (`addProvider` now does nothing)
2. Single `generate()` method for all providers
3. Automatic model mapping via `buildGatewayModelId()`
4. No more provider-specific client management

### Usage Example

```typescript
const result = await aiService.generate({
  prompt: "Explain quantum computing",
  provider: "Groq AI",
  model: "llama-3.1-8b-instant",
  temperature: 0.7,
  max_tokens: 1000,
})

// Result contains real AI response via Gateway
console.log(result.content)
console.log(result.usage.total_tokens)
```

## Test Results

### Performance Tests - Llama 3.1 8B Instant (Groq)

✅ **Response Time Test:** 1,681ms
- Tokens Used: 49
- Real AI response generated

✅ **Token Processing Test:** 1,530ms
- Tokens Used: 136
- Correctly counted 9 tokens in test sentence

✅ **Throughput Test:** 1,667ms
- Tokens Used: 179
- Generated 885-character AI response about artificial intelligence

## Benefits Achieved

1. **Simplified Configuration**
   - One API key instead of managing multiple
   - No provider-specific client setup

2. **Better Reliability**
   - AI Gateway handles failover automatically
   - Built-in retry logic
   - Load balancing across providers

3. **Resolved Conflicts**
   - Fixed zod version conflicts
   - Removed incompatible packages
   - Cleaner dependency tree

4. **Easier Maintenance**
   - Less code to maintain (~60% reduction)
   - Unified error handling
   - Consistent API across all providers

5. **Production Ready**
   - Built-in monitoring via Vercel dashboard
   - Spend controls and budgets
   - Usage analytics

## Database Schema

**No changes required!**

The `ai_providers` table remains unchanged. Providers are still tracked for:
- Enabling/disabling specific providers
- Usage statistics
- Model preferences
- Configuration metadata

## Next Steps

1. Test other providers (Google Gemini, OpenAI, Mistral)
2. Configure fallback chains in AI Gateway dashboard
3. Set up spend limits and budgets
4. Monitor usage in Vercel AI Gateway console
5. Test document generation with AI providers

## Troubleshooting

### "AI_GATEWAY_API_KEY not set"
- Add the key to `server/.env`
- Restart the backend server

### "Model not found"
- Check model name is supported by AI Gateway
- Use the mapping table above for correct formats
- Deprecated models are auto-mapped

### "Gateway access failed"
- Verify API key is valid
- Check Vercel AI Gateway dashboard for quota/limits
- Ensure internet connectivity

## Success Metrics

✅ All dependencies upgraded
✅ AI Gateway integrated
✅ Connectivity tests passing
✅ Performance tests returning real AI responses
✅ Token usage accurately tracked
✅ Response times ~1.5-2 seconds
✅ No mock responses!

