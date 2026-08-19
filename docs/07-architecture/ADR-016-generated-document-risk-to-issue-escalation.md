# ADR 016: Generated-Document Risk Detection → Risk Register → Issue Escalation → Remediation Playbooks

## 1. Status
**Proposed (2026-07-20)**

Deciders: Owners of `server/src/services/extraction/` (inline entity extraction), `server/src/modules/execution/` (Risk Register), `server/src/modules/issuesLog/` and `server/src/services/issueService.ts` (Issues), `server/src/services/playbookService.ts` (Playbooks/execution).

## 2. Context

### 2.1 The problem
Generated documents already surface risks inline (H8 tagging — see §2.2), and this repo already has a working Risk Register, a working mitigation-plan tracker, a working playbook-execution engine, and a working risk-to-issue materialization function. The problem is not that any of this is missing — it's that these pieces were built at different times, in different modules, and do not call each other. A risk detected in a generated document today can sit in the Risk Register indefinitely with no severity-driven trigger to escalate it, and if it does get escalated to an Issue, that Issue is not automatically matched against a remediation Playbook — even though the code to do exactly that already exists, one module away. Verified against the current codebase (§2.3), not assumed.

### 2.2 What already exists and works (verified)
- **H8 inline entity tagging** — the live mechanism for turning generated-document prose into structured entities is eight hash symbols (`########ENTITY_TYPE: {json}`), documented in `server/src/services/inlineEntityExtractionPrompt.ts` and parsed by `server/src/modules/knowledge-graph/InlineH8Parser.ts` / `server/src/services/inlineEntityParserService.ts`. Both `risks` and `issue_log` are registered H8 entity types with their own extract/save modules under `server/src/services/extraction/entities/{risks,issue_log}/`, registered in `server/src/services/extraction/ExtractionRegistry.ts:214-219` (`risks`) and `:613-618` (`issue_log`).
- **Risk Register** — `risks` is a single, unified, project-scoped table (`saveRisks.ts` upserts on `(project_id, name)` with an idempotency key). It is a real register, not just a table: `GET /risks/registry` (`server/src/modules/execution/routes.ts:44-47` → `RiskController.getRegistry` → `RiskRepository.findRegistry`) is backed by the `risk_registry` view (`server/migrations/000_baseline.sql:14838`), which already joins `mitigation_plans` (plan counts, completion %) and `issues` (related/active issue counts). A real UI page consumes it: `app/risks/page.tsx:217`.
- **Mitigation plans** — `mitigationPlanService.ts` is full CRUD with completion tracking, has its own UI (`MitigationPlanList`, `MitigationPlanDialog`, etc., integrated into `ProgramRisksTab`), and is genuinely joined into `risk_registry`.
- **Playbook execution** — `operational_playbooks` / `playbook_executions` / `playbook_scenarios` / `playbook_response_steps` / `playbook_step_executions` (`000_baseline.sql:3697-3999`) are backed by `playbookService.ts`, `server/src/modules/execution/{PlaybookController,PlaybookRepository}.ts`, a UI at `app/(dashboard)/playbooks/page.tsx`, and integration tests (`playbook-execution.test.ts`, `resolution-workflow.test.ts`). `playbookService.findMatchingPlaybooks()` (`playbookService.ts:696`) already scores playbooks by `risk_category`, `severity_level`, and `priority_level` against `operational_playbooks.applicable_*` array columns — this is the matching engine the "required details to remediate" part of this ADR needs, and it already works.
- **Risk → Issue materialization** — `createIssueFromRisk(riskId, userId)` (`server/src/modules/issuesLog/issuesService.ts:429-474`) fetches a `risks` row, creates an `issues` row with `related_risk_id` set, and flips the source risk to `status = 'materialized'`. It is exposed at `POST /api/issues/from-risk/:riskId` (`server/src/modules/issuesLog/routes.ts:205-210`).
- **Issue → Playbook recommendation** — a second, separate function, `getResolutionRecommendations`-equivalent in `server/src/services/issueService.ts:1140-1178`, reads an `issues` row's `category`/`priority` and calls the same `playbookService.findMatchingPlaybooks()`. `issueService.ts` also carries `playbook_execution_id` end-to-end (field defs, INSERT, UPDATE, and a stats query counting `issues_with_playbooks` at `:1196`).
- **Proven pattern for threshold-driven escalation** — `server/src/services/escalationService.ts` already does exactly this shape of work for a different domain (baseline drift, not risk): an in-code `EscalationRule` matrix (`drift_type`, `threshold_min/max`, `severity_level` → `escalate_to`, `deadline_hours`, `auto_create_cr`) evaluated against live data, with `recommendedPlaybooks` attached via the same `findMatchingPlaybooks()` call (`escalationService.ts:98`, `:996`). This is a proven, working precedent for "rule matrix in code, not a database-driven policy engine" — see §4, Option D.

### 2.3 The gap — three fragmentation points (verified, not assumed)
1. **Two issue-writing service modules share one `issues` table and don't call each other.** `server/src/services/issueService.ts` and `server/src/modules/issuesLog/issuesService.ts` both read/write `issues` independently (confirmed: both contain `INSERT INTO issues`/`SELECT ... FROM issues` against the same table). Playbook matching (`findMatchingPlaybooks`) exists only in `issueService.ts`. Risk materialization (`createIssueFromRisk`) exists only in `issuesLog/issuesService.ts`, and builds the issue through its own local `createIssue`, never touching `issueService.ts`. Net effect: **a risk that gets materialized into an issue today never gets a playbook match**, even though the exact function to do that (`findMatchingPlaybooks`) is one import away.
2. **`issue_log` is a third, disconnected surface.** Issues an LLM tags inline in generated-document prose (H8 `issue_log`) persist to the `issue_log` table (`saveIssueLog.ts:51`) — a structurally similar but *separate* table from `issues`, with no FK relation, no shared service, and not visible to `createIssueFromRisk`, `issueService.ts`, or the `risk_registry` view (which joins `issues`, not `issue_log`). A document can surface a risk (→ `risks`, visible in the register) and an issue (→ `issue_log`, invisible to the register and to Playbook matching) in the same generation run, with no link between them even when the prose describes the same problem.
3. **`createIssueFromRisk` has no UI trigger and no automatic threshold.** The route exists (`POST /api/issues/from-risk/:riskId`) but no UI component calls it — confirmed by searching `app/` and `components/` for `from-risk`, zero hits. Nothing decides *when* a risk should escalate; a human must know the raw API exists and call it directly. The schema for a *rule-driven* version of this — `risk_escalation_policies` / `risk_escalation_steps` / `risk_escalation_events` / `risk_escalation_event_steps` (`000_baseline.sql:6196-6273`, plus FKs and indexes) — is fully designed but has **zero code references anywhere** in `server/src` (confirmed by grep; independently corroborated by `docs/07-architecture/EMPTY_TABLES_PURPOSE_AUDIT.md:68-71,84`, which calls it "a complete, fully-designed workflow schema... with zero code anywhere"). Five columns on `risks` that would feed such a policy engine — `escalation_path`, `escalation_date`, `exceeds_threshold`, `financial_threshold`, `recommended_playbook_id` — are likewise not referenced in any `.ts` file found. Note: the one *working* escalation engine in this codebase, `escalationService.ts` / `escalation_alerts`, evaluates baseline **drift** severity, not risk records — a different, unrelated concept that happens to share the word "escalation."

This ADR is therefore an **integration decision**, not a schema decision — the opposite shape from [ADR-015](ADR-015-audit-remediation-knowledge-graph.md), which was genuinely net-new. Here, every piece needed already exists; the task is deciding which module is canonical and specifying the calls that are currently missing.

## 3. Decision

Wire the existing modules together rather than adding new tables, and resolve the dead-schema question explicitly rather than leaving it ambiguous.

### 3.1 End-to-end flow (target state)
1. **Detection** — unchanged: a generated document's section prose is H8-tagged `risks` (and/or `issue_log`) at generation time; `ExtractionRegistry` extracts and `saveRisks`/`saveIssueLog` persist.
2. **Register landing** — unchanged: `risks` rows are immediately visible via `risk_registry` / `app/risks/page.tsx`.
3. **Escalation trigger (new, code-level, not schema)** — at risk-save time (or via a lightweight periodic check, mirroring `escalationService.ts`'s pattern), evaluate the risk's `probability`/`impact`/`financial_impact`/`schedule_impact_days` against an in-code threshold matrix analogous to `EscalationRule`, reusing the `exceeds_threshold`/`financial_threshold` columns that already exist on `risks` instead of adding new ones. A match either (a) auto-calls `createIssueFromRisk`, or (b) flags the risk for one-click human escalation — decision point in §3.3.
4. **Materialization** — `createIssueFromRisk` (kept, relocated per §3.2) creates the `issues` row with `related_risk_id` set.
5. **Playbook match (new call, not new code)** — the same call path that creates the issue immediately calls `playbookService.findMatchingPlaybooks({ project_id, risk_category, severity_level, priority_level })` and persists the top match to the issue's `playbook_execution_id` (or starts a `playbook_executions` row via `playbookService`), so "required details to remediate" — the matched playbook's response steps — are attached at creation time, not a manual follow-up.
6. **`issue_log` promotion (new, human-confirmed)** — a document-extracted `issue_log` row gets an explicit "Promote to Issue" action (same shape as `createIssueFromRisk`, not a silent merge) so LLM-tagged issues enter the governed `issues` register only on human confirmation — see §3.3 and §5 Negative for why this is deliberately not automatic.

### 3.2 Consolidate issue-writing on one module
`issueService.ts` becomes the canonical write path for `issues` (it already owns playbook matching, `ai_suggested_resolution`/`ai_confidence`, and `resolution_workflow`). `issuesLog/issuesService.ts`'s `createIssueFromRisk` is either moved into `issueService.ts` or changed to call `issueService.ts`'s `createIssue` instead of its own local one, so risk-materialized issues get playbook matching for free. This requires a Phase 0 audit of existing callers of both modules before merging (§6) — not assumed safe here.

### 3.3 Tier placement
Unlike ADR-015's Audit Finding closure (a high-integrity governance ritual routed through the Governor Portal per CLAUDE.md's tier separation), risk→issue escalation and playbook matching here are **operational project-management actions** on project-level data the Express backend already owns end-to-end (`risks`, `issues`, `playbook_executions` are not capability-registry or audit-confidentiality data). This stays entirely in the Experience/Express tier — no orchestrator involvement — consistent with where `createIssueFromRisk` and `playbookService` already live today.

## 4. Options Considered

### Option A: Status quo
Leave `issue_log` isolated, the two issue services unaware of each other, and `createIssueFromRisk` reachable only by hand-typing the API call. Rejected: this is precisely the fragmentation described in §2.3, and the schema already implies an intent (`playbook_execution_id` on both `risks` and `issues`) that the code never fulfills.

### Option B: New unified schema (ADR-015-style fresh build)
| Dimension | Assessment |
|---|---|
| Fit | Poor — `risks`, `issues`, `mitigation_plans`, `playbook_executions`, and `risk_registry` already work individually |
| Cost | High and unjustified — would duplicate substantial existing, tested infrastructure |

Rejected: this is not a net-new capability gap like ADR-015's audit findings; treating it as one would rebuild working code.

### Option C (Recommended): Wire existing modules together, resolve dead schema explicitly
Consolidate issue writes onto `issueService.ts` (§3.2), add the missing calls (`findMatchingPlaybooks` at materialization time, an in-code threshold check modeled on `escalationService.ts`'s `EscalationRule`), add a human-confirmed `issue_log` → `issues` promotion action, and explicitly retire or repurpose the dead `risk_escalation_*` tables/columns (§6 Phase 6) rather than leaving their intent ambiguous.

### Option D: Resurrect `risk_escalation_policies/steps/events/event_steps` as the escalation engine
| Dimension | Assessment |
|---|---|
| Fit | The schema is more expressive (multi-step routing, SLA per step, per-org configurability) |
| Cost | Four tables, zero code today; this repo's own precedent (`escalationService.ts`) solved the equivalent problem for drift with a single in-code rule matrix, not a 4-table engine |
| Evidence of need | None found — no caller, no UI, no test ever referenced these tables |

Rejected for now: building on a fully dead schema without evidence anyone needs configurable multi-step policy authoring is premature. §6 Phase 6 revisits this if the simpler in-code matrix proves insufficient.

## 5. Consequences

### Positive
- Closes a real, verified gap using code that already exists — no new tables, no new extraction infrastructure, no new UI framework.
- `risk_registry`'s existing `mitigation_plans`/`issues` joins finally get a live, non-manual source of `issues` rows tied to remediation content.
- Resolves the "two issue services" ambiguity that would otherwise keep confusing future contributors (and future ADRs).

### Negative
- Consolidating `issuesLog/issuesService.ts` and `issueService.ts` is real refactor work touching two modules with route-level surface area — needs its own Phase 0 caller audit (§6) and regression coverage via `npm run test:features`, not a drive-by rename.
- Auto-materializing every H8-tagged `issue_log` row straight into the governed `issues` register without human confirmation would let unvalidated LLM output (the same hallucination risk the H8 prompt rules already guard against — "never copy example values") pollute a register that `risk_registry`, mitigation tracking, and playbook matching all depend on being trustworthy. This is why §3.1 step 6 is deliberately human-confirmed, not automatic.
- An in-code threshold matrix (Option C) is less configurable than a database-driven policy engine (Option D) — if multiple projects need materially different escalation rules without a code deploy, this decision should be revisited.
- The dead `risk_escalation_*` tables and the five unused `risks` columns need an explicit fate (§6 Phase 6); leaving them undecided repeats the ambiguity `EMPTY_TABLES_PURPOSE_AUDIT.md` was written to resolve elsewhere.

## 6. Action Items

Phased, per the Governed Feature Loop (contract guards before implementation; new packet id `risk-issue-escalation` in `server/governed-features.manifest.json` — none of the existing packets fit, same reasoning as ADR-015 §6):

1. **Phase 0 (spike, required before Phase 1)**: audit every caller of `issuesLog/issuesService.ts` and `issueService.ts` (routes, jobs, tests) to determine which is safe to make canonical, and confirm nothing depends on `issue_log` staying isolated from `issues`.
2. **Phase 1**: contract guards for the three new behaviors: risk-severity threshold → issue creation; issue creation → playbook match attached (`playbook_execution_id` populated); `issue_log` → `issues` promotion action. New manifest packet.
3. **Phase 2**: implement the in-code threshold check (modeled on `escalationService.ts`'s `EscalationRule`) reusing `risks.exceeds_threshold`/`financial_threshold`; wire it to call `createIssueFromRisk` (post-consolidation, via `issueService.ts`) or surface a one-click "Escalate" action in `app/risks/page.tsx` calling the existing `POST /api/issues/from-risk/:riskId` route.
4. **Phase 3**: at issue-creation time (any path), call `playbookService.findMatchingPlaybooks()` and persist the top match's id, so remediation detail is attached automatically.
5. **Phase 4**: add the human-confirmed `issue_log` → `issues` promotion action.
6. **Phase 5**: consolidate `issuesLog/issuesService.ts` and `issueService.ts` onto one canonical module per the Phase 0 findings (or document why both must remain, if the spike finds a reason).
7. **Phase 6**: explicitly decide and document the fate of `risk_escalation_policies/steps/events/event_steps` and the five unused `risks` columns — reuse the columns in Phase 2, and either formally deprecate the four escalation tables (per this repo's existing precedent for documenting dormant schema, `EMPTY_TABLES_PURPOSE_AUDIT.md`) or schedule their removal. Do not leave this ambiguous.

## 7. References
- `server/src/services/inlineEntityExtractionPrompt.ts`, `server/src/modules/knowledge-graph/InlineH8Parser.ts` — the live H8 inline-tagging mechanism.
- `server/src/services/extraction/ExtractionRegistry.ts:214-219,613-618` — `risks` and `issue_log` extractor registration.
- `server/src/services/extraction/entities/risks/saveRisks.ts`, `.../issue_log/saveIssueLog.ts` — persistence into `risks` and `issue_log` respectively.
- `server/src/modules/execution/routes.ts:44-47`, `RiskController.ts`, `RiskRepository.ts` — Risk Register API.
- `server/migrations/000_baseline.sql:14838` (`risk_registry` view), `:3697-3999` (playbook tables), `:6196-6273` (dead `risk_escalation_*` tables), `:3161-3256` (`issue_log`/`issues`).
- `server/src/services/mitigationPlanService.ts` — mitigation plan CRUD, joined into `risk_registry`.
- `server/src/services/playbookService.ts:696` (`findMatchingPlaybooks`), `server/src/modules/execution/{PlaybookController,PlaybookRepository}.ts`.
- `server/src/modules/issuesLog/issuesService.ts:429-474` (`createIssueFromRisk`), `server/src/modules/issuesLog/routes.ts:205-210` (route).
- `server/src/services/issueService.ts:1140-1178` (playbook recommendation for issues), `:1196` (`issues_with_playbooks` stat).
- `server/src/services/escalationService.ts` — the proven in-code `EscalationRule` matrix pattern this ADR reuses for risk thresholds (Option D rationale).
- `docs/07-architecture/EMPTY_TABLES_PURPOSE_AUDIT.md` — independent confirmation that `risk_escalation_*` has zero code references.
- `server/governed-features.manifest.json` — existing packets checked for overlap; none fit, confirming a new `risk-issue-escalation` packet is needed.

## Related ADRs
- [ADR-015: CAM/KAM Audit Finding Standardization — Remediation Reference Architecture](ADR-015-audit-remediation-knowledge-graph.md) — the closest analog (Finding → Register → Playbook shape), but for external audit findings via a new GKG graph. This ADR is the project-risk equivalent, and is an *integration* decision on existing relational tables rather than a net-new schema — the contrast between the two is deliberate and worth preserving in future references to either.
- [ADR-004: DRACO AI Governance](ADR-004-DRACO-AI-GOVERNANCE.md) — source of the human-override pattern echoed in §3.1 step 6's human-confirmed promotion, and the reason this ADR does not treat generated-document `issue_log` content as automatically trustworthy.
