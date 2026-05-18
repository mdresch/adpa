---
title: "Knowledge Base"
description: "Understand how ADPA stores reusable improvements, tracks adoption, and turns project lessons into structured assets."
---

The knowledge base module is ADPA’s mechanism for preserving what teams learn after they generate, review, and apply documents in real projects. Instead of leaving improvements trapped in chat history or ticket comments, it stores them as typed entries with applications, reviews, and aggregate stats.

## What This Concept Is

`KnowledgeBaseEntry` in `server/src/modules/knowledgeBase/types.ts` is more structured than a note. It includes:

- an `entry_type` such as `best_practice`, `innovation`, or `process_improvement`,
- a `category` such as `architecture`, `risk_management`, or `ai_optimization`,
- a baseline approach,
- an improved approach,
- measurable value metrics,
- a replication guide,
- lifecycle status,
- usage and success metrics.

That structure exists because the module is meant to drive reuse, not merely storage.

## How It Relates To Other Concepts

- Document generation and project execution create the raw material that eventually becomes a knowledge-base entry.
- Templates can later be improved by patterns discovered in high-performing entries.
- AI-driven recommendation endpoints can suggest relevant knowledge-base items for a project.

## How It Works Internally

The main implementation sits in `server/src/modules/knowledgeBase/service.ts`.

`KnowledgeBaseService` owns three nested workflows:

1. entries,
2. applications,
3. reviews.

Entries are created in `knowledge_base_entries`. Applications are tracked in `knowledge_base_applications`, which lets ADPA measure whether an idea was merely stored or actually reused in another project. Reviews live in `knowledge_base_reviews`, which adds peer or approval metadata around the entry.

The service is database-first and transactional where it matters. For example, `createApplication(...)` begins a transaction because application creation also updates usage metrics on the parent entry. Search is full-text oriented: `searchEntries(...)` builds SQL conditions dynamically and uses `to_tsvector(...) @@ plainto_tsquery(...)` for text search in title and description.

The route layer in `server/src/modules/knowledgeBase/routes.ts` mounts:

- `/entries`
- `/applications`
- `/reviews`
- `/stats`
- `/recommendations/:projectId`

All routes are behind `authenticateToken`, which makes sense because the knowledge base is organizational memory rather than public content.

## Basic Usage

Create a best-practice entry:

```bash
curl -X POST http://localhost:5000/api/knowledge-base/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": "7d9d7de9-c4cd-4bf4-a973-8e183d8ff0a1",
    "entry_type": "best_practice",
    "category": "architecture",
    "title": "Use template-level context strategies for governance packs",
    "description": "Templates that declare GKG scope produce more consistent review packs.",
    "improved_approach": {
      "description": "Move retrieval settings into template metadata.",
      "implementation_details": "Define gkg_context_strategy on shared review templates."
    },
    "replication_guide": {
      "steps": [
        "Identify high-noise prompts.",
        "Attach a bounded GKG strategy to the template.",
        "Measure result consistency over several runs."
      ]
    }
  }'
```

Search for reusable items:

```bash
curl "http://localhost:5000/api/knowledge-base/entries?category=architecture&search=template&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Advanced Usage

Track adoption and review quality, not just existence:

```bash
curl -X POST http://localhost:5000/api/knowledge-base/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "knowledge_base_entry_id": "44ec1220-e7ad-42a8-bff3-bb5029ca9941",
    "target_project_id": "0e7757dd-c91c-4b46-8f30-fb1bd3f69870",
    "adaptation_required": true,
    "adaptations": {
      "change": "Limited the strategy to approved documents only."
    }
  }'
```

```bash
curl -X POST http://localhost:5000/api/knowledge-base/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "knowledge_base_entry_id": "44ec1220-e7ad-42a8-bff3-bb5029ca9941",
    "review_type": "peer_review",
    "recommendation": "approve",
    "rating": 5,
    "review_text": "Worked well across two governance projects with minimal adaptation."
  }'
```

## Common Pitfalls

<Callout type="warn">Deleting an entry does not remove it from the database. `deleteEntry(...)` archives it by setting `status = 'archived'`. That is usually the right behavior, but it means callers should filter by `status` if they only want active patterns.</Callout>

<Callout type="warn">Search is SQL full-text search, not semantic retrieval. If you expect synonym-heavy or embedding-based discovery, you will need to extend the module rather than rely on the existing `searchEntries(...)` behavior.</Callout>

<Callout type="warn">Statistics aggregate the stored records, not validated business outcomes. `getStats()` is useful for trend tracking, but it only knows what was written into the tables, including success-rate fields and recorded application outcomes.</Callout>

## Trade-offs

<Accordions>
<Accordion title="Structured entries vs free-form lessons learned">
Structured entries are harder to create than a markdown note because they require categories, types, approaches, and a replication guide. The payoff is that they can be filtered, reviewed, reused, and measured in a consistent way across projects. Free-form notes capture nuance faster, but they are hard to search and nearly impossible to aggregate into portfolio-level patterns. Use structure when you want the lesson to survive beyond the original team.
</Accordion>
<Accordion title="Cross-project reuse vs local specificity">
The module encourages teams to store patterns that can travel between projects. That is powerful for organization-wide learning, but it creates pressure to generalize ideas that may actually depend on one project’s politics, tooling, or constraints. Keep the replication guide honest about prerequisites and adaptation cost. A smaller, precise entry is more valuable than a vague “best practice” that works nowhere else.
</Accordion>
</Accordions>
