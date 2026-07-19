# ADR 001: Canonical Stakeholder Role Catalog Alongside Free-Text Capture

## 1. Status
**Proposed (2026-07-05)**

Deciders: Owner(s) of the stakeholder extraction pipeline / schema

## 2. Context
An audit of the `stakeholders` table (164 of 197 projects, 6,045 rows, 98.5% AI-extracted rather than manually entered) was meant to answer a straightforward question: which stakeholder roles genuinely recur, which are one-off, and which of the recurring ones actually matter. Instead it surfaced a set of findings that don't cohere into a publishable insight about stakeholders — they're mostly artifacts of how the data is captured, not signal about stakeholders themselves. That's the reason to shelve external write-ups and turn the exercise into lessons learned.

Five things showed up, and all five trace back to one root cause: `role` is unconstrained free text with no controlled vocabulary.

1. That produced 3,572 distinct raw strings ("Vendor" / "Vendors" / "Vendor Management" counted separately), 88% of them (3,138) appearing in exactly one project, accounting for 56% of all rows.
2. `stakeholder_category` and `engagement_approach` exist as if they carry per-row power/interest analysis, but 6,044 of 6,045 rows are "primary" and 99.8% are "keep_informed" — two of the four standard engagement values never appear at all. This looks like an AI-extraction default being copied forward, not real analysis.
3. Recurrence doesn't track importance. "End Users" is the third-most-recurring title (63 of 164 projects) but has the lowest average influence score of any frequent role (1.71/3); "Vendor" shows the same pattern. Meanwhile Project Sponsor, Steering Committee, Change Control Board, and Approval Authority are both frequent and consistently rated maximally influential. A frequency count alone can't tell the two apart.
4. Two titles that looked like organically recurring roles ("Senior Strategic Business Architect," 23 projects; "Senior Project Management Consultant," 15 projects) turned out to cluster on the same 7 calendar days — a batch-generation artifact, not independent recurrence. The same issue exists one level up: 54% of all 197 projects were created in a single calendar month, so any before/after comparison built on that timeline is comparing one large batch to whatever else happened, not measuring a real trend.
5. "Prepared By" and "Prepared By (Business Case Author)" — document metadata, i.e. the author byline — leak into the stakeholder role field. That's a pipeline bug, not a modeling question.

None of this is really about stakeholders. It's about a role field with no controlled vocabulary and no link between a raw string and a canonical concept, feeding categorical fields that were never actually populated with per-row reasoning.

## 3. Decision
Introduce a canonical role catalog that sits alongside the existing free-text field rather than replacing it, connected by a nullable mapping layer.

- **Keep `raw_role` exactly as captured.** This is the only place genuinely novel, project-specific expertise gets preserved ("FedRAMP-Certified SaaS Vendor," "ML Engineer," "ESG Team," "Serverless PostgreSQL database and authentication provider"). Forcing that into a fixed list would destroy the one part of this data that's actually informative about what a project is building or regulated by.
- **Add a `stakeholder_role_catalog` reference table** — a small, curated list of standardized roles (Project Manager, Project Sponsor, Steering Committee, End Users, Vendor, Technical Lead, Business Analyst, Compliance Officer, Change Control Board, Approval Authority, Business Sponsor, etc.), each tagged with a functional family (governance, technical, QA, vendor/procurement, etc.) and a default influence/interest baseline.
- **Add a mapping layer** — a nullable `canonical_role_id` on each stakeholder row, populated only when a raw string genuinely matches a catalog entry. Unmapped is a legitimate, visible state — not something to force through fuzzy matching. This is also what would have caught the batch-injection artifacts: a canonical role suddenly appearing dozens of times in a 7-day window is a visible anomaly at write time, rather than something an auditor finds months later by cross-referencing timestamps.

## 4. Options Considered

### Option A: Leave the role field as free text, no catalog

| Dimension | Assessment |
|---|---|
| Complexity | None — no change |
| Cost | Low upfront, high recurring — every future analysis re-does the same keyword/regex rollup |
| Consistency | Stays exactly as fragmented as today |
| Preserves specificity | Yes, fully |

Pros: No engineering effort, no risk of breaking existing extraction. Cons: Every future "which roles recur" question requires the same manual dedup work; batch-injection artifacts stay invisible until someone happens to audit timestamps.

### Option B: Convert role into a strict enum

| Dimension | Assessment |
|---|---|
| Complexity | Medium — requires migration and extraction-prompt changes |
| Cost | Ongoing — enum needs a schema migration every time a new domain-specific role shows up |
| Consistency | High, but at a cost |
| Preserves specificity | No — this is the real problem |

Pros: Clean, fully structured queries. Cons: Forces genuinely one-off, project-specific expertise (which is the actually valuable "what is this project building/regulated by" signal) into a generic bucket, or rejects it. Enums are brittle against a long tail that's supposed to be long.

### Option C (Recommended): Free text + canonical catalog + nullable mapping

| Dimension | Assessment |
|---|---|
| Complexity | Medium — one new table, one FK, a lightweight triage step |
| Cost | Moderate upfront (seed the catalog, backfill mapping), low recurring |
| Consistency | High for the recurring core, unaffected for the long tail |
| Preserves specificity | Yes — raw text untouched |

Pros: Recurrence/importance questions become a join instead of a regex exercise; new batch-injected content is visible as an anomaly, not a retroactive discovery; the long tail of genuine domain expertise is preserved rather than squeezed into a fixed list. Cons: Needs an owner to curate the catalog and adjudicate ambiguous mappings; doesn't fix anything by itself until backfilled.

### Trade-off analysis
The real trade-off is between forcing consistency (Option B) and preserving the signal that makes this data useful in the first place (the long tail is domain/product expertise, not noise — see finding 1 above: 88% of distinct role strings are singletons and read like "what this project is building," not "how it's governed"). Option C accepts a small amount of ongoing curation work in exchange for keeping both signals intact and legible separately, instead of collapsing them into one field that can't distinguish "PMBOK-standard support role" from "project-specific technical stakeholder."

## 5. Consequences

### Positive
- Recurring-role analysis stops depending on ad hoc keyword rollups — a join against `stakeholder_role_catalog` answers "which roles recur" directly.
- Newly captured roles that don't map to the catalog stay visible as unmapped, which turns "is this a new legitimate role or a batch-injection artifact" into a triage decision made close to ingestion time, rather than something discovered during a retrospective audit.

### Negative
- The catalog needs an owner and a light review cadence, since it will drift if left alone.
- Existing rows will need a backfill pass to populate `canonical_role_id`, which surfaces the two independent bugs below and should not be done before they're addressed.

## 6. Action Items
1. Fix the "Prepared By" / "Prepared By (Business Case Author)" leak — exclude document-metadata/byline fields from the stakeholder-role extraction step. This is a straightforward parser bug, independent of the catalog work.
2. Retire or rebuild `stakeholder_category` and `engagement_approach`. Either wire extraction to genuinely reason about power/interest per stakeholder (using `influence_level`/`interest_level`, which already vary meaningfully, as the source of truth) or drop the two fields until that logic exists — a field that's 99.8% one value is worse than no field.
3. Seed `stakeholder_role_catalog` from the roles already identified as the recurring core: Project Manager, Project Sponsor, Business Sponsor, Executive Sponsor, End Users, Vendor, Technical Lead, Business Analyst, Compliance Officer, Steering Committee, Change Control Board, Approval Authority, Governance Body, plus the 15 functional families as the family/tag dimension.
4. Add the nullable `canonical_role_id` FK and mapping logic; leave `raw_role` untouched.
5. Backfill existing 6,045 rows against the catalog; flag low-confidence matches for manual review rather than auto-mapping them.
6. Add a simple write-time or nightly check: alert if a canonical role (or a new raw string) is assigned across many projects within a narrow time window — this is the check that would have caught the batch-injection artifacts directly instead of requiring a manual timestamp audit.

## 7. References
- Table audited: `stakeholders` (`server/migrations/000_baseline.sql`)

## 8. Note on the earlier LinkedIn drafts
The two LinkedIn drafts from the earlier analysis session are still saved in the outputs folder but not part of this plan — flag if you'd like them removed, otherwise they're just sitting there unused.
