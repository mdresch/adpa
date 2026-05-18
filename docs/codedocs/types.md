---
title: "Types"
description: "Reference for the main exported TypeScript contracts used across templates, generation, context, retrieval, and knowledge-base flows."
---

ADPA exports many TypeScript interfaces, enums, and type aliases. This page focuses on the contracts that shape the public workflows documented in this site.

## Document Templates

Source: `server/src/modules/documentTemplates/types.ts`

```ts
export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  framework: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom';
  category?: string;
  content: Record<string, any>;
  variables: TemplateVariable[];
  is_public: boolean;
  created_by: string;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
  system_prompt?: string;
  context_injection_config?: ContextInjectionConfig;
  prompt_build_up?: PromptBuildUpConfig;
  template_paragraphs?: TemplateParagraph[];
  gkg_context_strategy?: GkgContextStrategy;
}
```

```ts
export interface GkgContextStrategy {
  profile?: GkgContextProfile;
  entityTypes?: string[];
  scope?: GkgContextScope;
  maxDocuments?: number;
  maxUnits?: number;
  traceableOnly?: boolean;
  documentStatusFilter?: GkgDocumentStatusFilter;
}
```

Use these when a template needs to carry both authoring structure and retrieval intent.

## Document Generation

Source: `server/src/modules/documentGenerator/types.ts`

```ts
export interface DocumentGenerationRequest {
  template_id: string;
  data: Record<string, any>;
  output_format: OutputFormat;
  options?: GenerationOptions;
}
```

```ts
export interface DocumentGenerationResponse {
  id: string;
  status: GenerationStatus;
  output_format: OutputFormat;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  metadata: GenerationMetadata;
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
}
```

```ts
export enum OutputFormat {
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html'
}
```

These types define the external shape of the generator module.

## Context Injection

Source: `server/src/modules/context/types.ts`

```ts
export interface ContextRequest {
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

```ts
export interface ContextResponse {
  enhanced_prompt: string;
  context_used: ContextData;
  token_usage: TokenUsage;
  context_summary: string;
  warnings?: string[];
}
```

```ts
export enum ContextPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}
```

Use these with `ContextInjector` or `ContextAwareAIService`.

## Context Orchestrator and Injection Bundles

Source: `server/src/modules/contextInjection/types.ts` and `server/src/modules/contextOrchestrator/contextOrchestrator.ts`

```ts
export interface ContextInjectionRequest {
  template_id: string;
  project_id?: string;
  user_id: string;
  variables?: Record<string, any>;
  config_override?: Partial<ContextInjectionConfig>;
}
```

```ts
export interface ContextBundle {
  bundle_id: string;
  template_id: string;
  project_id?: string;
  user_id: string;
  results: ContextResult[];
  metadata: {
    created_at: Date;
    total_sources: number;
    successful_sources: number;
    failed_sources: number;
    total_size_bytes: number;
    processing_time_ms: number;
  };
  injection_strategy: string;
  max_context_length: number;
}
```

```ts
export interface EnhancedContextRequest extends ContextGatheringRequest {
  enable_access_control?: boolean;
  enable_freshness_validation?: boolean;
  freshness_threshold?: number;
  required_permissions?: string[];
  context_size_limit?: number;
}
```

These types matter when you want auditable, bundle-oriented context operations rather than just a single enriched prompt.

## Context Retrieval

Source: `server/src/modules/contextRetrieval/types.ts`

```ts
export interface ContextRetrievalRequest {
  query: string;
  contextTypes: ContextType[];
  filters?: ContextFilters;
  limit?: number;
  minRelevanceScore?: number;
  includeMetadata?: boolean;
  userId?: string;
  projectId?: string;
  templateId?: string;
  framework?: string;
  category?: string;
}
```

```ts
export type ContextType =
  | 'project_data'
  | 'user_preferences'
  | 'document_history'
  | 'external_api'
  | 'database_query'
  | 'file_content'
  | 'stakeholder_info'
  | 'requirements'
  | 'constraints'
  | 'risks'
  | 'best_practices'
  | 'patterns'
  | 'quality_metrics'
  | 'expertise'
  | 'collaboration_preferences';
```

These are the contracts behind the orchestrator’s retrieval layer.

## Knowledge Base

Source: `server/src/modules/knowledgeBase/types.ts`

```ts
export interface KnowledgeBaseEntry {
  id: string;
  project_id: string;
  entry_type: EntryType;
  category: EntryCategory;
  title: string;
  description: string;
  baseline_approach?: BaselineApproach | null;
  improved_approach: ImprovedApproach;
  value_metrics?: ValueMetrics | null;
  replication_guide: ReplicationGuide;
  status: EntryStatus;
  created_by: string;
  created_at: Date;
  view_count: number;
  application_count: number;
  success_rate: number;
  updated_at: Date;
}
```

```ts
export interface KnowledgeBaseApplication {
  id: string;
  knowledge_base_entry_id: string;
  target_project_id: string;
  applied_by: string;
  applied_at: Date;
  adaptation_required: boolean;
  status: ApplicationStatus;
  outcome?: ApplicationOutcome | null;
  actual_value?: ValueMetrics | null;
  updated_at: Date;
}
```

```ts
export interface KnowledgeBaseReview {
  id: string;
  knowledge_base_entry_id: string;
  reviewer_id: string;
  reviewed_at: Date;
  review_type: ReviewType;
  recommendation?: ReviewRecommendation | null;
  updated_at: Date;
}
```

Use these when a lesson learned needs to become a reusable, measurable asset instead of a one-off note.
