---
title: "Context Services"
description: "Reference for the original context module, including ContextInjector and ContextAwareAIService."
---

Import path: `@/modules/context`  
Primary source files: `server/src/modules/context/index.ts`, `injector.ts`, `integration.ts`, `extractors.ts`, `prioritizer.ts`, `token-manager.ts`, `types.ts`

This page covers the main exported classes in the original context system.

## `ContextInjector`

### Signature

```ts
class ContextInjector {
  static async injectContext(
    request: ContextRequest,
    config: Partial<ContextConfig> = {}
  ): Promise<ContextResponse>;

  static async getContextStats(
    request: ContextRequest
  ): Promise<{
    available_tokens: number;
    estimated_context_tokens: number;
    context_sources: string[];
  }>;
}
```

### `ContextConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max_context_ratio` | `number` | `0.7` | Maximum fraction of model capacity reserved for context. |
| `default_priority` | `ContextPriority` | `ContextPriority.MEDIUM` | Fallback priority when a section is not explicitly weighted. |
| `enable_smart_truncation` | `boolean` | `true` | Allows fallback truncation when validation exceeds budget. |
| `preserve_user_prompt` | `boolean` | `true` | Keeps the original prompt distinct from injected context. |
| `context_separator` | `string` | `

---

` | Separator inserted between context and prompt blocks. |
| `include_metadata` | `boolean` | `false` | Controls whether extractor metadata enters the payload. |

### `ContextRequest`

```ts
interface ContextRequest {
  prompt: string;
  project_id?: string;
  document_ids?: string[];
  template_id?: string;
  user_id: string;
  provider: string;
  model?: string;
  max_context_tokens?: number;
  priority_config?: PriorityConfig;
  include_integrations?: boolean;
  custom_context?: Record<string, any>;
}
```

### Example

```ts
import { ContextInjector } from '@/modules/context';

const enriched = await ContextInjector.injectContext({
  prompt: 'Summarize the latest project risks.',
  user_id: currentUser.id,
  provider: 'openai',
  model: 'gpt-4o',
  project_id: project.id
});
```

## `ContextAwareAIService`

### Signature

```ts
class ContextAwareAIService {
  static async generateWithContext(request: EnhancedAIRequest): Promise<EnhancedAIResponse>;
  static async getContextPreview(
    request: Omit<EnhancedAIRequest, 'provider'>
  ): Promise<{
    enhanced_prompt: string;
    context_summary: string;
    token_usage: any;
    warnings?: string[];
  }>;
  static async getContextStatistics(
    request: Omit<EnhancedAIRequest, 'provider'>
  ): Promise<{
    available_tokens: number;
    estimated_context_tokens: number;
    context_sources: string[];
    recommendations: string[];
  }>;
  static async batchGenerateWithContext(
    requests: EnhancedAIRequest[]
  ): Promise<EnhancedAIResponse[]>;
}
```

### `EnhancedAIRequest`

`EnhancedAIRequest` extends the repo’s AI-generation request shape with:

- `project_id`
- `document_ids`
- `template_id`
- `include_integrations`
- `max_context_tokens`
- `context_priority`
- `custom_context`
- `context_config`
- required `user_id`
- optional `fallback_providers`

### Example

```ts
import { ContextAwareAIService } from '@/modules/context';

const response = await ContextAwareAIService.generateWithContext({
  user_id: currentUser.id,
  provider: 'google',
  model: 'gemini-1.5-pro',
  prompt: 'Draft a change-impact summary.',
  project_id: project.id,
  template_id: template.id
});
```

## Supporting Exports

The module also exports:

- extractor classes for project, document, template, user, and integration context,
- `ContextPrioritizer`,
- `TokenManager`,
- domain extraction config helpers such as `DOMAIN_EXTRACTION_CONFIGS` and `getDomainExtractionConfig`.

## Combined Pattern

Preview first, then generate:

```ts
const preview = await ContextAwareAIService.getContextPreview(request);
if (preview.token_usage.context_tokens < 2000) {
  return ContextAwareAIService.generateWithContext({
    ...request,
    provider: 'openai'
  });
}
```

That pattern keeps token budgeting explicit without forcing each caller to reimplement the extractor and prioritizer logic.
