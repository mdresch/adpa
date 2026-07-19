# ADR 010: Digital Twin L1/L2 Generation Pipeline

## 1. Status
**Proposed (2026-07-12)**

## 2. Context

ADPA documents a three-layer Digital Twin schema — L0 (asset register), L1 (topology/relationships), L2 (telemetry/state mapping) — in `docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md:37-160`. Only L0 has a real generation/extraction pipeline in code today:

- **L0 exists**: `server/src/services/extraction/entities/dt_assets/` extracts `dt_assets:` YAML from generated documents into `extracted_dt_assets`, then `dtAssetImportService.ts` imports into `digital_twin_assets` (see [ADR-006](ADR-006-digital-twin-l0-conformance-verification.md) for the full path and line references).
- **L1 does not exist**: no `dt_relationships` extractor anywhere under `server/src/services/extraction/entities/`, and no matching table. The complete list of `digital_twin_*` tables in `server/migrations/000_baseline.sql` is `digital_twin_asset_states` (:1827), `digital_twin_assets` (:1847), `digital_twin_document_triggers` (:1875), `digital_twin_events` (:1899), `digital_twin_ingestion_sources` (:1920), `digital_twin_trigger_rules` (:1941), and `extracted_dt_assets` (:2808) — there is no relationships/topology table at all. The "no invented assets" rule the analysis doc documents as mandatory (`13-comprehensive-digital-twin-analysis.md:183`: *"L1 and L2 MUST reference exact L0 IDs — no invented assets"*) is unenforceable today because there's nothing to enforce it against.
- **L2 is partially covered by infrastructure that wasn't built for this**: `digital_twin_asset_states` (`server/migrations/000_baseline.sql:1827-1844`) already stores versioned JSONB state snapshots per asset (`state_snapshot`, `state_version`, `is_current`), and `digital_twin_events` (`:1899-1917`) already ingests platform events. But both are populated only by real platform sync (an actual iTwin/Azure DT connection via `digital_twin_ingestion_sources`), not by AI-generated `dt_telemetry` YAML (the sensor-definition/threshold-automation shape at `13-comprehensive-digital-twin-analysis.md:119-160`). There is no extractor that reads a `dt_telemetry:` block out of a generated document and writes it anywhere.

[ADR-006](ADR-006-digital-twin-l0-conformance-verification.md) scopes its conformance verifier to L0 specifically because of this gap — there's nothing yet to verify at L1/L2. This ADR is the prerequisite: build the generation pipelines so ADR-006's verifier has something to extend to.

## 3. Decision

Build L1 and L2 generation as two separate efforts, because their starting points are different — L1 has no existing infrastructure to build on; L2 does.

### L1 — Relationships (new subsystem)

- New extraction module `server/src/services/extraction/entities/dt_relationships/`, mirroring `dt_assets/`'s pattern: deterministic ` ```yaml ` block parsing (no AI at the extraction step), looking for a `dt_relationships:` key with `type`, `source_external_id`, `target_external_id` fields per the documented shape (`13-comprehensive-digital-twin-analysis.md:79-107`).
- New tables `extracted_dt_relationships` and `digital_twin_relationships`, mirroring the `extracted_dt_assets`/`digital_twin_assets` pair, each row referencing `source_external_id`/`target_external_id`.
- Enforce "no invented assets" at write time: both `source_external_id` and `target_external_id` MUST resolve to an existing `digital_twin_assets.external_id` (scoped to the same `project_id`) before a relationship row is accepted. This is the one new integrity rule this pipeline needs that the L0 pipeline has no equivalent of, since L0 is a single, self-contained table.
- Register with `ExtractionRegistry` the same way `dt_assets` is registered (`server/src/services/extraction/ExtractionRegistry.ts:389-391`), including a feature flag.

### L2 — Telemetry (extend existing infrastructure, don't duplicate it)

- New extraction module `server/src/services/extraction/entities/dt_telemetry/`, parsing `dt_telemetry:` blocks (`state_keys`, `sensors[]` with thresholds — `13-comprehensive-digital-twin-analysis.md:126-149`).
- Do **not** create a parallel `digital_twin_telemetry` table, and do **not** write extracted sensor/threshold definitions directly into `digital_twin_asset_states`. `skills/adpa-digital-twin/SKILL.md` documents the established event-sourced flow as a Core Rule: *"No Direct Writes: Connectors must NOT write directly to `digital_twin_asset_states`. They must emit events."* (`Connector/Event -> digital_twin_events -> Processing -> State Snapshot (digital_twin_asset_states) -> Trigger Evaluation -> Document Generation`.) A `dt_telemetry` import service is functionally a connector and must honor the same rule: it emits synthetic rows into `digital_twin_events` (e.g. a new `event_type` such as `document_generated_telemetry`, carrying the sensor/threshold definition as `event_payload`) and lets the existing event-processing path in `digitalTwinEventService.ts` produce the resulting `digital_twin_asset_states` snapshot — the same path real `bentleyConnector.ts`/`iTwinConnector.ts` events go through, not a shortcut around it.
- Cross-reference `target_asset_external_id` against L0 the same way L1 does.

### Governance

- Register both under the Governed Feature Loop from the start — Contract Guards written before implementation, `server/governed-features.manifest.json` entry, and updates to the existing `skills/adpa-digital-twin/SKILL.md` (not a new skill file — this feature area already has one). This is a deliberate departure from `dt_assets`, which predates this convention and isn't currently a registered packet (flagged as separate cleanup in ADR-006's Action Items).

## 4. Options Considered

### Option A: Leave L1/L2 as documentation-only
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Outcome | ADPA's own documented Digital Twin schema stays two-thirds unimplemented; ADR-006's verifier can never be extended beyond L0 |

### Option B: Build brand-new, independent tables for both L1 and L2
| Dimension | Assessment |
|---|---|
| Complexity | Higher than necessary for L2 |
| Duplication | Creates a second, parallel telemetry/state system alongside `digital_twin_asset_states`/`digital_twin_events`, which already do this job for real platform sync — two sources of truth for asset state |

### Option C (Recommended): New table for L1 (nothing to reuse), extend existing tables for L2 (real infrastructure already exists)
| Dimension | Assessment |
|---|---|
| Complexity | L1 is genuinely new scope; L2 is additive to existing tables |
| Duplication | None — `digital_twin_asset_states`/`digital_twin_events` serve both real sync and document-generated telemetry through one schema |

## 5. Consequences

### Positive
- Completes the L0/L1/L2 schema ADPA already documents but only partially implements.
- Lets [ADR-006](ADR-006-digital-twin-l0-conformance-verification.md)'s verification approach extend to L1/L2 without redesigning it.
- L2 reuses real, already-proven infrastructure rather than duplicating it.

### Negative
- L1 is nontrivial new scope: extractor, two new tables, an import service, and a cross-reference integrity check that doesn't exist anywhere else in this pipeline today.

### Risks
- **Ordering**: within a single generated document, an L1 relationship block could reference an L0 asset that hasn't been imported yet (extraction order isn't guaranteed to match document order). The "no invented assets" check needs an explicit strategy — either defer L1 validation until after the same document's L0 import completes, or run both within a single transaction and validate at commit. This must be resolved during implementation, not left as an assumption.
- **State ownership conflict**: once `dt_telemetry`-sourced rows and real-platform-sync rows both write to `digital_twin_asset_states`, a policy is needed for which wins if both are active for the same asset (e.g. a document regenerates baseline telemetry for an asset that's also live-synced from a real iTwin). Default to real sync taking precedence; document-generated telemetry only seeds state for assets with no active `digital_twin_ingestion_sources` connection.

## 6. Action Items

1. Build `dt_relationships` extractor, `extracted_dt_relationships`/`digital_twin_relationships` tables, cross-reference validation, `ExtractionRegistry` registration.
2. Build `dt_telemetry` extractor and its mapping into `digital_twin_asset_states`/`digital_twin_events`, resolving the state-ownership policy in Risks.
3. Resolve the ordering risk above before enabling either pipeline in reject-mode.
4. `server/governed-features.manifest.json` entries + Contract Guards, written before implementation per the Governed Feature Loop. Update the existing `skills/adpa-digital-twin/SKILL.md` (add the L1/L2 tables and the `dt_telemetry`-as-connector rule above) rather than creating a new skill file — this feature area already has one.
5. Once both ship, extend [ADR-006](ADR-006-digital-twin-l0-conformance-verification.md)'s verifier to cover L1/L2 conformance — update that ADR rather than re-deciding conformance rules here.

## 7. References

- `docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md`
- `server/migrations/000_baseline.sql:1827-1966` (`digital_twin_*` tables), `:2808-2826` (`extracted_dt_assets`)
- `server/src/services/extraction/entities/dt_assets/` (the pattern being mirrored)
- `server/src/services/extraction/ExtractionRegistry.ts`
- `skills/adpa-digital-twin/SKILL.md` — canonical architecture/rules for this feature area; `digitalTwinEventService.ts`, `digitalTwinAssetService.ts`, `digitalTwinTriggerService.ts`, and the `bentleyConnector.ts`/`iTwinConnector.ts` connectors it names
- [ADR-006: Digital Twin L0 Asset Conformance Verification](ADR-006-digital-twin-l0-conformance-verification.md)
