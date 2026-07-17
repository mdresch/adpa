# ADR 006: Digital Twin L0 Asset Conformance Verification

## 1. Status
**Proposed (2026-07-12)** — supersedes an earlier draft of this ADR that described a fictional "iTwin Model Coding Protocol (MCP)" validating SQL DDL, regex tokens, and sandboxed code against "the iTwin Digital Twins Specification." That draft named no real code, and the artifact types it described (SQL/regex/code) have no connection to ADPA's actual Digital Twin pipeline. This version is grounded in the L0 asset pipeline that exists in code today.

## 2. Context

ADPA's document-generation pipeline already produces and consumes a real Digital Twin asset-register artifact — this isn't hypothetical. Per `docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md:37-72`, generated project documents embed ` ```yaml ` blocks under a `dt_assets:` key (the "L0 Layout & Asset Register"). That YAML is real, load-bearing input to a real extraction pipeline:

- `extractDtAssets` (`server/src/services/extraction/entities/dt_assets/extractDtAssets.ts:87-135`) scans generated documents for ` ```yaml `/` ```yml ` fences, parses `dt_assets:` blocks with `js-yaml`, and normalizes each entry — **deterministically, no AI involved at this step** — into `extracted_dt_assets` (`server/migrations/000_baseline.sql:2808-2826`).
- `dtAssetImportService.importExtractedAssets` (`server/src/services/dtAssetImportService.ts:90-154`) then imports those rows into `digital_twin_assets` (`server/migrations/000_baseline.sql:1847-1872`) — the table that actually drives `components/digital-twin/` (asset lists, event triggers) and, for `platform_type: 'iTwin'` assets, the real Bentley iTwin.js viewer (`components/digital-twin/iTwinViewer.tsx`, backed by the real `@itwin/core-frontend`/`@itwin/viewer-react` packages in `package.json`).
- The extraction module is registered like any other entity extractor, with its own feature flag (`server/src/services/extraction/ExtractionRegistry.ts:389-391,800`).

**The gap**: conformance checking on this path is minimal, inline, and silent-fails on violation. `normalizeAsset` (`extractDtAssets.ts:54-81`) only checks that `external_id` and `name` are non-empty strings, and coerces `platform_type` to one of `['iTwin', 'AzureDT', 'Generic']` (`extractDtAssets.ts:16-20`), defaulting silently to `'Generic'` for anything else. It does **not** check:

- The `{project-code}::{asset-type}-{id}` naming convention that the analysis doc documents as mandatory (`13-comprehensive-digital-twin-analysis.md:163-184`: *"Double-colon separator (`::`) — NOT hyphen"*, *"L1 and L2 MUST reference exact L0 IDs — no invented assets"*). Any string satisfies the current `external_id` check.
- Whether `asset_type` (when present) is one of the four documented categories — zone, station, sensor, infrastructure (`13-comprehensive-digital-twin-analysis.md:187-267`).
- Malformed YAML blocks: a `yaml.load` failure is caught, logged as a warning, and the entire block is silently dropped (`extractDtAssets.ts:39-48`) — the document author gets no signal that part of their generated asset register was discarded.

Because the AI generating project documents can emit anything inside a ` ```yaml ` fence, a plausible-looking but non-conformant asset register can flow all the way to `digital_twin_assets` — and, for `platform_type: 'iTwin'` rows, into an attempted render against the real Bentley viewer — without any check against the schema ADPA itself already documents as canonical.

**Scope note on naming**: an earlier draft of this ADR called the proposed service "MCP." That acronym is already load-bearing in this codebase and the surrounding AI-tooling ecosystem as **Model Context Protocol** — the protocol behind every tool call in this environment, referenced throughout `.agents/skills/`. Reusing it for an unrelated "iTwin Model Coding Protocol" would collide with the default reading of "MCP" for every future reader and AI agent working in this repo. This ADR does not use that acronym.

**Scope note on L1/L2**: ADPA's documented schema also defines L1 (`dt_relationships` — topology) and L2 (`dt_telemetry` — sensor/state mapping) layers (`13-comprehensive-digital-twin-analysis.md:75-160`). Neither has an extraction pipeline or a matching table today — there is no `dt_relationships` extractor and no `digital_twin_relationships` table anywhere in `server/migrations/000_baseline.sql`. A verifier can't check conformance against a layer nothing produces yet. Building those generation pipelines is out of scope here and is covered by [ADR-010](ADR-010-digital-twin-l1-l2-generation-pipeline.md); this ADR is scoped to what exists: L0.

## 3. Decision

Implement a **Digital Twin L0 Conformance Verifier** as an explicit step in the existing extraction/import call path — not a generalized "verify any AI-generated artifact" service (see Option B below for why that's rejected), and not a hidden addition to `normalizeAsset`.

- New module: `server/src/services/extraction/entities/dt_assets/verifyDtAssetConformance.ts`, exporting `verifyDtAssetConformance(asset: DtAsset): ConformanceVerdict` where `ConformanceVerdict = { conformant: boolean; violations: ConformanceViolation[] }`. A typed verdict, not a boolean gate — callers decide whether a violation blocks import or is surfaced as a warning.
- Verification rules, all sourced from the schema ADPA already documents but doesn't yet enforce:
  1. `external_id` MUST match `{project-code}::{asset-type}-{id}` (double-colon separator, lowercase-with-hyphens). Reject, don't silently accept.
  2. `asset_type`, when present, MUST be one of the four documented categories (`zone`, `product_station`/`demo_station`/`workstation`, `sensor`, `infrastructure`) or explicitly absent.
  3. `platform_type` MUST be one of `['iTwin', 'AzureDT', 'Generic']` — this rule already exists (`extractDtAssets.ts:16-20`); the verifier keeps it, doesn't relax it.
  4. Malformed YAML blocks are reported as a rejection with source document/block reference, not dropped via a caught exception with only a log line.
- Wire the verifier in at two points: immediately after `extractDtAssets` (before entities reach `extracted_dt_assets`) and defensively again inside `importExtractedAssets` (before each INSERT/UPDATE into `digital_twin_assets`) — matching the two real hop points that already exist on this path.
- This is deliberately scoped to `dt_assets` YAML — the one AI-generated structured artifact ADPA's pipeline actually produces and consumes today. It is not a general-purpose verification framework for arbitrary future artifact types.

## 4. Options Considered

### Option A: Leave conformance checking as-is
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Closes the gap | No — non-conformant `external_id`/`asset_type` values keep reaching `digital_twin_assets` and the real iTwin viewer unchecked |

### Option B: Build a generic "verify any AI-generated structured artifact" service (the original ADR-006 scope — SQL DDL, regex, sandboxed code)
| Dimension | Assessment |
|---|---|
| Complexity | High — no shared schema exists across those artifact types |
| Grounding | None — no SQL/regex/code-generation feature exists in ADPA's codebase today (no `grok.ts`, no `XAI_API_KEY`, no such module), and there is no real technical link between Bentley's iTwin asset schema and SQL DDL or regex tokens |

Rejected: this would document a capability that doesn't exist against artifact types that have no relationship to the schema being "verified." If a genuine need to validate other artifact types materializes later, it should get its own ADR grounded in that artifact type's actual schema — not borrow iTwin's name by analogy.

### Option C (Recommended): L0-scoped Digital Twin Conformance Verifier, wired into the real extraction/import path
| Dimension | Assessment |
|---|---|
| Complexity | Low — one new pure module, two call sites, both already exist |
| Closes the gap | Yes, for L0 — the only layer with a real pipeline today |
| Grounded | Yes — every rule traces to `13-comprehensive-digital-twin-analysis.md` and the current (incomplete) checks in `extractDtAssets.ts` |

## 5. Consequences

### Positive
- Closes a real, currently-open gap: non-conformant asset registers no longer silently reach `digital_twin_assets` (and, for `platform_type: 'iTwin'`, the real Bentley viewer).
- Reuses the schema ADPA already documents instead of inventing a new one.
- Scoped narrowly enough to ship without depending on unbuilt infrastructure.

### Negative
- Does not verify L1 or L2 — by design, until [ADR-010](ADR-010-digital-twin-l1-l2-generation-pipeline.md) ships the generation pipelines those verifications would run against.
- Adds a synchronous verification step to both the extraction and import call paths (latency proportional to asset count per document; per-project asset counts in the analysis doc's comparison table top out around 10,000, so this is not expected to be a throughput concern).

### Risks
- The `{project-code}::` naming convention is enforced today only by documentation, not by any existing code. Flipping straight to reject-mode could break references to already-imported `digital_twin_assets` rows that don't conform. Mitigate by running the verifier in warn-only mode against existing data first (see Action Items).

## 6. Action Items

1. Implement `verifyDtAssetConformance.ts` per Decision, with unit tests covering each of the four rules.
2. Register under the Governed Feature Loop (`server/governed-features.manifest.json`) — Contract Guards written before implementation, per `CLAUDE.md`'s "Governed Feature Loop" requirement. This packet does not exist today; `dt_assets` extraction itself also predates this ADR and isn't currently a registered packet — flag that as a separate cleanup item, not blocking this ADR.
3. Update the existing `skills/adpa-digital-twin/SKILL.md` once the verifier ships — this feature area already has a skill file (Core Rules on event-sourced writes, platform types, RLS); add the conformance rules from Decision to it rather than creating a new one.
4. Run in warn-only mode against existing `digital_twin_assets` rows for one release cycle before enabling reject-mode for new imports.
5. Coordinate with [ADR-010](ADR-010-digital-twin-l1-l2-generation-pipeline.md) before extending this verifier to L1/L2 — don't duplicate the "no invented assets" cross-reference check independently in both ADRs.

## 7. References

- `server/src/services/extraction/entities/dt_assets/extractDtAssets.ts`
- `server/src/services/extraction/entities/dt_assets/types.ts`
- `server/src/services/dtAssetImportService.ts`
- `server/src/services/extraction/ExtractionRegistry.ts:389-391,800`
- `server/migrations/000_baseline.sql:1847-1872` (`digital_twin_assets`), `:2808-2826` (`extracted_dt_assets`)
- `docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md`
- `components/digital-twin/iTwinViewer.tsx`
- `skills/adpa-digital-twin/SKILL.md` — canonical architecture/rules for this feature area
- [ADR-010: Digital Twin L1/L2 Generation Pipeline](ADR-010-digital-twin-l1-l2-generation-pipeline.md)
