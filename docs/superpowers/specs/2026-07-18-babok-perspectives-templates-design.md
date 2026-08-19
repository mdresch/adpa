# babok-perspectives-templates Design Spec

**Date**: 2026-07-18
**Status**: Approved
**Linear**: CBA-30 (Perspectives)
**Feature ID**: babok-perspectives-templates

---

## Problem

The "BABOK Guide Documentation" milestone tracks document types from the BABOK v3 body of knowledge that ADPA should support as generatable templates. CBA-30 ("Perspectives") covers BABOK v3's Perspectives chapter, which describes how business analysis work is tailored through five lenses: Agile, Business Intelligence, Information Technology, Business Architecture, and Business Process Management. ADPA's template system (`templates` table, seeded via `server/src/database/seed.ts`) has no BABOK templates yet — `"BABOK v3"` is already an accepted `framework` value in validation and in the templates UI, but no rows exist for it.

## Success Criteria

- [ ] Five new templates exist in the `templates` table, one per BABOK v3 perspective, framework `"BABOK v3"`, category `"Perspectives"`.
- [ ] Each template's `content.sections` covers the same 7 BABOK v3 Perspectives sub-topics, with matching `variables`.
- [ ] Seeding is idempotent (safe to re-run, matches existing TOGAF/SABSA pattern in `seed.ts`).
- [ ] Templates are visible via `GET /api/templates?framework=BABOK v3` and in the `app/templates` UI without any UI or validation code changes.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Add 5 idempotent `INSERT INTO templates` blocks to `server/src/database/seed.ts` (or a shared loop over a data array), one per perspective: Agile, Business Intelligence, Information Technology, Business Architecture, Business Process Management. | P0 |
| REQ-002 | Each template's `content.sections` uses one shared 7-section BABOK v3 schema: Change Scope, Business Analysis Approach, Business Analysis Information Management, Business Analysis Governance, Underlying Business Analysis Competencies (all required), Business Analysis Techniques, Impact on Business Analysis Knowledge Areas (both optional). | P0 |
| REQ-003 | Each template's `variables` array has one text variable per section (`change_scope`, `ba_approach`, `ba_information_management`, `ba_governance`, `underlying_competencies`, `ba_techniques`, `impact_on_knowledge_areas`), `required` matching the section. | P0 |
| REQ-004 | `framework: "BABOK v3"`, `category: "Perspectives"` on all 5 (category kept distinct from TOGAF's `"Business Architecture"` category so the "Business Architecture Perspective" template doesn't collide with it in list/filter views). | P0 |
| REQ-005 | Each template gets a distinct one-line `description` reflecting that perspective's BABOK v3 definition, `is_public: true`, `created_by: adminId`. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- Existing TOGAF/SABSA/Construction seed blocks in `seed.ts` — new code is additive, appended after the existing SABSA block, using the same idempotency-check-then-insert style.
- The templates CRUD API and `app/templates` UI — no changes to `validation.ts`, `routes/*templates*`, or `app/templates/page.tsx` are needed since `"BABOK v3"` is already a valid framework value in both.

## Risks

| Risk | Mitigation |
|------|------------|
| Re-running seed script duplicates rows | Follow existing pattern: `SELECT id FROM templates WHERE name = $1` idempotency check before each insert. |
| Category collision with existing "Business Architecture" (TOGAF) category confuses filtering | Use `"Perspectives"` as the category for all 5, not the perspective name. |
| Section wording drifts across the 5 templates if hand-written individually | Build sections/variables from one shared array-driven schema rather than 5 copy-pasted blocks. |

## Test Plan

| REQ | Verification |
|-----|--------------|
| REQ-001, REQ-004 | Run the seed script against local dev DB; confirm 5 new rows in `templates` via `SELECT name, framework, category FROM templates WHERE category = 'Perspectives'`. |
| REQ-002, REQ-003 | Inspect one seeded row's `content`/`variables` JSON to confirm all 7 sections present with matching variable names and required flags. |
| REQ-005 | `GET /api/templates?framework=BABOK v3` returns 5 templates with distinct descriptions; spot-check in `app/templates` UI. |
| Idempotency | Re-run seed script a second time; confirm no duplicate rows are created. |
