---
title: "Document Templates"
description: "Learn how ADPA stores, validates, versions, and reuses document templates across frameworks and AI flows."
---

Document templates are the anchor object for most of ADPA. They describe the reusable structure of a document, the variables that must be provided, optional AI system prompts, optional context-injection settings, and an optional Governance Knowledge Graph strategy used to pull richer source material during generation.

## What This Concept Is

A `DocumentTemplate` is the durable contract between authoring and generation. It tells the system:

- what content shape to render,
- which variables are required,
- whether the template is public or private,
- what context sources are relevant,
- whether the template should trigger a GKG retrieval profile.

Without templates, every generation call would need to carry its own prompt engineering, structure, and output assumptions. With templates, ADPA lets teams standardize how recurring artifacts are produced.

## How It Relates To Other Concepts

- The [Document Generation](/docs/document-generation) flow consumes templates and turns them into files.
- The [Context Injection](/docs/context-injection) flow can be configured from template metadata.
- The [Context Orchestration](/docs/context-orchestration) path can use `template_id` to decide which context to gather.
- The [Knowledge Base](/docs/knowledge-base) can later store improvements discovered while using those templates in live projects.

## How It Works Internally

The source of truth lives in `server/src/modules/documentTemplates/types.ts` and `service.ts`.

`DocumentTemplateService` does four important things:

1. It scopes reads so users can only see public templates or their own templates.
2. It caches `getTemplateById` reads in Redis under `template:${id}`.
3. It stores richer AI fields such as `system_prompt`, `context_injection_config`, `prompt_build_up`, `template_paragraphs`, and `gkg_context_strategy`.
4. It treats deletion as a lifecycle operation, not a raw row delete. Templates move to trash first, and hard delete only happens from the trash path.

The validation layer in `server/src/modules/documentTemplates/validation.ts` is equally important. It accepts both classic enterprise frameworks (`TOGAF`, `SABSA`, `COBIT`, `ITIL`, `Custom`) and the domain-specific frameworks used elsewhere in the repo (`BABOK v3`, `PMBOK 7`, `DMBOK 2.0`). That means template storage is stricter than free-form JSON but intentionally not locked to a single methodology family.

The `gkg_context_strategy` field is where templates become retrieval-aware. The type in `types.ts` lets a template declare:

- a preset profile such as `governance_full` or `charter_light`,
- explicit entity types,
- scope such as `same_project` or `all_accessible`,
- limits like `maxDocuments` and `maxUnits`,
- traceability and document-status filters.

That design keeps semantic-search behavior attached to the template itself instead of forcing callers to rebuild retrieval settings for every request.

## Basic Usage

Create a reusable charter-style template over HTTP:

```bash
curl -X POST http://localhost:5000/api/document-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Project Charter",
    "framework": "PMBOK 7",
    "category": "Initiation",
    "content": {
      "template": "# {{projectName}}

## Objective
{{objective}}

## Sponsor
{{sponsor}}"
    },
    "variables": [
      { "name": "projectName", "type": "text", "required": true },
      { "name": "objective", "type": "text", "required": true },
      { "name": "sponsor", "type": "text", "required": true }
    ],
    "is_public": false
  }'
```

Read it back with pagination and filtering:

```bash
curl "http://localhost:5000/api/document-templates?page=1&limit=20&framework=PMBOK%207" \
  -H "Authorization: Bearer $TOKEN"
```

## Advanced Usage

Create a template that opts into structured context injection and GKG retrieval:

```json
{
  "name": "Governance Review Pack",
  "framework": "Custom",
  "content": {
    "template": "# {{reviewTitle}}

{{executiveSummary}}

## Risks
{{riskSection}}"
  },
  "variables": [
    { "name": "reviewTitle", "type": "text", "required": true },
    { "name": "executiveSummary", "type": "text", "required": true },
    { "name": "riskSection", "type": "text", "required": true }
  ],
  "context_injection_config": {
    "enabled": true,
    "injection_strategy": "structured",
    "max_context_length": 4000,
    "context_priority": "high",
    "sources": [
      {
        "type": "project_data",
        "source_id": "project-core",
        "source_name": "Project Core",
        "enabled": true
      },
      {
        "type": "document_history",
        "source_id": "recent-docs",
        "source_name": "Recent Documents",
        "enabled": true
      }
    ]
  },
  "gkg_context_strategy": {
    "profile": "governance_full",
    "scope": "same_project_top_docs",
    "maxDocuments": 5,
    "maxUnits": 60,
    "traceableOnly": true,
    "documentStatusFilter": "approved_published_only"
  }
}
```

## Common Pitfalls

<Callout type="warn">`content` is validated as an object in `server/src/modules/documentTemplates/validation.ts`, even though `DocumentGeneratorService` later accepts a string or an object containing a `template` property. If you send raw string content to the HTTP API, validation will fail before generation ever starts.</Callout>

<Callout type="warn">Soft deletion is blocked when documents still reference the template. `DocumentTemplateService.deleteTemplate` queries the `documents` table first and throws if the template is in use, so “cleanup” scripts should archive dependent documents first.</Callout>

<Callout type="warn">Template updates are owner- or admin-only. Reads are broader than writes by design, which means a user may be able to generate from a public template but still be denied when trying to edit or delete it.</Callout>

## Trade-offs

<Accordions>
<Accordion title="Public templates vs private templates">
Public templates improve reuse, but they also flatten local nuance. A public template can be consumed by any user who can read it, which is useful for standard operating documents and governance packs. The trade-off is that once many teams depend on it, seemingly small changes in variables or content structure become breaking changes for downstream generators. In practice, use a private template while iterating and clone it into a public template only after the variable contract is stable.
</Accordion>
<Accordion title="Rich AI metadata vs simple handlebars-only templates">
A bare template with `content` and `variables` is easy to reason about, easy to validate, and easy to diff in the database. Adding `system_prompt`, `prompt_build_up`, `template_paragraphs`, and `gkg_context_strategy` makes the template much more expressive, but it also moves more runtime behavior into configuration. That is powerful when the same template must drive retrieval and AI orchestration, yet it raises the cost of debugging because you now need to inspect both the generator and the template metadata. Use the richer fields when you want predictable behavior across many runs, not when you are still exploring document shape.
</Accordion>
</Accordions>
