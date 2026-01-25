# Skill: Digital Twin POC Implementation (Correct Usage)

**Scope**: ADPA Digital Twin POC – React components, backend modules, API routes, and schema.  
**Use when**: Implementing or modifying Digital Twin features, adding UI, services, or migrations.  
**Single source of truth**: [DIGITAL_TWIN_POC_DESIGN.md](../docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md) and [DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md](../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md).

---

## When to use this skill

- User says: "implement Digital Twin", "add Digital Twin UI", "digital twin assets", "event-driven digital twin"
- User asks: "how do we use Digital Twin React components?", "where do events go?", "trigger rules API?"
- Tasks involve: `digital_twin_*` tables, `digitalTwin*` services, `DigitalTwin*` components, `/api/digital-twin/*` routes

---

## Architecture (Event-driven)

**Flow (do not deviate):**
```
Platform Event → digital_twin_events → Process → State Snapshot (digital_twin_asset_states)
    → Trigger rules evaluated → digital_twin_document_triggers → Document generation
```

- **Assets** are physical entities; **states** are time-series snapshots; **events** are the ingestion source.
- Connectors **emit events** into `digital_twin_events`; they do **not** write directly to `digital_twin_asset_states`.
- **Trigger rules** match on state/event; they create **document triggers** which queue document generation.

---

## Schema (design doc + REVISED plan)

**Tables (exact names):**

| Table | Purpose |
|-------|--------|
| `digital_twin_assets` | Physical assets registry; `project_id`, `external_id`, `platform_type`, `current_state_id` |
| `digital_twin_asset_states` | Time-series state snapshots; `asset_id`, `state_snapshot` (JSONB), `state_version`, `state_hash`, `source_event_id` |
| `digital_twin_events` | Event log; `asset_id`, `event_type`, `event_payload` (JSONB), `processing_status` |
| `digital_twin_document_triggers` | Triggered doc gen; `asset_id`, `event_id`, `trigger_rule`, `template_id`, `status` |
| `digital_twin_ingestion_sources` | Connector config; `project_id`, `platform_type`, `connection_config`, `sync_mode` |
| `digital_twin_trigger_rules` | Reusable rules; `project_id`, `rule_config`, `trigger_type`, `template_id` |

**Do not use:** `digital_twin_models`, `digital_twin_states` (old names), or tables not in the design doc.

**Migration**: `server/migrations/663_create_digital_twin_tables.sql`. Align any new migrations with the REVISED plan schema.

---

## Backend services and APIs

### Services

| Service | File | Role |
|--------|------|------|
| `digitalTwinAssetService` | `server/src/services/digitalTwinAssetService.ts` | Assets CRUD, current state, state history |
| `digitalTwinEventService` | `server/src/services/digitalTwinEventService.ts` | Ingest events, process queue, retry failed, create state from event |
| `digitalTwinTriggerService` | `server/src/services/digitalTwinTriggerService.ts` | Trigger rules, evaluate rules, create/process document triggers |
| `digitalTwinIngestionService` | `server/src/services/digitalTwinIngestionService.ts` | Ingestion sources, sync start/pause, status |
| `digitalTwinConnectorService` / connectors | `server/src/services/connectors/*` | Platform adapters; **must** emit events via `digitalTwinEventService.ingestEvent` |
| `digitalTwinStateUtils` | `server/src/utils/digitalTwinStateUtils.ts` | `calculateStateHash`, `detectChangedFields`, `generateStateDiff` |

### API routes

- **Assets**: `server/src/routes/digital-twin-assets.ts`  
  `GET/POST /api/digital-twin/assets`, `GET/PUT/DELETE /api/digital-twin/assets/:id`,  
  `GET /api/digital-twin/assets/:id/current-state`, `GET /api/digital-twin/assets/:id/history`
- **Events**: `server/src/routes/digital-twin-events.ts`  
  `GET/POST /api/digital-twin/events`, `GET /api/digital-twin/events/pending`, `POST /api/digital-twin/events/:id/retry`
- **Ingestion**: `server/src/routes/digital-twin-ingestion.ts`  
  `GET/POST /api/digital-twin/ingestion/sources`, `PUT .../sources/:id`, `POST .../sources/:id/start`, `.../pause`,  
  `POST .../webhook/:sourceId`, `POST .../sync/:sourceId`
- **Triggers**: `server/src/routes/digital-twin-triggers.ts`  
  `GET/POST /api/digital-twin/triggers`, `GET .../triggers/:id`,  
  `GET/POST/PUT/DELETE /api/digital-twin/triggers/rules`, `POST .../triggers/:id/process`

---

## React components and usage

### Components (under `components/digital-twin/`)

| Component | Purpose | Key API usage |
|-----------|---------|----------------|
| `DigitalTwinAssetsList` | List assets for project | `GET /api/digital-twin/assets?projectId=...` |
| `DigitalTwinAssetCard` | Asset details, sync status, links | `GET /api/digital-twin/assets/:id` |
| `DigitalTwinStateViewer` | Current state, history, changed fields, hash | `GET /api/digital-twin/assets/:id/current-state`, `.../history` |
| `DigitalTwinEventsList` | Events for asset, filters, retry | `GET /api/digital-twin/events?assetId=...` |
| `DigitalTwinEventDetails` | Event payload, processing status | `GET /api/digital-twin/events/:id` |
| `DigitalTwinTriggerRulesManager` | CRUD rules, test evaluation | `GET/POST/PUT/DELETE .../triggers/rules`, test endpoint |
| `DigitalTwinDocumentTriggersList` | List triggers, filters, link to docs | `GET /api/digital-twin/triggers` |
| `DigitalTwinIngestionSourceSetup` | Configure source, test, sync | `GET/POST/PUT .../ingestion/sources`, `.../start`, `.../pause` |

### Integration

- **Project page**: Add "Digital Twins" tab; link to `app/projects/[id]/digital-twins/page.tsx`.
- **Digital Twins page**: `app/projects/[id]/digital-twins/page.tsx` – asset list, events, triggers, ingestion sources.
- Use `NEXT_PUBLIC_API_URL` (or existing API helper) for all `/api/digital-twin/*` calls. Scope by `project_id` from route.

---

## Correct usage rules

1. **Event-driven only**: All state changes flow from **events** → processing → **states**. No direct state writes from connectors.
2. **Schema alignment**: New migrations must match the REVISED plan and design doc. No ad-hoc tables or renames.
3. **Platform types**: `platform_type` is one of `'iTwin' | 'AzureDT' | 'Generic'`.
4. **Event types**: `event_type` in `digital_twin_events` is one of `'state_change' | 'attribute_change' | 'relationship_change' | 'creation' | 'deletion' | 'alert' | 'sync_error'`.
5. **Trigger types**: `trigger_type` is one of `'state_change' | 'attribute_change' | 'threshold_breach' | 'scheduled' | 'manual'`.
6. **RLS**: All `digital_twin_*` tables use RLS; policies key off `project_id` / `company_id` and project membership.

---

## Reference

### ADPA planning

- **Design**: [docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md](../docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md)
- **Implementation plan**: [plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md](../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md)
- **Risk assessment**: [plans/DIGITAL_TWIN_POC_RISK_ASSESSMENT.md](../plans/DIGITAL_TWIN_POC_RISK_ASSESSMENT.md)

### iTwin.js (Bentley) – connectors & optional visualization

Use when implementing the **iTwin connector** (Phase 3) or **iTwin Viewer** (optional Visualization phase). The POC uses the **Platform API** for event-driven ingestion; iTwin Viewer is for viewing iModels in-browser and is out of current POC scope unless explicitly added.

| Resource | URL | Use |
|----------|-----|-----|
| **iTwin.js** (main) | [https://www.itwinjs.org/](https://www.itwinjs.org/) | Library for infrastructure digital twin apps; aggregate BIM/Reality/GIS/IoT, visualize in 3D/4D, analyze. |
| **iTwinUI** (React UI) | [https://itwinui.bentley.com/docs](https://itwinui.bentley.com/docs) | Bentley React component library. Use for **Viewer** and Digital Twin UI: `npm add @itwin/itwinui-react`, `ThemeProvider`, `@itwin/itwinui-react/styles.css`. Components: Button, Dialog, Tabs, Table, etc. Aligns with Bentley design system. |
| **Documentation** | [https://www.itwinjs.org/](https://www.itwinjs.org/) → Documentation | API reference, learning, tutorials. |
| **GitHub** | [iTwin.js on GitHub](https://github.com/iTwin) | Open source repos; reference implementations, issues. |
| **iTwin Viewer** | [iTwin Viewer](https://www.itwinjs.org/learning/tutorials/) / Create React App `@itwin/web-viewer` | Optional: in-browser iModel viewer (selection, measurement, clipping, tree, etc.). See REVISED plan § Visualization. |
| **Bentley developer** | [developer.bentley.com](https://developer.bentley.com) | Register app, Visualization API, `IMJS_AUTH_CLIENT_*`, `IMJS_ITWIN_ID` / `IMJS_IMODEL_ID` for viewer auth. |

**Platform API (connector)**: Use iTwin.js Platform API for auth, project/iModel access, and asset metadata; **emit events** to `digital_twin_events` via `digitalTwinEventService.ingestEvent`. Do not write directly to `digital_twin_asset_states`.

**Viewer & UI**: For iTwin Viewer or Bentley-aligned Digital Twin UI, use [iTwinUI](https://itwinui.bentley.com/docs) (React components, ThemeProvider, styles). Current ADPA Digital Twin UI uses Radix/shadcn; iTwinUI is optional when targeting Bentley design consistency or iModel viewer surfaces.

---

## Invocation

- **Slash command**: Use when user invokes `/digital-twin` or `/digital-twin-implementation` (if configured).
- **Natural language**: Apply when the user's request matches **When to use this skill** above.
