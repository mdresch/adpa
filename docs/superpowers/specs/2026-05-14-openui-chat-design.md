# OpenUI Chat Design

Date: 2026-05-14
Topic: Authenticated project-scoped OpenUI chat for ADPA
Status: Approved

## Goal

Add a new authenticated `openui-chat` experience that lets a user select one of their accessible projects and chat against ADPA's existing backend RAG capabilities through a dedicated OpenUI-based interface with streaming responses, saved thread history, GenUI support, and report-oriented output when the user's request calls for a structured artifact.

## Context

ADPA already has three relevant foundations:

- frontend authentication and API patterns in the Next.js app
- backend project access enforcement and project-scoped retrieval flows
- an existing Morphic chat stack that proves streaming and history patterns but is not the right abstraction for the new OpenUI-first experience

The new work should reuse those foundations where they fit, but the OpenUI page should not be implemented as a thin wrapper around the existing Morphic route. The new page needs a dedicated backend contract so the request shape, thread handling, and GenUI behavior are designed around OpenUI from the start.

## Design Choice

Use a dedicated OpenUI chat slice with these boundaries:

1. A new authenticated page at `app/openui-chat/page.tsx`
2. A Next route handler at `app/api/chat/route.ts` that bridges the browser to the backend streaming endpoint
3. A new backend `openui-chat` endpoint family for chat and thread operations
4. A server-only generated OpenUI system prompt based on an extended ADPA component library built on top of `openuiChatLibrary`

This keeps the UI library contract, thread model, and project-scoped retrieval logic explicit and avoids forcing OpenUI into the Morphic API shape.

## User Experience

The page is available only to authenticated users.

The visual target is a rich web-native experience that uses layout, hierarchy, structured cards, tables, sections, and progressive streaming states to produce polished output instead of plain text-heavy rendering.

When the page loads, the user sees:

- a project selector populated only with projects the user can access
- an empty-state chat shell that remains locked until a project is selected
- an existing thread list for the selected project when threads exist
- starter prompts that help the user begin a project-scoped conversation

Once a project is selected, the user can:

- start a new thread scoped to that project
- continue an existing thread scoped to that same project
- receive streaming responses grounded in that project's available ADPA retrieval context
- see structured UI blocks when the model decides an approved component is more useful than plain text
- ask for report-style outputs, including project-charter-oriented summaries and multi-section report views

Thread scope is single-project. A thread created for one project stays bound to that project and cannot silently switch projects later.

For report-capable prompts, the response should stream progressively into a report-shaped UI rather than waiting for a fully completed plain-text answer. That means the user can see high-level report framing, sections, evidence blocks, and recommendations appear incrementally as the backend continues generating the response.

## Architecture

### Frontend

The page should use OpenUI's `FullScreen` layout as the v1 shell because it provides the highest-value built-in surface for:

- chat composer and message rendering
- thread navigation
- streaming message updates
- built-in expectations around GenUI rendering

The page should use explicit `processMessage(...)` handling instead of a simple `apiUrl` string so it can always include:

- the selected `projectId`
- the active thread identifier when present
- authenticated request context
- the OpenAI-formatted message payload expected by the route handler

The page should use `openAIMessageFormat` so live requests and persisted thread messages share one consistent shape.

### Next Route Handler

`app/api/chat/route.ts` should be the frontend-facing streaming bridge. Its responsibilities are:

- accept the OpenUI client payload from `processMessage(...)`
- load the generated system prompt on the server only
- forward messages plus `projectId` and `threadId` to the backend endpoint
- relay the backend stream back to the browser using the OpenUI-compatible adapter path

This route should not perform retrieval itself. It exists to keep prompt material and backend credentials off the client and to normalize the contract expected by OpenUI.

### Backend

The backend should expose a dedicated `openui-chat` surface rather than overloading the existing Morphic controller. The backend responsibilities are:

- verify the authenticated user
- verify the user can access the requested project
- assemble project-scoped retrieval context from existing RAG services
- stream model output in the format expected by the route handler
- persist threads and messages
- list and load prior threads for the selected project

The backend can reuse existing retrieval and project-access helpers, but the route and controller should be separate so OpenUI-specific behavior does not leak into Morphic and vice versa.

## Data and State Model

### Project Selection

Project selection is required before sending a message.

The selected project should drive:

- the threads that appear in the sidebar
- the retrieval corpus used for responses
- the metadata stored on each new thread

Persisting the most recent selected project locally is reasonable for convenience, but server authorization must remain the source of truth.

### Threads

Each thread should store at minimum:

- `id`
- `userId`
- `projectId`
- `title`
- `createdAt`
- `updatedAt`

Each message should store at minimum:

- `threadId`
- `role`
- `content` in the chosen OpenAI-compatible structure
- optional component-rendering metadata needed for GenUI replay
- timestamps

If a response resolves into a report-style UI, the persisted message payload should preserve enough structured content to replay the same report blocks on thread reload rather than collapsing them back to plain text.

The frontend should use custom thread functions or a custom thread API shape rather than assuming a generic thread endpoint. ADPA needs project-aware filtering and stable replay of generated UI-capable messages.

## Authentication and Authorization

The page is authenticated only.

Authorization requirements:

- page access requires a logged-in user
- project lists must only include projects the user can access
- every chat, thread load, and thread list request must verify project access on the backend
- the backend must reject any attempt to access a thread whose project is not accessible to the current user

The frontend should never be trusted to enforce project boundaries by itself.

## GenUI Strategy

GenUI is included in v1.

The implementation should use `openuiChatLibrary` as the base library and extend it with a small ADPA-specific layer rather than starting from a blank custom library. This gives the model a useful default chat-oriented component surface while still allowing ADPA-specific structured outputs.

Recommended first-wave ADPA components:

- `ProjectSummaryCard`
- `SourceList`
- `EvidenceTable`
- `FollowUpActions`
- `RiskInsightCard`
- `TimelineHighlights`
- `ReportOverview`
- `ReportSection`
- `ReportTableOfContents`
- `FindingSeveritySummary`
- `RecommendationList`
- `EvidenceAppendix`
- `ReportActions`

The library definition should remain intentionally small. The point is to give the model a few high-value, trustworthy rendering options instead of a broad library that is difficult to validate.

The OpenUI system prompt should be generated at build time from the library definition and loaded only on the server. The browser should never receive the raw generated prompt.

## Report Capability

Report capability is included in the design as a GenUI specialization, not as a separate document-generation subsystem.

The first release should support two output modes within the same chat experience:

- conversational responses for ordinary questions
- report-style responses for prompts that ask for structured synthesis, especially project-charter-driven outputs

In practice, this means a user can ask for something like a charter assessment, charter summary, charter-derived plan, or charter-based report, and the returning stream should progressively render a report-oriented UI. The stream should not wait until the entire report is complete before showing useful structure.

### Project Charter Flow

When the selected project has charter material available through the existing retrieval stack, a project-charter request should flow like this:

1. the user selects a project
2. the user asks for a charter-derived output such as an overview, gap summary, structured report, or recommendations
3. the backend retrieves and prioritizes charter-relevant context for that project
4. the model starts streaming a report-shaped response using approved report components
5. the UI progressively fills sections such as overview, objectives, scope, risks, recommendations, and supporting evidence

This should behave like a live report assembly experience inside chat rather than a separate export job.

### Report Boundaries

Included in v1:

- report-style rendering inside the chat thread
- progressive streaming of report sections
- persistence and replay of report-shaped responses inside thread history
- project-charter-based report generation when charter material is available in retrieval context

Excluded from v1:

- standalone report management workflows outside chat
- formal export pipelines such as PDF, DOCX, or slide generation
- long-running offline report jobs
- a separate document editor for post-generation report editing

If the product later needs formal artifact generation, that should be added as a distinct backend capability rather than being hidden inside the chat-streaming contract.

## Library Utilization Checklist

This checklist defines the OpenUI capabilities that should be accounted for now so the implementation uses the library meaningfully instead of treating it as a generic chat wrapper.

### Must Include in V1

- `FullScreen` layout for the main chat surface
- `processMessage(...)` instead of a bare `apiUrl`
- `openAIMessageFormat` for request and replay consistency
- OpenUI-compatible stream adapter flow in the route handler
- project-bound thread history with list, load, create, and continue behavior
- server-only generated system prompt
- `openuiChatLibrary` as the base component library
- ADPA-specific component extensions for structured RAG responses
- report-oriented component extensions for report synthesis and replay
- empty, loading, and locked states around required project selection
- abort-safe streaming behavior
- progressive report-section rendering for report-capable prompts

### Strongly Recommended in V1

- thread metadata that includes project context
- starter prompts after project selection
- replay-safe persistence for messages that can render generated UI
- clear handling for switching between projects and their thread sets
- stable report replay when a thread is reopened
- explicit model guidance on when to use report components versus plain chat components

### Defer Unless a Concrete Need Appears

- a full headless rewrite of the chat shell
- multiple chat protocols or message formats
- cross-project threads
- public or anonymous variants of the page
- a large custom component library built from scratch

## Error Handling

The system should handle these cases explicitly:

- no accessible projects for the user
- project selected on the client but rejected on the server
- missing or deleted thread
- backend retrieval failure for the selected project
- model stream failure mid-response
- malformed generated component payloads
- charter request made when no charter-relevant project context is available

In each case, the UI should keep the thread stable, show a plain-language error, and avoid corrupting persisted conversation state.

## Testing Intent

The implementation plan should cover:

- unit tests for backend authorization and project-thread boundary checks
- unit tests for thread persistence and replay formatting
- route-handler tests for prompt loading and stream adaptation
- frontend tests for locked state, project selection, and thread switching behavior
- focused end-to-end coverage for starting a thread, reopening it, and receiving a structured GenUI-capable response
- focused end-to-end coverage for a project-charter prompt that streams into a report-style response

## Scope Boundaries

Included:

- one authenticated OpenUI chat page
- one selected project per thread
- dedicated backend endpoints for chat and thread history
- reuse of existing RAG services behind a new OpenUI-oriented contract
- GenUI with a constrained approved component set
- report-style output inside chat for charter-driven and similar synthesis prompts

Excluded:

- replacing the existing Morphic experience
- multi-project retrieval in one thread
- public sharing of threads
- broad redesign of unrelated AI-search routes
- speculative expansion of the component library beyond the initial high-value set
- formal document export and standalone report lifecycle management

## Risks and Controls

Risk: OpenUI is added superficially and the implementation falls back to plain-text chat only.
Control: Require the generated prompt, base component library, and at least a small ADPA component extension set in v1.

Risk: Thread history becomes inconsistent because live messages and persisted messages use different schemas.
Control: Standardize on the OpenAI-compatible message format for both transport and persistence.

Risk: Project boundaries leak through reused chat history or thread switching.
Control: Bind each thread to one project and re-check project access on every backend thread operation.

Risk: Morphic and OpenUI responsibilities become tangled.
Control: Keep a dedicated backend route family and controller/service slice for `openui-chat`.

Risk: Report responses become unreliable because the model is given too many loosely defined UI options.
Control: Keep the report component set narrow, provide explicit prompt guidance for when to use each report component, and test replay behavior on persisted report messages.

## Outcome

This design adds a new OpenUI-native chat experience that fits ADPA's existing authentication, project access, and retrieval architecture while taking advantage of the parts of OpenUI that matter most for v1: the built-in fullscreen shell, thread model, streaming contract, message formatting, GenUI component library flow, and report-capable structured output for project-charter and other synthesis-heavy prompts. The intended end-user result is a polished, visual, web-native experience that uses the browser as a rendering surface for rich structured output rather than falling back to plain-text answers.