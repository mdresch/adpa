---
name: ai-management-maintenance
description: Maintenance, configuration, and troubleshooting for the ADPA AI Management System. Use when adding new AI providers, modifying fallback logic, or debugging AI selection and analytics features.
---

# ADPA AI Management Maintenance

## Overview
This skill provides procedural guidance for maintaining the ADPA AI Management system, ensuring that the database-first selection logic and mandatory fallback mechanisms remain robust and consistent across the platform.

## Core Capabilities

### 1. Database-First Selection Logic
All AI requests (both general and search-agentic) MUST follow the priority defined in the `ai_providers` table.
- **Reference**: [schema.md](references/schema.md)
- **Rule**: Lower values in the `priority` column take precedence.
- **Action**: Always query the database before selecting a model to respect user-configured overrides.

### 2. Mandatory Ollama Fallback
Every AI feature MUST include a terminal fallback to a local Ollama model to ensure system resilience during cloud outages.
- **Implementation**: See `lib/morphic/config/model-types.ts` for the orchestration loop.
- **Default Model**: `llama3.1` (configurable via `OLLAMA_MODEL` env var).

### 3. Model Discovery & Synchronization
The system supports a dynamic flow for updating available models.
- **Workflow**:
  1. Fetch suggested models from [endpoints.md](references/endpoints.md#ai-providers-api-ai-providers).
  2. Present selection to the user in the UI.
  3. Persist selection to `available_models` and `default_model` columns.
- **Verification**: Ensure the `configuration` JSONB column is also updated for backward compatibility.

### 4. Real-time Analytics
Usage data must be accurately tracked in `ai_usage_logs`.
- **Metrics**: Tokens, cost, latency, and success/failure status.
- **Maintenance**: Check `server/src/modules/intelligence/AnalyticsRepository.ts` if analytics show 404 or stale data.

## Maintenance Workflows

### Adding a New Provider Type
1. Update `lib/morphic/db/schema.ts` if new metadata is required.
2. Add the provider to the `switch` block in `server/src/routes/ai-providers.ts` under `/discover-models`.
3. Implement the model selection logic in `lib/morphic/config/model-types.ts` to include the new provider's defaults.

### Debugging "API Key Expired" or "Failed to Fetch"
1. Verify the provider is active in the `ai_providers` table.
2. Ensure the `AIService.generateWithFallback` is being used instead of direct SDK calls.
3. Check that the `priority` is set correctly to allow the Ollama fallback to trigger.

## Resources
- **Database Schema**: [schema.md](references/schema.md)
- **API Endpoints**: [endpoints.md](references/endpoints.md)
