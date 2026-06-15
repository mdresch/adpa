---
name: adpa-ai-provider-management
description: Use when configuring AI providers, discovering models, testing provider connections, viewing provider analytics, or modifying the fallback selection mechanism.
---

# ADPA AI Provider Management & Fallback Mechanism

## Overview
This skill covers the configuration, testing, and lifecycle management of AI Providers in ADPA, as well as the dynamic fallback mechanism used during document generation. It details the properties required for proper provider integration (models discovery, analytics, defaults).

## When to Use
- When modifying the AI Providers central management page (`/ai-providers`).
- When implementing or troubleshooting model discovery (`/discover-models`) or syncing (`/sync-models`).
- When adding or modifying fields on the provider entity (e.g., Status, Last Used, Requests count).
- When tuning or debugging the AI fallback selection mechanism.
- When configuring new AI Providers, testing connections, or updating defaults.

## Core Provider Entity
A complete AI Provider configuration must surface the following telemetry and metadata on the central management page:
- **Provider Information:** Name, Type (e.g., openai, google, anthropic), API Key.
- **Model Configuration:** 
  - `available_models`: The JSON array of discovered models.
  - `default_model`: The model to default to when none is explicitly selected.
  - `max_tokens`: Context limits for the provider.
- **Analytics & Status:**
  - `Status`: Active vs Inactive.
  - `Last Used`: Timestamp of the last successful generation.
  - `Requests`: Total count of requests made to this provider.
  - `Error Rate` / Health metrics.

## Model Discovery and Syncing Workflow
Do not hardcode models for providers. Instead, rely on the API discovery endpoints.

1. **Discovery Request (`GET /api/ai-providers/:id/discover-models`)**: Queries the provider's native API (e.g., OpenAI `/v1/models`, Google API) to fetch real-time available models.
2. **Syncing & Saving (`POST /api/ai-providers/:id/sync-models`)**: 
   - Persist the discovered models into the `available_models` (or `configuration.models` JSONB) column.
   - Designate and save the `default_model` explicitly.
3. **Frontend Parsing**: The frontend maps these to `p.configuration?.models || p.models` and initializes the dropdown with the `default_model`.

## Testing the AI Provider
Testing is handled via the `POST /api/ai-providers/:name/test` endpoint.
- Verifies that the API key is valid.
- Verifies that the provider endpoint is reachable.
- Returns health confirmation so the UI can accurately display the Provider's `Status`.

## Provider Fallback Mechanism
The fallback mechanism ensures resilient document generation if the primary AI Provider fails or rate limits are hit.

- **Primary Selection**: Attempt generation using the explicitly selected Provider and Model.
- **Fallback Trigger**: If the primary provider returns a 429 (Rate Limit) or 5xx (Server Error), the mechanism intercepts the error.
- **Fallback Selection**: The generation request is routed to the configured `fallbackProviders` array sequentially.
- **Unified Generation**: Both `generate` and `generate-stream` endpoints support this fallback natively via `aiService.generateWithFallback` and `aiService.generateStreamWithFallback`.

### Common Mistakes
- **Empty Models Array**: Assuming `p.models` is an array when the database uses JSONB `configuration.models`. Always use `p.configuration?.models || p.models` on the frontend.
- **Ignoring Default Model**: Failing to pre-select the `default_model` when a user switches providers in the UI, forcing them to manually guess a valid model.
- **Hardcoding Models**: Hardcoding model names in the UI instead of using the Discovery mechanism. This breaks when providers release new models.

## Quick Reference API Endpoints
| Action | Endpoint | Purpose |
|---|---|---|
| **List Providers** | `GET /api/ai-providers` | Retrieves all providers with their configuration and active status. |
| **Discover Models** | `GET /api/ai-providers/:id/discover-models` | Fetches available models directly from the provider's API. |
| **Sync Models** | `POST /api/ai-providers/:id/sync-models` | Saves discovered models and default model to the database. |
| **Test Provider** | `POST /api/ai-providers/:name/test` | Validates credentials and endpoint connectivity. |
| **Toggle Status** | `POST /api/ai-providers/:id/toggle` | Enables or disables a provider for use in generation. |
| **Analytics/Health**| `GET /api/ai-providers/health` | Retrieves health status and availability of active providers. |
