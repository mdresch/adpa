---
title: "ContextOrchestrator"
description: "Reference for the enhanced context orchestrator, its config, routes, and return payloads."
---

Import path: `@/modules/contextOrchestrator`  
Primary source files: `server/src/modules/contextOrchestrator/index.ts`, `contextOrchestrator.ts`, `server/src/routes/contextOrchestrator.ts`

The exported singleton is lazy-initialized through a `Proxy` so the module does not fail during load time if a dependency is temporarily unavailable.

## Constructor

```ts
class ContextOrchestrator {
  constructor(config: ContextOrchestratorConfig)
}
```

The exported instance is:

```ts
export const contextOrchestrator = new Proxy({} as ContextOrchestrator, { ... });
```

### `ContextOrchestratorConfig`

| Option | Type | Default in singleton | Description |
|--------|------|----------------------|-------------|
| `enableAccessControl` | `boolean` | `true` | Run access checks before gathering. |
| `enableFreshnessValidation` | `boolean` | `true` | Score and flag stale sources. |
| `enableComprehensiveLogging` | `boolean` | `true` | Persist detailed source logs. |
| `enableMetricsCollection` | `boolean` | `true` | Collect aggregate metrics. |
| `enableCaching` | `boolean` | `true` | Allow cache-capable dependencies to cache results. |
| `maxContextSizeBytes` | `number` | `10485760` | Byte-size cap used during gathering. |
| `maxProcessingTimeMs` | `number` | `30000` | Soft processing-time target. |
| `enableParallelProcessing` | `boolean` | `true` | Allows parallel-capable internals to run concurrently. |
| `enableRetryLogic` | `boolean` | `true` | Enables retry-capable internals. |
| `maxRetries` | `number` | `3` | Retry limit for orchestrated operations. |

## Public Methods

### `gatherContextWithValidation`

```ts
async gatherContextWithValidation(
  request: EnhancedContextRequest
): Promise<EnhancedContextResponse>
```

### `injectContextWithValidation`

```ts
async injectContextWithValidation(
  request: ContextInjectionRequest
): Promise<ContextInjectionResponse>
```

### `getHealthStatus`

```ts
async getHealthStatus(): Promise<any>
```

## Request Types

```ts
interface EnhancedContextRequest extends ContextGatheringRequest {
  enable_access_control?: boolean;
  enable_freshness_validation?: boolean;
  freshness_threshold?: number;
  required_permissions?: string[];
  context_size_limit?: number;
}
```

`EnhancedContextResponse` augments the gathering result with:

- `access_control_results`
- `freshness_validation_results`
- `source_logs`
- `metrics`
- `warnings`
- `errors`

## Route Surface

```text
POST /api/context-orchestrator/gather
POST /api/context-orchestrator/inject
GET  /api/context-orchestrator/health
GET  /api/context-orchestrator/metrics
```

## Example

```ts
import { contextOrchestrator } from '@/modules/contextOrchestrator';

const gathered = await contextOrchestrator.gatherContextWithValidation({
  request_id: 'ctx_001',
  project_id: project.id,
  template_id: template.id,
  user_id: currentUser.id,
  document_type: 'charter',
  gathering_config: {
    enable_project_analysis: true,
    enable_user_profile_analysis: true,
    enable_document_history_analysis: true,
    enable_external_source_integration: false,
    enable_template_context_analysis: true,
    max_context_age: 24,
    context_quality_threshold: 0.7,
    include_historical_patterns: true,
    include_collaboration_data: false,
    include_performance_metrics: true,
    context_sources: [],
    analysis_depth: 'medium',
    priority_filters: []
  }
});
```

## Combined Pattern

The common orchestration loop is:

1. `gatherContextWithValidation(...)`
2. inspect `warnings`, `errors`, and `metrics`
3. `injectContextWithValidation(...)` if the gathered context is acceptable

That split lets calling code keep governance checks and template injection as separate decisions.
