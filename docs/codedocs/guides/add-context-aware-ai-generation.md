---
title: "Add Context-Aware AI Generation"
description: "Use ADPA’s context services to preview, budget, and execute prompt enrichment in application code."
---

This guide is for backend contributors or internal integrators who want richer AI output without hand-building context blocks.

## Problem

A plain prompt ignores project context, recent documents, and the user’s environment. You want the AI call to stay simple, but you also want the output grounded in ADPA data.

## Solution

Use `ContextAwareAIService` from `server/src/modules/context/integration.ts`. It wraps the extractor, prioritizer, and token-budget logic and returns both the AI result and the context metadata.

<Steps>
<Step>
### Import the context service

```ts
import { ContextAwareAIService } from '@/modules/context';
```

</Step>
<Step>
### Preview the injected context

```ts
const preview = await ContextAwareAIService.getContextPreview({
  user_id: user.id,
  prompt: 'Draft a steering summary for the project.',
  project_id: project.id,
  template_id: template.id,
  include_integrations: false,
});

console.log(preview.context_summary);
console.log(preview.token_usage);
```

</Step>
<Step>
### Check context statistics before generation

```ts
const stats = await ContextAwareAIService.getContextStatistics({
  user_id: user.id,
  prompt: 'Draft a steering summary for the project.',
  project_id: project.id,
  template_id: template.id,
});

console.log(stats.available_tokens);
console.log(stats.recommendations);
```

</Step>
<Step>
### Generate with context

```ts
const response = await ContextAwareAIService.generateWithContext({
  user_id: user.id,
  provider: 'openai',
  model: 'gpt-4o',
  prompt: 'Draft a steering summary for the project.',
  project_id: project.id,
  template_id: template.id,
  document_ids: recentDocumentIds,
  max_context_tokens: 1800,
});

console.log(response.content);
console.log(response.context_summary);
console.log(response.context_warnings);
```

</Step>
</Steps>

## Complete Runnable Example

```ts
import { ContextAwareAIService, ContextPriority } from '@/modules/context';

export async function buildStatusNarrative(userId: string, projectId: string, templateId: string) {
  const preview = await ContextAwareAIService.getContextPreview({
    user_id: userId,
    prompt: 'Write a concise project status narrative for executives.',
    project_id: projectId,
    template_id: templateId,
    include_integrations: false,
  });

  if (preview.token_usage.context_tokens > 2000) {
    console.warn('Large context block:', preview.token_usage);
  }

  const result = await ContextAwareAIService.generateWithContext({
    user_id: userId,
    provider: 'google',
    model: 'gemini-1.5-pro',
    prompt: 'Write a concise project status narrative for executives.',
    project_id: projectId,
    template_id: templateId,
    max_context_tokens: 1800,
    context_priority: {
      project: ContextPriority.HIGH,
      documents: ContextPriority.HIGH,
      templates: ContextPriority.MEDIUM,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.MEDIUM,
    },
    custom_context: {
      audience: 'Steering committee',
      tone: 'Decisive and concise'
    }
  });

  return result;
}
```

If generation succeeds but `context_summary` says context injection failed, you hit the built-in fallback path in `ContextAwareAIService.generateWithContext(...)`. That is expected behavior; inspect `context_warnings` to see what was dropped.
