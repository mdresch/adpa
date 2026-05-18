---
title: "DocumentTemplateService"
description: "Reference for the document template module, service methods, route surface, and request contracts."
---

Import path: `@/modules/documentTemplates`  
Primary source files: `server/src/modules/documentTemplates/index.ts`, `service.ts`, `routes.ts`, `types.ts`, `validation.ts`

`DocumentTemplateService` manages template storage, visibility, deletion lifecycle, and reuse metadata. The HTTP routes mounted at `/api/document-templates` are thin wrappers over this service.

## Constructor

```ts
class DocumentTemplateService
```

The singleton export is:

```ts
export const documentTemplateService = new DocumentTemplateService();
```

There are no constructor options; the service reads PostgreSQL through `pool` and Redis through `cache`.

## Route Surface

```text
GET    /api/document-templates
GET    /api/document-templates/trash
GET    /api/document-templates/:id
POST   /api/document-templates
PUT    /api/document-templates/:id
DELETE /api/document-templates/:id
POST   /api/document-templates/:id/clone
POST   /api/document-templates/:id/use
POST   /api/document-templates/:id/restore
DELETE /api/document-templates/:id/permanent
```

## Core Methods

### `getTemplates`

```ts
async getTemplates(query: TemplateListQuery, user: AuthenticatedUser): Promise<TemplateListResponse>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `TemplateListQuery` | — | Pagination and filter object. |
| `user` | `AuthenticatedUser` | — | Used to scope results to public templates or the caller’s own templates. |

Returns a paginated `TemplateListResponse`.

### `getTemplateById`

```ts
async getTemplateById(id: string, user: AuthenticatedUser): Promise<DocumentTemplate | null>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Template UUID. |
| `user` | `AuthenticatedUser` | — | Read access is limited to public templates or the owner. |

This method checks Redis first and caches the result for one hour.

### `getTemplateGkgStrategy`

```ts
async getTemplateGkgStrategy(id: string): Promise<GkgContextStrategy | null>
```

Used internally by pipeline code when generation needs template-scoped GKG retrieval behavior.

### `createTemplate`

```ts
async createTemplate(data: CreateTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate>
```

The request can include `system_prompt`, `context_injection_config`, `prompt_build_up`, `template_paragraphs`, and `gkg_context_strategy`, not just content and variables.

### `updateTemplate`

```ts
async updateTemplate(id: string, data: UpdateTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate | null>
```

Only the owner or an admin can update a template. The cache entry is invalidated after a successful update.

### `deleteTemplate`

```ts
async deleteTemplate(id: string, user: AuthenticatedUser): Promise<boolean>
```

Soft-deletes a template unless the template is still referenced by existing documents.

### `cloneTemplate`

```ts
async cloneTemplate(id: string, data: CloneTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate | null>
```

Cloning is the safest way to branch a shared template without mutating the original.

### `recordTemplateUsage`

```ts
async recordTemplateUsage(id: string, user: AuthenticatedUser): Promise<number | null>
```

Increments `usage_count` and invalidates the cached template.

### `getDeletedTemplates`

```ts
async getDeletedTemplates(page: number = 1, limit: number = 100, user: AuthenticatedUser): Promise<TemplateListResponse>
```

Admins can see all deleted templates; non-admins only see templates they deleted.

### `restoreTemplate`

```ts
async restoreTemplate(id: string, user: AuthenticatedUser): Promise<DocumentTemplate | null>
```

### `permanentlyDeleteTemplate`

```ts
async permanentlyDeleteTemplate(id: string, user: AuthenticatedUser): Promise<boolean>
```

## Common Request Types

```ts
interface CreateTemplateRequest {
  name: string;
  description?: string;
  framework: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom';
  category?: string;
  content: Record<string, any>;
  variables?: TemplateVariable[];
  is_public?: boolean;
  system_prompt?: string;
  context_injection_config?: ContextInjectionConfig;
  prompt_build_up?: PromptBuildUpConfig;
  template_paragraphs?: TemplateParagraph[];
  gkg_context_strategy?: GkgContextStrategy;
}
```

## Usage Example

```ts
import { documentTemplateService } from '@/modules/documentTemplates';

const list = await documentTemplateService.getTemplates(
  { framework: 'PMBOK 7', page: 1, limit: 20 },
  currentUser
);

const created = await documentTemplateService.createTemplate({
  name: 'Risk Review',
  framework: 'Custom',
  content: { template: '# {{title}}' }
}, currentUser);
```

## Combined Pattern

The most common composition is:

1. `createTemplate(...)`
2. `getTemplateById(...)`
3. pass `template.id` into `documentGeneratorService.generateDocument(...)`

That is the core workflow behind ADPA’s author-once, render-many model.
