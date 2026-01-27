# Changelog Update — Since October 2025

Append this block to your existing GitBook changelog after the **[2.0.0] - 2025-10-14** entry. All dates and versions follow the same format and categories (Added, Changed, Fixed, etc.) as your current changelog.

---

## [2.1.0] - 2026-01-14

### 🚀 Release: Source Document Traceability

Every AI-extracted entity can now be traced back to its source document with one-click navigation. Full coverage across all 23 entity types with automatic fallback.

### ✨ Added

#### **Source Document Traceability**
- **Full entity traceability**: Every extracted entity includes `source_document_id` linking to the original document
- **Click-through navigation**: "View Source Document" from entity detail pages (stakeholders, requirements, risks, milestones, etc.)
- **Automatic resolution**: AI-provided document titles resolve to document IDs via exact match, fuzzy match, or template-name fallback
- **Fallback protection**: Graceful fallback ensures 100% coverage even when AI omits source
- **Coverage**: All 23 entity types (stakeholders, requirements, risks, milestones, constraints, success criteria, best practices, phases, resources, technologies, quality standards, deliverables, scope items, activities, team agreements, development approaches, project iterations, work items, capacity plans, performance measurements, earned value metrics, opportunities, risk responses, performance actuals)
- **Database**: Migration 334 adds `source_document_id` to all entity tables; backfill script for existing data
- **Logging**: Resolution success, failures, and fallback usage logged

#### **Document title handling**
- **Null title handling**: `COALESCE` in SQL so documents always have a displayable title (template name or document ID fallback)
- **Fuzzy matching**: Handles title variations and special characters
- **Centralized helper**: `resolveSourceDocumentIdWithFallback()` used by all extraction methods

### 🔧 Changed

- **Extraction service**: All 23 extraction methods use centralized `resolveSourceDocumentIdWithFallback()`
- **Document query**: Improved handling of null titles and template names in document map/list building

### 📚 Documentation

- **Release notes**: `SOURCE_DOCUMENT_TRACEABILITY_RELEASE_NOTES.md`
- **What’s new**: `WHATS_NEW_v2.1.0.md`
- **Migration guide**: Step-by-step migration and troubleshooting in release notes

---

## [2.0.2] - 2025-12-02

### 🚀 Release: PMBOK 8 Weighted Allocation & Project Intelligence

ADPA now supports weighted entity allocation across PMBOK 8 Performance Domains, Knowledge Domains, and Project Phases, with corrected Knowledge Domain mappings and mitigation-plan validation fixes.

### ✨ Added

#### **Three-tier weighted entity allocation**
- **Performance Domains (Tier 1)**: Weighted counts per PMBOK 8 outcome domain; primary/secondary badges; validation that domain totals sum to total extracted entities
- **Knowledge Domains (Tier 2)**: Function-focused view; corrected entity-to-domain mapping (e.g. Governance now includes `development_approaches`, `phases`, `milestones`, `team_agreements`); coverage increased from 44 to 67 entity types (+52%)
- **Project Phases**: Weighted distribution across Initiating, Planning, Executing, Monitoring & Controlling, Closing; phase weights and primary/secondary badges
- **Shared weight matrices**: `ENTITY_DOMAIN_WEIGHTS` and `ENTITY_PHASE_WEIGHTS` in `types/entity-domain-weights.ts`; reusable across Performance, Knowledge, and Phase views
- **Validation cards**: Per-tab checks that weighted totals equal total extracted entities (e.g. 742.0)

#### **Knowledge Domain corrections**
- **Governance**: Added `development_approaches`, `phases`, `milestones`, `team_agreements` (was 0, now reflects governance-related entities)
- **Scope**: Added `scope_items`, `requirements`, `deliverables`, `phases`
- **Schedule**: Added `milestones`, `activities`, `phases`, `project_iterations`
- **Resources**: Added `resources`, `team_agreements`, `capacity_plans`
- **Risk**: Added `risks`, `opportunities`, `risk_responses`, `constraints`
- **Stakeholders Ops**: Added `stakeholders`
- **Backend**: `DOMAIN_ENTITY_MAP` in `queueService.ts` and `DOMAIN_METADATA` in `types/pmbok.ts` updated; frontend Knowledge Domains config aligned

#### **Template analytics (design)**
- **Document purpose**: Plan for `inferred_primary_domain` and `inferred_secondary_domains` on documents
- **Template entity profile**: Plan for `template_entity_profile` and `TemplateAnalyticsService` for coverage and primary/secondary domain assignment
- **Documentation**: `docs/analysis/knowledge-domains-entity-allocation-review.md`, `docs/implementation/THREE-TIER-WEIGHTED-ALLOCATION-COMPLETE.md`, `docs/implementation/template-analytics-plan.md`

### 🐛 Fixed

- **Mitigation plan update validation**: `PUT /mitigation-plans/:id` returned `400 VALIDATION_ERROR` when frontend sent `risk_id` and omitted `id` in body. Payload logic split: updates send `id` in body and no `risk_id`; creates send `risk_id`. Updates and creates now validate and save correctly (`MitigationPlanDialog.tsx`).

### 📚 Documentation

- **Analysis**: Knowledge Domain gaps and entity→domain mapping
- **Implementation**: Three-tier weighted allocation, testing checklist, PMBOK 8 / project coverage examples
- **Roadmap**: Template analytics and document-purpose plan

---

## [2.0.1] - 2025-11-03

### 🚀 Release: Quality Control Gate, Semantic Versioning & Template Optimization

Automated quality audits after every document generation, semantic versioning (PATCH/MINOR/MAJOR), and AI-powered template optimization with regression detection.

### ✨ Added

#### **Quality Control Gate**
- **Automatic quality audits**: After every document generation; AI analysis (e.g. Google Gemini Flash)
- **Six quality dimensions**: Completeness, Consistency, Professional Quality, Standards Compliance (PMBOK/BABOK/DMBOK), Accuracy, Context Relevance
- **Quality badge**: On documents list; clickable; opens detailed modal with scores, issues, recommendations
- **Template improvement analysis**: Triggered automatically when quality is below 90%
- **Services**: `qualityAuditService`, `templateOptimizationService`; API routes for audits and optimizations
- **UI**: `QualityAuditBadge`, `QualityAuditModal`, enhanced `TemplateRecommendations` with AI optimizations and side-by-side diff viewer
- **Database**: Migrations 310 (quality_audits), 311 (template_improvements)

#### **Semantic versioning (PATCH / MINOR / MAJOR)**
- **PATCH**: Manual content edit → e.g. v1.0.0 → v1.0.1 (verified)
- **MINOR**: AI regeneration with same template → e.g. v1.0.1 → v1.1.0 (designed; testing noted)
- **MAJOR**: Template change/update → e.g. v1.0.1 → v3.0.0 (verified)
- **In-place updates**: No duplicate documents; snapshots in `document_versions` before each update
- **PostgreSQL**: `calculate_next_document_version()`, `get_document_versions()`; migrations 313, 314
- **Version history**: Clean UI with change types and version badges

#### **Template optimization (AI-powered)**
- **Regression detection**: When quality drops (e.g. 89% → 80%), system detects and triggers template analysis
- **AI-generated improvements**: Improved system prompt and template content; explanation and predicted quality gain
- **Manual gate**: Admin reviews suggestion; "Apply to Template" updates template and increments `prompt_version`
- **UI**: Suggestion cards, side-by-side diff, explanation and change-summary tabs

#### **Infrastructure**
- **Redis/queue**: Job cancellation fixed for extraction/regeneration and related queues; cleanup for jobs stuck over 60 min
- **Scripts**: `cleanup-orphaned-regenerations`, `cleanup-stuck-jobs`

### 🐛 Fixed

- **Quality audit**: 500 from missing `project_members`; column mismatches (`d.type` → template name, `t.type` → `t.framework`); `parseFloat` for `analysis_cost`; auth checks (project_members → created_by/owner_id); UUID validation on SQL params
- **Versioning**: Manual edits not incrementing version; type/CAST issues in SQL; missing `uuidv4`; duplicate snapshots; template-version change not detected; parameter conflicts
- **Template/AI**: `systemPrompt` vs `prompt`; stripping markdown code blocks from AI JSON; Anthropic model override; automatic trigger for template analysis
- **Jobs/workers**: Cancellation and stuck-job cleanup for extraction/regeneration queues; WebSocket token validation loop

### 📚 Documentation

- **Roadmap**: `CLIENT_ONBOARDING_ASSESSMENT.md` (portfolio assessment / maturity benchmarking concept)

---

## [2.0.0-post] - 2025-11-02

### ✨ Added (post–2.0.0, November 2025)

#### **AI providers**
- **DeepSeek**: Models registered (chat, reasoner, coder); model discovery and connectivity tests passing; endpoint `https://api.deepseek.com/v1`; default `deepseek-chat`
- **Moonshot**: Models registered (kimi-k2, v1-8k, v1-32k, v1-128k); discovery and connectivity passing; endpoint `https://api.moonshot.ai/v1`; default `kimi-k2-0905-preview`
- **xAI (Grok)**: New provider; models (grok-beta, grok-vision-beta); discovery and connectivity configured
- **Groq**: Authentication updated; connectivity tests and models operational
- **Capacity**: Working providers and available models increased; parallel workers and orchestration documented

#### **Context & extraction (Oct–Nov 2025)**
- **RAG-first context**: Semantic search as primary method (e.g. 40% RAG, 30% approved baseline, 20% direct SQL, 10% external); context quality improved
- **Baseline integration**: `BaselineContextAnalyzer`; approved baselines in AI generation; drift detection kept as post-generation validation
- **AI data extraction**: 13+ entity types from documents (stakeholders, requirements, risks, milestones, constraints, success criteria, best practices, phases, resources, quality standards, deliverables, scope items, activities) populating PM tables and enriching RAG

### 📚 Documentation

- Session summaries: `SESSION_SUMMARY_2025-11-02_AI_PROVIDERS_COMPLETE.md`, `SESSION_SUMMARY_2025-10-29_RAG_AND_EXTRACTION.md`, `SESSION_SUMMARY_2025-11-03_QUALITY_GATE_COMPLETE.md`, `2025-12-02-weighted-allocation-and-template-analytics.md`

---

## Format reminder (unchanged)

- **Added**: New features  
- **Changed**: Changes in existing behaviour  
- **Deprecated**: Soon-to-be removed  
- **Removed**: Removed features  
- **Fixed**: Bug fixes  
- **Security**: Vulnerabilities  

**Versioning**: Major (X.0.0) = breaking/architectural; Minor (0.X.0) = new, non-breaking; Patch (0.0.X) = fixes and small improvements.

---

*Changelog update generated from ADPA repo docs and session summaries (Oct 2025–Jan 2026). For GitBook: paste the version blocks above after your existing [2.0.0] - 2025-10-14 entry.*
