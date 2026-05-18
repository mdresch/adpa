---
title: "KnowledgeBaseService"
description: "Reference for knowledge-base entries, applications, reviews, stats, and recommendation routes."
---

Import path: `@/modules/knowledgeBase`  
Primary source files: `server/src/modules/knowledgeBase/index.ts`, `service.ts`, `controller.ts`, `routes.ts`, `types.ts`

`KnowledgeBaseService` stores reusable improvements and tracks whether they were reviewed and successfully applied elsewhere.

## Constructor

```ts
class KnowledgeBaseService
```

Singleton export:

```ts
export const knowledgeBaseService = new KnowledgeBaseService();
```

## Public Methods

### Entries

```ts
async createEntry(
  data: CreateKnowledgeBaseEntryRequest,
  userId: string
): Promise<KnowledgeBaseEntry>

async getEntryById(entryId: string): Promise<KnowledgeBaseEntry | null>

async searchEntries(
  filters: KnowledgeBaseSearchFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ entries: KnowledgeBaseEntry[]; total: number }>

async updateEntry(
  entryId: string,
  data: UpdateKnowledgeBaseEntryRequest
): Promise<KnowledgeBaseEntry>

async deleteEntry(entryId: string): Promise<void>
```

### Applications

```ts
async createApplication(
  data: CreateKnowledgeBaseApplicationRequest,
  userId: string
): Promise<KnowledgeBaseApplication>

async updateApplication(
  applicationId: string,
  data: UpdateKnowledgeBaseApplicationRequest
): Promise<KnowledgeBaseApplication>

async getApplicationsByEntry(entryId: string): Promise<KnowledgeBaseApplication[]>
```

### Reviews and stats

```ts
async createReview(
  data: CreateKnowledgeBaseReviewRequest,
  userId: string
): Promise<KnowledgeBaseReview>

async getReviewsByEntry(entryId: string): Promise<KnowledgeBaseReview[]>

async getStats(): Promise<KnowledgeBaseStats>
```

## Route Surface

```text
POST   /api/knowledge-base/entries
GET    /api/knowledge-base/entries
GET    /api/knowledge-base/entries/:id
PUT    /api/knowledge-base/entries/:id
DELETE /api/knowledge-base/entries/:id
POST   /api/knowledge-base/applications
PUT    /api/knowledge-base/applications/:id
GET    /api/knowledge-base/entries/:id/applications
POST   /api/knowledge-base/reviews
GET    /api/knowledge-base/entries/:id/reviews
GET    /api/knowledge-base/stats
GET    /api/knowledge-base/recommendations/:projectId
```

## Example

```ts
import { knowledgeBaseService } from '@/modules/knowledgeBase';

const entry = await knowledgeBaseService.createEntry({
  project_id: project.id,
  entry_type: 'best_practice',
  category: 'architecture',
  title: 'Move retrieval strategy into templates',
  description: 'Template-level retrieval settings reduced prompt noise.',
  improved_approach: {
    description: 'Attach GKG retrieval metadata to shared templates.',
    implementation_details: 'Use gkg_context_strategy on governance templates.'
  },
  replication_guide: {
    steps: ['Identify noisy prompts', 'Attach bounded retrieval metadata', 'Measure result quality']
  }
}, currentUser.id);

await knowledgeBaseService.createReview({
  knowledge_base_entry_id: entry.id,
  review_type: 'peer_review',
  recommendation: 'approve'
}, currentUser.id);
```

## Combined Pattern

The high-value workflow is not just `createEntry(...)`. It is:

1. create the entry,
2. create one or more reviews,
3. create applications in new projects,
4. query `getStats()` to see whether the pattern is actually being reused successfully.

That is what separates the module from a static wiki table.
