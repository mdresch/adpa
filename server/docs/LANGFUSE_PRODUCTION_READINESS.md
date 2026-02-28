# Langfuse Production Readiness (ADPA)

This runbook prepares and validates Langfuse features for ADPA production telemetry.

Naming standard reference:

- See LANGFUSE_NAMING_CONVENTIONS.md for stable IDs, tags, metadata, score names, prompt labels, and dataset naming.

## What this flow covers

- Prompt management provisioning (versioned prompt + labels)
- Dataset and dataset item provisioning
- Trace/session/user/tag/metadata instrumentation validation
- Observation-level logging (span/generation/event with input/output)
- Token usage logging on generations
- Compliance scoring + LLM-judge style scoring
- Dataset run linkage for validation
- Annotation queue API reachability checks (when key scope supports it)

## Script

- Script: `scripts/seed-langfuse-adpa-rich.ts`
- Modes:
  - `setup`: create/update prompts, dataset, score configs
  - `test`: emit production-style traces and validate feature outputs
  - `all`: `setup` + `test`

## Commands

From `server/`:

- `npm run langfuse:setup`
- `npm run langfuse:test`
- `npm run langfuse:prod-ready`

## Expected results

The script prints a validation summary with checks:

- `traces`
- `sessions`
- `scores`
- `prompts`
- `datasets`
- `annotation-hooks`

All checks should return `PASS` for full readiness.

## Notes

- Annotation queue actions require API key scope that includes annotation endpoints.
- If annotation endpoints are unavailable, the script marks that check as skipped-by-design.
- The script is safe to rerun; setup steps are idempotent/upsert-oriented.
