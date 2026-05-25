# Lessons learned — OpenUI / GenUI implementation kickoff

**Project:** ADPA — Implementation of OpenUI and Auto UI Generation  
**Window:** May 1–31, 2026 (per charter / Schedule Management Plan)  
**Captured:** 2026-05-21  
**Status:** Living document for ACT-CLS-001 and future kickoffs

---

## 1. Requirements & kickoff — avoid vague deliverable nouns

### Lesson

Terms such as **engine**, **platform**, **integration**, and **automation** let planning, duration estimates, DRACO governance, and implementation each assume a different scope. By the time the **document GenUI pipeline** was working in production-like dev, planning artifacts could still read as if core development had not started.

### Rule for future kickoffs

For every named deliverable, require **observable outcomes** in the same sentence — not a metaphor.

| Instead of | Specify |
|------------|---------|
| Auto UI **generation engine** | **Document GenUI pipeline:** source markdown → layout plan → OpenUI Lang → rendered report at `/projects/{id}/documents/genui?docId=…` |
| **Integration** with Thesys/OpenUI | **Component grammar:** `projectOpenUILibrary` + executor rules; list routes/APIs (`POST /api/chat`, etc.) |
| **LLM hook** | Provider env (`GENUI_LLM_PROVIDER`, `MISTRAL_*`), thread + `enrichOpenUIApiMessages` |
| **Complete** | Checklist: demo path, tests, deploy target, and explicit **deferred** items (e.g. Step 3 publish) |

**Retro one-liner:** *If we cannot demo it in one sentence, we do not name it in the charter.*

### Recommended WBS split (replacing a single “DEV-002 engine” row)

| ID | Name | Intent |
|----|------|--------|
| **DEV-002a** | Layout plan + Lang generation + render loop | **Complete (foundation)** — repeatable auto-UI path |
| **DEV-002b** | Hardening, exports, provider tuning, template breadth | **In progress** |
| **DEV-002c** | Published presentation snapshots (Step 3) | **Deferred** — see `docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md` |

---

## 2. Definition — what “Auto UI generation engine” means in ADPA

### Layer A — Engine (delivered at foundation tier)

An **auto UI generation engine** in ADPA is a **repeatable pipeline**:

1. **Input** — Source text + user intent (document body, prompt, optional thread).
2. **Plan** — Heuristic/deterministic mapping to a component graph (`buildLayoutPlan`, segments, shells, focused follow-ups).
3. **Generate** — LLM emits **OpenUI Lang** under executor rules + `projectOpenUIPromptLibrary`.
4. **Render** — Client executes Lang → interactive UI (`CustomAssistantMessage` + `projectOpenUILibrary`, GenUI report surface).
5. **Refine** — Follow-up turns (e.g. gantt/timeline from an existing report) without re-chartering the full document.

**Acceptance criteria (Layer A):**

- UI produced without hand-authored React per report (Lang + renderer).
- Grounded in project/document source (`doc.content` + layout plan).
- Repeatable across prompts and governance documents (document-agnostic `docId`).
- Iteration via thread + focused planner paths (`wantsGenuiFocusedDetailRender`).
- Traceable rules (layout plan + executor rules + `repairGenuiExecutorLang`), not unconstrained prose.

### Layer B — Program completion (not required to claim “engine exists”)

- Thesys/vendor edge cases and every template variant.
- **Step 3** immutable publish + blob artifacts (design reserve only).
- Production deploy, full UAT, formal closure (ACT-DEP / ACT-CLS).
- DRACO PASS on every generated report.

**Schedule implication:** ~35 expected person-days in a ~22 working-day month only works with parallelism. With foundation in place, **31 May** is realistic for **MVP / demo-ready GenUI** if scope is Layer A + agreed polish; it is tight if every ACT row including UAT/closure must be 100% done.

---

## 3. DRACO / council review — grade the right artifact

DRACO reviews **documents**, not the running app. Adjust expectations by document type:

| Document type | Board should judge |
|---------------|-------------------|
| Planning (duration estimates, SMP) | Internal consistency; scope clarity — not proof of production deploy |
| Implementation status / attestation | ACT-ID → observable capabilities; Complete / In progress / Deferred |
| Generated GenUI report | Evidence, governance tone, no invented dates — not “is DEV-002 done?” |

**Governance footnote for attestation docs:**

> **Auto UI generation engine (delivered):** ADPA pipeline from governance document text → layout plan → OpenUI Lang → rendered interactive report (GenUI workspace), with LLM hook and component library integration.  
> **Out of scope for “engine delivered”:** presentation publish (Step 3), all templates, production sign-off.

---

## 4. Implementation tweaks delivered (this effort)

| Area | Change | Files / notes |
|------|--------|----------------|
| **Plain text export** | Use `getLatestGenuiReportRenderElement()` so export works when `.genui-report-toolbar` follows `.genui-lang-render` (fixes false “Render a report first”) | `components/genui/GenuiReportExportBar.tsx`, `lib/genui/reportExport.ts`, `lib/genui/presentationSnapshot.ts`, `__tests__/lib/genuiReportExport.test.ts` |
| **Double “Render document”** | Consume prompt before `processMessage`; `consumedPromptRef` guard; stable `clearPendingRenderPrompt` | `components/genui/GenuiPromptBridge.tsx`, `app/projects/[id]/documents/genui/page.tsx` |
| **GenUI LLM provider** | Document Mistral in `.env.local.example`; local override must use `GENUI_LLM_PROVIDER=mistral` (root `.env` alone is insufficient if `.env.local` sets `google`) | `.env.local.example`, `lib/llm/genuiLlmProvider.ts` |
| **Report surface & exports** | Report-first toolbar, export bar (PDF/Word/HTML/plain text), Step 3 draft types (flag-gated) | `components/genui/*`, `lib/genui/reportExportPrepare.ts`, `lib/genui/presentationSnapshot.ts` |
| **Layout / follow-ups** | Focused renders from prior report; layout plan tests | `lib/openui/layoutPlan.ts`, `__tests__/lib/layoutPlan.test.ts` |
| **Docs & skills** | GenUI workspace skill, codedoc, Step 3 design reserve, AGENTS.md pointer | `.agents/skills/adpa-genui-workspace/SKILL.md`, `docs/codedocs/genui-workspace.md`, `docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md` |

---

## 5. Copy-paste — charter / closure bullet list

Use in **Lessons learned** section of project closure or next charter appendix:

1. **Define deliverables by demo path and acceptance criteria**, not by nouns like “engine.”
2. **Split DEV-002** into core pipeline (done), hardening (in progress), and Step 3 publish (deferred).
3. **Align DRACO inputs** — run governance on **implementation status** docs that reference Layer A criteria, not only duration tables with outdated status.
4. **Environment:** GenUI provider is controlled by `.env.local` `GENUI_LLM_PROVIDER`; document in onboarding checklist.
5. **Exports:** Report DOM structure must share one “latest render” helper across PDF, Word, HTML, and plain text.

---

## 6. PMP template v2.1 (signature artifact)

Integrated **Project Management Plan** generation uses `docs/templates/PMP_8TH_EDITION_REVISED.md` **v2.1**. Regenerating a PMP should yield:

- Document Control + Executive Summary up front
- **§5 always present** (ESG stub when `ESG Applicability: No`)
- Subsidiary plan index at §4; no duplicate CCB/stakeholder/risk tables
- Real names in CCB and §10.4 sign-off (no `[Name]` placeholders)
- Human PM only in Revision History (not "AI Agent")

Quality audits for `project-management-plan` enforce the same checklist in `qualityAuditService.ts`.

---

## 7. Component catalog utilization (next hardening)

The merged OpenUI library exposes **61** Lang components; the layout planner currently assigns only a **fraction**, with heavy use of `TextContent` + `Table`. Treat catalog coverage as a deliverable:

- **Audit checklist** — every component marked P0 (planner) through P4 (primitive); see `docs/implementation/GENUI_COMPONENT_CATALOG_AUDIT.md`.
- **Visual equivalence** — same source facts may render as Table, Carousel, Bullets, Comparison, etc.; **first** tabular segment → Table (unless user locks tables); **2nd/3rd** → rotate per family when text allows (e.g. Carousel for 3–8 card-like rows).
- **Edge cases** — validate against standard governance doc types (charter, SMP, WBS, risk register) listed in the audit doc.
- **Do not rotate** pipe markdown tables, WBS/attribute registers, or when the user requests tabular output.

---

## References

- PMP template: `docs/templates/PMP_8TH_EDITION_REVISED.md` (v2.1)

- GenUI workspace skill: `.agents/skills/adpa-genui-workspace/SKILL.md`
- Human codedoc: `docs/codedocs/genui-workspace.md`
- Component catalog audit: `docs/implementation/GENUI_COMPONENT_CATALOG_AUDIT.md`
- Step 3 design reserve: `docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md`
- DRACO overview: `docs/07-architecture/ADR-004-DRACO-AI-GOVERNANCE.md`
