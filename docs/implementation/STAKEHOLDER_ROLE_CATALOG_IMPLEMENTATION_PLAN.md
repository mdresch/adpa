# Stakeholder Role Catalog — Implementation Plan

Implements [ADR-001: Canonical Stakeholder Role Catalog Alongside Free-Text Capture](../07-architecture/ADR-001-stakeholder-role-catalog.md) (Option C). Six phases below map 1:1 to the ADR's Action Items 1–6.

This is a non-trivial backend change (new table, new FK, extraction-pipeline behavior change) — it must go through the [Governed Feature Loop](../../.agents/skills/adpa-governed-feature-loop/SKILL.md): Contract Guards (Jest tests) written before implementation, a `SKILL.md`, then registration in `server/governed-features.manifest.json`. Proposed packet:

```json
{
  "id": "stakeholder-role-catalog",
  "description": "Canonical stakeholder role catalog with nullable mapping from free-text roles",
  "skills": ["adpa-stakeholder-role-catalog"],
  "spec": "docs/07-architecture/ADR-001-stakeholder-role-catalog.md",
  "testPathPattern": "extraction/entities/stakeholders|stakeholderRoleCatalog"
}
```

Existing `server/src/database/seed-roles-from-stakeholders.ts` populates a **different**, pre-existing table (`project_roles`) used for internal staffing/rate-card purposes (seniority, hourly rate). It is not the catalog this plan introduces and should not be merged with it — `stakeholder_role_catalog` is a governance/PMBOK role classification, not a billing construct. Note the distinction in the new `SKILL.md` so future agents don't conflate the two.

---

## Phase 0 (Action Item 1): Fix the "Prepared By" extraction leak

**Objective**: Stop document-metadata bylines ("Prepared By", "Prepared By (Business Case Author)") from being captured as stakeholder rows.

**Root cause**: `server/src/services/extraction/entities/stakeholders/extractStakeholders.ts:114-122` — the extraction prompt's `requirements` array tells the model to include "ALL stakeholders mentioned" but never tells it to exclude document metadata/byline fields, so a "Prepared By: Jane Doe" line in a document header gets extracted as a stakeholder named "Jane Doe" with role "Prepared By".

**Tasks**:
1. **Contract guard first**: add a test in `server/src/__tests__/extraction/stakeholders.parity.test.ts` (or a new `stakeholders.metadata-leak.test.ts` alongside it) asserting that a fixture document containing a "Prepared By: <name>" / "Prepared By (Business Case Author): <name>" line does not produce a stakeholder row for that name/role.
2. **Prompt fix**: add an explicit negative requirement to the `requirements` array in `extractStakeholders.ts` (~line 114), e.g. `'EXCLUDE document metadata fields such as "Prepared By", "Author", "Document Owner", "Version History" — these are byline/metadata, not stakeholders'`.
3. **Deterministic safety net**: prompt-only instructions aren't reliable (this leak already happened once). Add a post-parse filter in `extractStakeholders.ts` after `parseAIResponse` (~line 143) that drops any raw stakeholder whose `role` matches `/^prepared\s+by\b/i` or whose `name`/`role` matches a small denylist of metadata-field labels (`author`, `document owner`, `version history`, `reviewed by`). Log rejections at `logger.warn` with the count, similar to the existing `rejectedCount` pattern used for source-resolution failures.
4. Run the governed-features suite for this packet plus the existing parity test to confirm no regression: `cd server && npx jest --testPathPattern="extraction/entities/stakeholders|stakeholders.parity" --no-coverage`.

---

## Phase 1 (Action Item 2): Retire or rebuild `stakeholder_category` / `engagement_approach`

**Objective**: Stop carrying two columns that read as per-row analysis but are actually untouched schema defaults.

**Current state confirmed**: `server/src/services/extraction/entities/stakeholders/saveStakeholders.ts` INSERT statement (lines 202-219) never writes `stakeholder_category` or `engagement_approach` — every row silently gets the column defaults (`'primary'`, `'keep_informed'`) from `server/migrations/000_baseline.sql:7238,7235`. This matches the ADR finding exactly (99.8%/one-value fields).

**Decision needed before implementing** (flag to the ADR owner, don't decide unilaterally in code): rebuild these fields from `influence_level`/`interest_level` using a standard power/interest grid (e.g. high influence + high interest → `manage_closely`; high influence + low interest → `keep_satisfied`; low influence + high interest → `keep_informed`; low influence + low interest → `monitor`), or drop the columns.

**Tasks (rebuild path, recommended)**:
1. Add a pure function `deriveEngagementApproach(influenceLevel, interestLevel)` in `saveStakeholders.ts` implementing the grid above; unit test all four quadrants plus the existing `'medium'` default cases.
2. Wire it into the INSERT (add `engagement_approach` as a computed value instead of relying on the column default); leave `stakeholder_category` for a follow-up unless a similarly principled derivation exists (don't invent one just to fill the column).
3. **Tasks (drop path, if chosen instead)**: add a new migration (`server/migrations/431_...sql` or the next free number after whatever Phase 2 claims) with `ALTER TABLE stakeholders DROP COLUMN stakeholder_category, DROP COLUMN engagement_approach` — this is destructive and touches a table with 6,045 rows across 164 projects, so it needs explicit user sign-off before running against any real environment, and any code in `server/src/routes/stakeholders.ts` / `server/src/routes/context-injection.ts` / `server/src/services/processFlowService.ts` (the three call sites found referencing these fields) must be updated first.

---

## Phase 2 (Action Items 3–4): Schema — `stakeholder_role_catalog` + `canonical_role_id`

**Objective**: Add the catalog table and the nullable mapping FK without touching `stakeholders.role` (kept as-is; it plays the "raw_role" role the ADR describes — no column rename, to avoid a blast-radius rename across ~15 files that reference `stakeholders.role`).

**New migration**: `server/migrations/431_stakeholder_role_catalog.sql` (next free number after `430_add_portfolio_prioritization_tables.sql`).

```sql
-- Table: stakeholder_role_catalog
CREATE TABLE IF NOT EXISTS public.stakeholder_role_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name varchar(100) NOT NULL UNIQUE,
  functional_family varchar(50) NOT NULL, -- governance | technical | qa | vendor_procurement | business | executive | ...
  default_influence_level varchar(20) DEFAULT 'medium',
  default_interest_level varchar(20) DEFAULT 'medium',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS canonical_role_id uuid REFERENCES public.stakeholder_role_catalog(id),
  ADD COLUMN IF NOT EXISTS role_mapping_confidence numeric(3,2); -- null = unmapped; 0.00-1.00 = fuzzy match score for review triage

CREATE INDEX IF NOT EXISTS idx_stakeholders_canonical_role_id ON public.stakeholders(canonical_role_id);
```

`role_mapping_confidence` is the mechanism Phase 3's "flag low-confidence matches for manual review" needs — without it there's no way to distinguish an exact match from a fuzzy one after the fact.

**Seed data** (Action Item 3's recurring core, one row per catalog entry): Project Manager, Project Sponsor, Business Sponsor, Executive Sponsor, End Users, Vendor, Technical Lead, Business Analyst, Compliance Officer, Steering Committee, Change Control Board, Approval Authority, Governance Body — each with a `functional_family` tag. Seed via a `INSERT ... ON CONFLICT (canonical_name) DO NOTHING` block in the same migration, so the list can grow via later migrations without touching this one (per the "don't touch historical migrations" rule).

**Tasks**:
1. Write the migration above; run `pnpm migrate` locally against a dev DB.
2. Add `StakeholderRoleCatalog` TypeScript type + a thin repository (`server/src/services/extraction/entities/stakeholders/roleCatalogRepository.ts`) with `listActive()` and `findByCanonicalName()`.
3. Contract guard: a test asserting the migration creates the table/column/index and that seed rows exist with the expected `functional_family` values.

---

## Phase 3 (Action Item 5): Backfill existing rows

**Objective**: Populate `canonical_role_id` for the 6,045 existing rows without auto-mapping low-confidence guesses.

**Tasks**:
1. New script `server/src/database/backfill-stakeholder-canonical-roles.ts` (pattern after `seed-roles-from-stakeholders.ts`'s connect/query/loop structure, but writing `canonical_role_id` + `role_mapping_confidence` instead of inserting into `project_roles`).
2. Matching strategy, in order:
   - Exact case-insensitive match of `role` to `stakeholder_role_catalog.canonical_name` → confidence `1.00`.
   - Normalized match (strip trailing punctuation, singular/plural fold, e.g. "Vendors" → "Vendor") → confidence `0.8`–`0.95`.
   - No match → leave `canonical_role_id` NULL, `role_mapping_confidence` NULL. Do not fuzzy-match past this point (ADR is explicit: "flag low-confidence matches for manual review rather than auto-mapping them").
3. Emit a summary report (counts by confidence bucket, and the full list of unmapped distinct `role` strings with their project counts) so the catalog owner can triage — this doubles as the first real "which roles recur but aren't yet cataloged" report, i.e. a natural first deliverable of this whole effort.
4. Run once against dev, review the unmapped list with the ADR owner before running in any shared environment (this writes to 6,045 rows — treat as a data migration requiring sign-off, not a routine script run).

---

## Phase 4 (Action Item 6): Batch-injection anomaly check

**Objective**: Catch a canonical role (or new raw string) being assigned across many projects within a narrow time window at write time, not months later via a manual timestamp audit — this is the exact check that would have caught the "Senior Strategic Business Architect" / "Senior Project Management Consultant" artifacts from the audit.

**Tasks**:
1. Add a query-based check (nightly job, following the existing Bull job patterns in `server/src/jobs/`) rather than a synchronous write-time trigger, since the signal ("same role across N projects within M days") is inherently a batch/aggregate property, not evaluable on a single insert:
   ```sql
   SELECT canonical_role_id, role, COUNT(DISTINCT project_id) AS project_count,
          MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
   FROM stakeholders
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY canonical_role_id, role
   HAVING COUNT(DISTINCT project_id) > <threshold>
   ```
2. Pick `<threshold>` conservatively to start (e.g. 10 projects in 7 days) and make it configurable; false positives here are cheap (a human glances and dismisses), false negatives recreate the exact problem this phase exists to prevent.
3. Surface results the same way other governance anomalies surface in this codebase (check `server/src/services/driftResolutionService.ts` / `entityAuditService` for the existing convention) rather than inventing a new notification channel.
4. Contract guard: seed a fixture with one role appearing across 12 projects within a 3-day window and assert the check flags it; assert a role appearing across 12 projects spread over 6 months does not.

---

## Sequencing note

Phases 0 and 1 should land before Phase 3's backfill, per the ADR's explicit ordering ("Backfill existing rows... should not be done before they're addressed" — referring to the metadata-leak bug and the category/engagement rebuild). Phase 2 (schema) can land independently at any point since it's additive. Phase 4 depends on Phase 2's `canonical_role_id` existing but not on the backfill being complete.
