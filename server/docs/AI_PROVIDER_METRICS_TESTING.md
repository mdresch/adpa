# AI Provider Metrics Testing Guide

## Overview

This document describes the comprehensive testing and validation system for AI provider metrics tracking in ADPA.

## Files Created

### 1. Test Suite: `server/src/__tests__/integration/ai-provider-metrics.test.ts`

Comprehensive test suite covering:
- ✅ Token usage tracking (input, output, total)
- ✅ Response time tracking
- ✅ Cost calculation per provider/model
- ✅ Error tracking (error codes, messages, status codes)
- ✅ Success/failure status
- ✅ Domain-specific tracking (all 15 PMBOK domains)
- ✅ Provider/model combinations
- ✅ Aggregate metrics (totals, averages, error rates)

### 2. Checker Script: `server/scripts/check-and-fix-ai-providers.ts`

Utility script that:
- ✅ Checks all AI providers in database
- ✅ Validates models for each provider
- ✅ Updates missing models based on provider type
- ✅ Tests metrics tracking functionality
- ✅ Reports provider health and configuration
- ✅ Shows 30-day usage statistics

## Running Tests

### Check and Fix AI Providers

```bash
cd server
npm run check:ai-providers
```

This will:
1. List all providers with their configuration
2. Fix missing models based on provider type
3. Set default models if missing
4. Test metrics tracking for each provider
5. Show health metrics (success rate, response times, costs)

### Run Metrics Tests

```bash
cd server
npm run test:ai-metrics
```

### Run Failover Tests

```bash
cd server
npm run test:ai-failover
```

### Run All AI Tests

```bash
cd server
npm test -- --testPathPattern="ai-provider"
```

## What Gets Tested

### 1. Token Usage Tracking
- Input tokens (prompt_tokens)
- Output tokens (completion_tokens)
- Total tokens (calculated if not provided)
- Verification in `ai_usage_logs` table

### 2. Response Time Tracking
- Response time in milliseconds
- Different response times per provider
- Average response time calculations

### 3. Cost Calculation
- Cost per provider/model combination
- Pricing validation:
  - OpenAI: $5-30 per 1M tokens
  - Google: $0.075-5 per 1M tokens
  - Mistral: $0.70-12 per 1M tokens
  - Anthropic: $0.25-75 per 1M tokens
- Cost tracking in database

### 4. Error Tracking
- Error messages
- Status codes (429, 402, 401, 503, etc.)
- Success/failure status
- Error rate calculations

### 5. Domain-Specific Tracking
- All 15 PMBOK domains:
  - Performance Domains (8): stakeholders, team, development_approach, planning, project_work, delivery, measurement, uncertainty
  - Knowledge Area Domains (7): governance, scope, schedule, finance, resources, risk, stakeholders_ops
- Metrics stored in `ai_provider_usage` table with domain field

### 6. Provider/Model Combinations
- Multiple models per provider
- Model-specific metrics
- Provider-specific aggregations

### 7. Aggregate Metrics
- Total tokens per provider
- Average response time per model
- Total cost per provider
- Error rates per provider

## Provider Model Lists

### OpenAI
- `gpt-4o` (default)
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`
- `gpt-5`

### Google
- `gemini-2.0-flash-exp` (default)
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-2.5-flash-lite`

### Mistral
- `mistral-large-latest` (default)
- `mistral-small-latest`
- `mistral-medium-latest`

### Anthropic
- `claude-3-5-sonnet` (default)
- `claude-3-5-haiku`
- `claude-3-opus`
- `claude-sonnet-4.0`
- `claude-haiku-4.0`
- `claude-opus-4.0`

### Groq
- `llama-3.3-70b-versatile` (default)
- `llama-3.1-8b-instant`
- `llama3-70b-8192`
- `llama3-8b-8192`
- `mixtral-8x7b-32768`

### DeepSeek
- `deepseek-chat` (default)
- `deepseek-reasoner`
- `deepseek-coder`

### Moonshot
- `kimi-k2-turbo-preview` (default)
- `moonshot-v1-8k`
- `moonshot-v1-32k`
- `moonshot-v1-128k`

### xAI
- `grok-beta` (default)
- `grok-vision-beta`

## Database Tables

### `ai_providers`
Stores provider configuration:
- `id`, `name`, `provider_type`
- `is_active`, `priority`
- `default_model`, `available_models` (JSONB)
- `api_key_encrypted`
- `usage_stats` (JSONB)

### `ai_usage_logs`
Detailed usage tracking:
- `provider_id`, `model_id`
- `provider_type`, `model_name`
- `input_tokens`, `output_tokens`, `total_tokens`
- `response_time_ms`
- `success`, `error_message`, `status_code`
- `estimated_cost`
- `user_id`, `project_id`, `document_id`

### `ai_provider_usage`
Domain-specific usage (PMBOK 8):
- `project_id`, `domain` (pmbok_domain enum)
- `provider_name`, `provider_type`, `model_name`
- `prompt_tokens`, `completion_tokens`, `total_tokens`
- `response_time_ms`, `extraction_runtime_ms`
- `cost_usd`, `kpi_score`
- `status` (success, retry, failed)
- `error_code`, `error_message`

## Metrics Validation

### Expected Behaviors

1. **Token Tracking**: All token counts should be positive integers
2. **Response Times**: Should be in milliseconds, typically 500-5000ms
3. **Costs**: Should be calculated based on provider pricing tables
4. **Errors**: Should include error message and status code
5. **Success Rate**: Should be between 0-100%

### Common Issues to Check

1. **Missing Models**: Provider has no `available_models` set
2. **No Default Model**: Provider missing `default_model`
3. **Invalid Models**: Models not in provider's supported list
4. **Missing API Keys**: Provider active but no API key
5. **Metrics Not Tracking**: No records in `ai_usage_logs`
6. **Cost Calculation Errors**: Negative or zero costs for valid usage

## Troubleshooting

### No Metrics Being Tracked

1. Check if `trackAIUsageAsync` is being called
2. Verify provider exists in `ai_providers` table
3. Check database connection
4. Review error logs for tracking failures

### Incorrect Costs

1. Verify pricing in `calculateCost` method
2. Check token counts are correct
3. Validate provider type matches pricing table

### Missing Models

Run the checker script:
```bash
npm run check:ai-providers
```

This will automatically fix missing models based on provider type.

## Next Steps

1. ✅ Run `npm run check:ai-providers` to validate current setup
2. ✅ Run `npm run test:ai-metrics` to verify metrics tracking
3. ✅ Review provider health metrics
4. ✅ Fix any missing models or configurations
5. ✅ Monitor metrics in production

## Related Files

- `server/src/services/aiService.ts` - AI service with metrics tracking
- `server/src/services/analyticsTrackingService.ts` - Analytics tracking service
- `server/src/__tests__/integration/ai-provider-failover.test.ts` - Failover tests
- `server/migrations/350_pmbok8_domain_alignment.sql` - Database schema

