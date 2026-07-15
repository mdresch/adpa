# ADR-007: xAI Integration for Developer Tools Suite (Markdown to UI)

## Status

Proposed

## Context

The ADPA system requires a standardized framework to ingest plain-English developer queries, translate them via the xAI provider engine (`grok-build-0.1`), and progressively render them into structured, highly interactive user experiences.

The suite spans four distinct developer tools — SQL Studio, Code Lens, Regex Forge, and Code Tutor — each of which needs the same underlying pipeline shape: securely call xAI, parse and sanitize the streamed response into typed structures, then render those structures into a live, dark-themed developer UI. This ADR defines that pipeline as three explicit tiers (**L0/L1/L2**), scoped entirely to the xAI request/response lifecycle and its UI rendering.

Note: an earlier draft of this ADR linked L1 to a digital-twin verification hook (then-ADR-006). That link has been removed — this suite's generated artifacts (SQL DDL, file trees, regex tokens, sandboxed code) have no real connection to ADPA's actual Digital Twin schema (`dt_assets`/`dt_relationships`/`dt_telemetry`, see [ADR-006](ADR-006-digital-twin-l0-conformance-verification.md)), which validates AI-generated asset-register YAML, not arbitrary developer-tool output. This suite's pipeline is complete and self-contained without any such hook.

## Decision

We will adopt an isolated, server-brokered adapter pattern paired with a three-tier pipeline architecture for translating xAI output into interactive UI.

### 1. The Pipeline Tiers

* **Level 0 (L0): Data Ingestion & Server Configuration**
  * **Responsibility:** Baseline environment configuration, credential verification, and raw upstream API requests.
  * **Pre-Flight Security:** A mandatory pre-flight script runs on `npm run dev`/`start`. If `XAI_API_KEY` is missing, the server process crashes (`exit 1`) with an error message directing users to `https://console.x.ai`.
  * **Network Isolation:** All `POST https://api.x.ai/v1/responses` calls are executed within `lib/grok.ts` or `server/grok.ts`. No browser component may access this layer.

* **Level 1 (L1): Semantic Extraction & Parsing**
  * **Responsibility:** Processing raw markdown strings, parsing stream fragments, and converting text payloads into typed JSON models.
  * **JSON Sanitization Routine:** Structured tools filter responses through an iterative fallback parser (`JSON.parse` → Markdown block stripping → Substring `{` to `}` extraction → Raw string diagnostic fallback).
  * **Stream Proxying:** For chat interactions, L1 establishes an end-to-end `ReadableStream` (SSE) mapping `response.output_text.delta` tokens and respects an `AbortController` signal to terminate upstream billable generation immediately.

* **Level 2 (L2): Interactive UI Components**
  * **Responsibility:** Rendering the semantic models into high-fidelity, interactive, dark-themed developer interfaces.
  * **Markdown-to-UI Component Pipelines:** Transformations turn flat text streams into fully active visual blocks.

### 2. Application-Specific L2 Allocations

Each application in the suite implements the L1 parsing tier to drive its respective L2 visual configuration:

| Application | L2 Inputs & Layout | L2 Output Controls | Example Scenarios |
| --- | --- | --- | --- |
| **SQL Studio** | Left pane: schema text editor + question textarea. Dark developer aesthetic. | Right pane: Glowing SQL output card, copy elements, and query explanations. | 1. SaaS revenue by plan over time.<br>2. Ecommerce repeat purchases.<br>3. Support ticket SLA breaches. |
| **Code Lens** | Three-pane split layout: Left-hand file/directory tree upload (`webkitdirectory`); Middle file code viewer; Right analysis panel. | Task toggles (Explain, Fix, Test, Suggest) implemented as chip switches. | 1. JS off-by-one loop bug.<br>2. Python empty-list edge case.<br>3. TypeScript missing unit-test candidate. |
| **Regex Forge** | Plain-text description bar + interactive flag modifier chips (`g`, `i`, `m`, `s`, `u`). | Split component token breakdown lists. Highlighting live-updater text area running locally. | 1. US phone numbers.<br>2. Email address extraction.<br>3. ISO 8601 date validation. |
| **Code Tutor** | Vertical chat window layout with a sticky bottom message composer. Auto-scroll typing indicators. | Progressively parsed stream code blocks with copy indicators and a "Run" action triggering sandboxed Web Worker execution. | 1. TypeScript debounce logic.<br>2. Python linked-list reversal.<br>3. JS Async/Await vs Promises. |

## Consequences

* **Positive:** A single, consistent tiered pipeline (ingest → parse/stream → render) reused across all four developer tools, keeping xAI credential handling and network access isolated to one layer (L0).
* **Negative:** Introduces runtime latency at the L1 processing tier due to streaming/parsing overhead.
* **Risks:** Tight coupling to the xAI API and `grok-build-0.1` specifics. Minimized by isolating all xAI calls to `lib/grok.ts` / `server/grok.ts`, so a provider or model change is a single-layer change.

## Related ADRs

None. This suite's pipeline is self-contained; see the note in Context on why the earlier link to digital-twin verification was removed.
