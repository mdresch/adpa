# Phase 1 – Foundation Deliverables (Week 1)

**Status:** Active  
**Scope:** Replace the skipped design-system/wireframe work with actionable IA deliverables for the PM Maturity Portal.  
**Focus Areas:** sitemap, navigation, content taxonomy, URL structure, search strategy, content strategy, AI document foundations.

---

## 1. Portal Sitemap & Navigation

### 1.1 High-Level Sitemap

```
/
├── projects
│   └── [projectId]/{dashboard,documents,stakeholders,tasks,baseline,drift,performance,settings}
├── programs
│   └── [programId]/{dashboard,projects,risks,reports,prioritize,settings}
├── portfolio/{overview,okrs,prioritize}
├── documents/{list,[documentId]/{view,metadata,entities,sign}}
├── templates/{list,builder,[templateId]/{view,edit}}
├── knowledge/{home,areas/[slug],maturity-levels/[level],templates}
├── assessment-portal/{dashboard,desired-state,gaps,roadmap}
├── onboarding/{upload,assessments,[assessmentId]}
├── ai/{overview,providers,analytics}
├── analytics
├── integrations/{confluence,github,sharepoint}
├── approvals
├── jobs
├── users
├── security
├── settings
└── search
```

### 1.2 Navigation Updates

| Area | Action | Notes |
|------|--------|-------|
| Sidebar | Add `Programs`, `Portfolio`, `Knowledge`, `Assessment Portal` | Reflects portal-first navigation |
| Secondary Nav | Standardize breadcrumbs (Home → Section → Entity → Sub-page) | Reuse `RouteProgress` component |
| Quick Links | Add header shortcuts to `Assessments`, `Knowledge`, `Templates` | Surface most-used content |

### 1.3 Public-Facing Onboarding & Assessment Entry Points

| Navigation Element | URL | Audience | Notes |
|--------------------|-----|----------|-------|
| Knowledge Hub | `/knowledge` | Public (no auth) | Landing with hero, featured maturity guides, CTA into assessment |
| Assessment Introduction | `/assessment-portal/overview` (new) | Public → Auth-required handoff | Explains value prop, embeds demo video, “Start Assessment” CTA |
| Onboarding Introduction | `/onboarding` | Public | Step-by-step walkthrough, security assurances, client logos |
| File Upload | `/onboarding/upload` | Authenticated | Supports drag-drop, templates download link, progress meter |
| Assessment Outcomes | `/assessment-portal/outcomes/[assessmentId]` | Authenticated shareable view | Read-only summary card set for clients; includes “Export PDF” |
| Assessment Recommendations | `/assessment-portal/recommendations/[assessmentId]` | Authenticated | Personalized roadmap + prioritised actions |
| Next-Step CTAs | Sticky footer + sidebar actions | Authenticated | “Book Strategy Session”, “Invite Team”, “Generate Roadmap”, “Export Results” |

**Implementation Notes**
- Header must expose `Knowledge`, `Assessments`, and `Onboarding` links even before login; secure content gates occur at page-level.
- Assessment share links use signed tokens to offer view-only access for stakeholders without full accounts.
- CTA telemetry recorded via `analytics_events` for funnel tracking (start → upload → outcomes → CTA click).

---

## 2. Content Taxonomy & Metadata

### 2.1 Primary Dimensions

| Dimension | Values | Applies To |
|-----------|--------|-----------|
| Framework | PMBOK, BABOK, DMBOK, PMBOK8, ITIL | Documents, templates, knowledge |
| Content Type | project, document, template, knowledge-entry, mdx-page | Global |
| Knowledge Area | 10 PMBOK areas | Knowledge, documents |
| Performance Domain | 8 PMBOK8 domains | Assessments, AI extraction |
| Maturity Level | 1-5 (CMMI-style) | Assessments, knowledge |
| Status | draft, review, published, archived | Documents, templates, MDX |

### 2.2 Metadata Requirements

- **Documents/Templates:** `framework`, `knowledge_area`, `performance_domain`, `maturity_level`, `status`.
- **Knowledge Entries/MDX:** frontmatter must include `area`, `level`, `framework`, `tags`, `related`.
- **Assessment Records:** store `current_level`, `desired_level`, `gap_vector` (per knowledge area), `domain_scores`.

---

## 3. URL Structure

### 3.1 Principles
1. Kebab-case, lowercase, human-readable.
2. Resource-first (`/projects/[id]/documents/[docId]`).
3. Shared actions (`/view`, `/edit`, `/sign`) reused across resources.
4. Namespaced advanced areas (`/assessment-portal/*`, `/knowledge/*`, `/ai/*`).

### 3.2 Key Patterns

| Resource | Pattern |
|----------|---------|
| Assessment Portal | `/assessment-portal/{dashboard|desired-state|gaps|roadmap}` |
| Knowledge | `/knowledge/{areas|maturity-levels|templates|search}` |
| AI | `/ai/{overview|providers|analytics}` |
| Documents | `/documents/[id]/{view|entities|sign}` and `/projects/[projectId]/documents/[docId]` |
| Templates | `/templates/[id]/{view|edit}` |

### 3.3 Redirect Plan
- `/ai-providers` → `/ai/providers`
- `/ai-analytics` → `/ai/analytics`
- `/process-flow` → `/workflows`
- Legacy `/demo-*` → `/demo/*`

---

## 4. Search Strategy (Execution Plan)

### 4.1 Phase 1 (Week 1-2)
- Add `search_vector` columns + GIN indexes (`documents`, `projects`, `templates`, `knowledge_base_entries`, `mdx_content`).
- Build `/api/search` endpoint with lexical search + filters (type, framework, maturity level, domain, tags).
- Wire `/app/search/page.tsx` to live API, add loading/error states, highlight matches.

### 4.2 Phase 2 (Week 3-4)
- Install pgvector, store embeddings for documents/templates/knowledge.
- Expose hybrid search flag on API (`strategy: 'lexical' | 'semantic' | 'hybrid'`).
- Add semantic relevance blend + result analytics (zero-result tracking, query logs).

### 4.3 Instrumentation
- Log query, filters, result count, latency, user id.
- Dashboards: top queries, zero-result queries, filter usage, latency p95.

---

## 5. Content Strategy (Execution Snapshot)

### 5.1 Prioritized Deliverables
1. **Maturity Level Guides (L1-L5)** – final outlines + publishing order.
2. **Knowledge Area Guides (10)** – consistent structure with templates & KPIs.
3. **Quick Start Guides (20)** – align with Assessments CTA (“Apply to my roadmap”).
4. **Template Packs (50+)** – frontmatter-enriched MDX and downloadable artifacts.

### 5.2 Production Workflow
- Weekly sprint delivering: 1 maturity/knowledge piece + 2 quick starts + 5 templates.
- Review gates: technical (framework accuracy), SEO, accessibility, tone/style.
- Publishing: MDX frontmatter validated, cross-links inserted, search indexed.

### 5.3 KPIs
- 5 Level guides + 10 knowledge guides live by Week 8.
- 20 quick starts + 50 templates by Week 12.
- ≥90% of content tagged with framework, knowledge area, maturity level.

---

## 6. AI Document Foundations

### 6.1 Scope
Establish consistent storage, traceability, and assessment integration for AI-generated documents.

### 6.2 Requirements
1. **Markdown Canonical Storage** – `documents.content` remains Markdown; store rendering metadata separately.
2. **Traceability** – `source_document_id`, `ai_provider`, `model`, `prompt_version`, `cost_estimate` captured per generation.
3. **Assessment Hooks** – each AI document run triggers entity extraction + knowledge/ domain scoring snapshot.
4. **Caching** – reuse AI responses when prompt hash + context identical; log cache hits for KPIs.
5. **Regeneration Audit** – version every AI output (`documents.version`) with diff metadata and reviewer notes.

### 6.3 Pipeline Outline
1. Upload/Generate → Normalize to Markdown → Persist (documents table).
2. Queue extraction job (Bull) → store entities in JSONB per domain.
3. Emit assessment event (`assessmentPortal.documentEvaluated`), update dashboard slices.
4. Push content metadata to search index + vector store.
5. Surface status in Assessment Portal (Document Quality Matrix & Gap cards).

### 6.4 Immediate Tasks
- Extend `documentGenerator` service to emit additional metadata fields.
- Update `ai_provider_usage` logging for document runs (provider, model, tokens, cache-hit, latency).
- Create migration for `documents_ai_metadata` (JSONB) capturing traceability info.

---

## 7. Next Steps & Owners

| Item | Owner | Target |
|------|-------|--------|
| Sidebar + breadcrumb updates | Frontend | Week 1 |
| Search backend (lexical) | Backend | Week 1-2 |
| Search UI integration | Frontend | Week 2 |
| Content metadata enforcement (MDX lint) | Docs tooling | Week 2 |
| AI document metadata migration | Backend | Week 2 |
| Assessment Portal data wiring (desired state, gaps) | Full-stack | Week 3 |

---

**References:**  
- `docs/sitemap-week1.md` (route deep dive)  
- `docs/information-architecture-week1.md` (taxonomy reference)  
- `docs/search-strategy-week1.md` (detailed search plan)  
- `docs/content-strategy-week1.md` (long-form content plan)


