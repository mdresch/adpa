# ADR 014: Context & Knowledge Management Framework

## 1. Status
**Proposed (2026-07-23)** — the context pipeline described here is fully implemented across ten `server/src` modules; this ADR records the architecture retroactively.

## 2. Context

ADPA's document generation pipeline does not operate on generic prompts. It builds a **scoped context envelope** per generation request by gathering information from multiple sources, filtering by access control, caching by freshness, and injecting the result into the AI prompt. The implementation spans ten distinct modules:

- `contextGathering` — collects raw context from user input, project documents, and entity registries
- `contextOrchestrator` — coordinates multiple gatherers and resolves conflicts
- `contextBundle` — packages gathered context into the schema the generator expects
- `contextInjection` — injects the bundle into the prompt template
- `contextRetrieval` — fetches previously-stored context by key/project/document
- `contextFreshness` — tracks TTL and staleness for cached context entries
- `contextRepository` — persistence layer for context bundles (JSONB in Postgres)
- `contextAccessControl` — enforces tenant/project isolation on context reads
- `variableResolution` — resolves `{{VAR}}` placeholders within templates against project data
- `contextGathering` (shared utility) — common helpers used across the above

Verified against the directory structure and cross-references in the codebase. No ADR has recorded why each module exists, how they interact, or the freshness/access-control trade-offs. Any developer working on generation currently reverse-engineers the pipeline from the imports in `ProcessFlowService`.

## 3. Decision

We adopt a **single, tenant-scoped context pipeline** with explicit freshness semantics and token-budget enforcement. The pipeline is a fan-out/fan-in architecture: gather many signals, freshen them in parallel, bundle them into one prompt-shaped envelope, and inject that envelope at the right stage of generation.

### 3.1 Pipeline Shape

```
User Request + Project Documents
        ↓
  contextGathering (fan-out)
  ├── Entity registry query
  ├── Document text retrieval
  ├── RAG chunk retrieval
  └── Variable defaults
        ↓
  contextOrchestrator (merge, deduplicate, resolve conflicts)
        ↓
  contextBundle (shape into prompt schema)
        ↓
  contextRepository (persist by project_id + document_id + generation_id)
        ↓
  contextRetrieval (fetch by key, check freshness)
        ↓
  contextInjection (slot into Handlebars prompt)
        ↓
  {{VAR}} resolution (variableResolution)
        ↓
  Final prompt → AI generation
```

### 3.2 Freshness Model

Context carries a **TTL** and a **source fingerprint**. `contextFreshness` checks both on read:

- **TTL expiry**: stale contexts are discarded and re-gathered rather than injected.
- **Source fingerprint**: if the underlying project document or entity changes, the cached bundle is invalidated even if its TTL has not expired.

This two-key strategy prevents two distinct rot modes: time-based staleness (old templates) and event-based staleness (documents updated after the bundle was created).

### 3.3 Access Control

`contextAccessControl` enforces tenant and project boundaries before any context bundle leaves `contextRepository`. The rule is simple: a context bundle scoped to project X is invisible to a generation request scoped to project Y, regardless of whether the caller has a valid token. Super-admin bypass is explicit and auditable.

### 3.4 Token Budgeting

The bundle size is bounded by the target model's context window. `ContextBundle.build` enforces a token ceiling before the bundle is handed to the injector; oversize bundles are truncated (least-recently-used first) rather than rejected, so the generation never fails because the preamble was too long.

### 3.5 Variable Resolution

`{{VAR}}` placeholders in templates are resolved against the `contextBundle`, then against the project's `project_integrations` and `users` tables as fallbacks. Resolution order is: context bundle → project metadata → user-company defaults. This keeps templates portable across projects without hard-coded project names.

## 4. Options Considered

### Option A: Single monolithic context gatherer (no modules)
| Dimension | Assessment |
|---|---|
| Complexity | Lowest possible |
| Testability | Hard — every change to project schema requires changing one giant file |
| Freshness | No per-source TTL; invalidation is all-or-nothing |

Rejected: the pipeline already runs in production with this modular shape; consolidating it would be a regression in testability and cache granularity.

### Option B (Recommended): Keep the 10-module fan-out/fan-in with explicit boundaries
| Dimension | Assessment |
|---|---|
| Complexity | Medium — more files, but each has a single responsibility |
| Testability | High — each module can be unit-tested in isolation |
| Freshness | Per-source fingerprint + TTL, not one global cache |

This is the current implementation. It works, it is tested, and the only missing piece is a document that explains why the boundaries are drawn where they are.

### Option C: Push context assembly into the AI prompt itself (no pre-bundling)
| Dimension | Assessment |
|---|---|
| Token efficiency | Poor — the same context is built from scratch on every generation |
| Determinism | Low — ordering of context sources depends on prompt parsing, not code |

Rejected: pre-bundling lets the system cache, log, and audit what context was provided to the model. Prompt-time assembly loses all three properties.

## 5. Consequences

### Positive
- **Auditable context**: the bundle persisted in `contextRepository` is the exact thing the model sees. Debugging a bad generation means querying one row, not reconstructing a prompt.
- **Cache efficiency**: freshness fingerprint means only actually-changed sources trigger re-gathering, reducing token spend for repeated generations on stable projects.
- **Portable templates**: `{{VAR}}` resolution against project metadata means one template can be deployed to many projects without editing.

### Negative
- **Module count**: ten files for what looks like one conceptual step (get context, give it to AI). New developers classify this as accidental complexity until they see the test file for each module.
- **Dual-write risk**: `contextRepository` and `contextBundle` both hold JSON representations of the same envelope; drift between the two shapes would cause injection-time errors that are hard to trace because both schemas are JSONB and untyped at the DB layer.

### Risks
- **Token budget miscalculation**: if `ContextBundle.build` undercounts tokens (e.g. because a multibyte character is not counted correctly), the injected prompt can exceed the model's context window and cause a 4K-token API error. Mitigated by adding a hard 90%-of-window ceiling with a warning log before handing off to generation.
- **Staleness-while-valid**: a TTL-based cache entry can be technically fresh while logically obsolete (a stakeholder was updated 5 minutes after the bundle was created but before generation ran). The fingerprint-based invalidation covers this only if the entity mutation updates the stored fingerprint — verified to be true for entity-table changes, but not yet true for all `project` table field updates.

## 6. Action Items

1. Publish a JSON schema for `ContextBundle` so stage contracts are enforced at the type level rather than inferred from runtime shapes.
2. Add a fingerprint-update trigger on every `UPDATE` to `projects` and `documents` that feeds into `contextFreshness`, closing the staleness-while-valid gap above.
3. Document the variable-resolution precedence order in the template authoring guide (`docs/06-features/TEMPLATE_CONTENT_STRUCTURE.md`).
4. Register Context Management as a governed feature packet in `server/governed-features.manifest.json`.

## 7. References

- `server/src/services/extraction/` — entity registry output that feeds context gathering
- `server/src/services/contextBundle/`, `server/src/services/contextInjection/`, `server/src/services/contextRetrieval/`, `server/src/services/contextFreshness/`, `server/src/services/contextRepository/`, `server/src/services/contextAccessControl/`, `server/src/services/variableResolution/` — context pipeline modules
- `server/src/modules/documentTemplates/types.ts` — template metadata that controls injection configuration
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — the generation stage that consumes this pipeline's output
