---
name: adpa-digital-twin
description: Architecture and implementation guidance for the ADPA Digital Twin POC. Use when modifying physical assets, event-driven state changes, or trigger rules.
---

# ADPA Digital Twin Implementation

## Architecture (Event-Driven)
All state changes MUST follow this flow:
`Connector/Event` -> `digital_twin_events` -> `Processing` -> `State Snapshot (digital_twin_asset_states)` -> `Trigger Evaluation` -> `Document Generation`

## Core Rules
1. **No Direct Writes**: Connectors must NOT write directly to `digital_twin_asset_states`. They must emit events.
2. **Platform Types**: Must be one of `iTwin`, `AzureDT`, or `Generic`.
3. **Database RLS**: All tables use Row Level Security keyed off `project_id`.

## Database Schema (Truth)
| Table | Description |
| :--- | :--- |
| `digital_twin_assets` | Assets registry. |
| `digital_twin_asset_states` | Time-series snapshots (JSONB). |
| `digital_twin_events` | Raw event log. |
| `digital_twin_trigger_rules` | Logical rules for doc generation. |

## Key Services
- `digitalTwinEventService.ts`: Primary entry point for ingesting events.
- `digitalTwinAssetService.ts`: Manages asset metadata and history.
- `digitalTwinTriggerService.ts`: Evaluates rules against new states.

## UI Integration
Components are located in `components/digital-twin/`. New features should be integrated into the "Digital Twins" tab on the Project Details page.
