---
title: "Search Strategy & MDX Frontmatter Spec"
labels: ["phase:1","week:1","area:content","type:task","priority:medium"]
assignees: []
---

# Search Strategy & MDX Frontmatter Spec

**Context**

Define the search strategy (lexical + semantic), necessary metadata, and the MDX frontmatter spec that content authors will use.

## Goals

- Produce a frontmatter schema for content files (title, slug, area, level, readingTime, tags, related, seo).
- Recommend a search approach (initial: Postgres full-text + optional vector embeddings for RAG later).

## Acceptance Criteria

- `docs/mdx-frontmatter-spec.md` created with examples and required fields.
- `docs/search-strategy-week1.md` created providing initial search architecture and next steps for semantic search.

## Tasks

- [ ] Draft frontmatter fields and validation rules
- [ ] Draft search strategy (indexes, tsvector, optional embedding plan)
- [ ] Provide example MDX file with frontmatter and sample content

## Estimate

Owner role: Content Architect / Backend Specialist
Estimate: 6 - 8 hours
