---
title: "Document GenUI Workspace"
description: "Split-pane document viewer plus OpenUI advisor: routes, rendering pipeline, environment, and maintenance guide."
---

The **document GenUI workspace** lets users read an extracted governance document on the left and chat with an AI advisor on the right. The advisor can return **OpenUI Lang**, which the UI renders as interactive components (cards, tables, charts, tabs, steps).

This page is **not** the same as [OpenUI Chat](/docs/openui-chat), which is project-scoped chat backed by `server/src/modules/openuiChat` with thread persistence and RAG. The document workspace uses a separate HTTP path and Mistral streaming.

For agent-driven maintenance, see `.agents/skills/adpa-genui-workspace/SKILL.md` and the **Document GenUI workspace** section in `AGENTS.md`.

## User-facing URL

```txt
/projects/{projectId}/documents/genui?docId={documentId}
```

Helper: `getProjectDocumentGenUIPath(projectId, documentId)` in `lib/documents/document-routes.ts`.

Navigation from other document modes (View, Source, Report) uses `DocumentPageToolbar` with mode `genui`.

## Layout

| Pane | Purpose |
| --- | --- |
| **Step 1 — Source document** | Title, metadata, word count, full extracted `doc.content` from the documents API |
| **Step 2 — Ask the AI** | OpenUI `FullScreen` chat: starters, streaming replies, **New chat** (client session reset) |

Styling lives in `app/projects/[id]/documents/genui/genui-workspace.css` (light theme, panel-sized OpenUI shell, sidebar hidden inside the embed).

## Source map

| Concern | Files |
| --- | --- |
| Main page | `app/projects/[id]/documents/genui/page.tsx` |
| Workspace CSS | `app/projects/[id]/documents/genui/genui-workspace.css` |
| Error UI | `app/projects/[id]/documents/genui/error.tsx` |
| Chat proxy (Mistral) | `app/api/chat/route.ts` |
| Assistant rendering | `components/openui-chat/AssistantMessage.tsx` (re-exported from `components/Chat/AssistantMessage.tsx`) |
| Lang → components | `components/openui-chat/DynamicComponentRenderer.tsx` |
| Canonical library | `lib/openui/projectOpenUILibrary.ts`, `lib/openui/bulletsDef.tsx`, `lib/openui/systemPrompt.ts` |
| Fence stripping / detection | `lib/openui/library.ts` — `extractOpenUILangText()`, `looksLikeOpenUILang()` |
| Conversation starters | `lib/documents/document-chat-prompts.ts` |
| Route IDs | `lib/documents/use-project-document-route-ids.ts` |
| Toolbar / GenUI button | `components/documents/DocumentPageToolbar.tsx` |

## Request and rendering flow

1. The page loads the document via the authenticated documents API (`projectId` + `documentId`).
2. It builds a **system prompt** from `buildOpenUISystemPrompt()` (`projectOpenUILibrary.prompt()` + layout rules in `lib/openui/systemPrompt.ts`) plus the full document body and metadata.
3. `FullScreen` posts to `POST /api/chat` with `{ systemPrompt, messages }`.
4. When `systemPrompt` is present, `app/api/chat/route.ts` streams from **Mistral** or **Google Gemini** (`GENUI_LLM_PROVIDER`: `mistral` default, `google` for Gemini via OpenAI-compatible API). Without `systemPrompt`, the same route proxies to backend OpenUI chat (Gemini in `server`).
5. The model should reply in **OpenUI Lang** (e.g. `root = Stack([...])`), sometimes wrapped in ` ```openui-lang ` fences.
6. `CustomAssistantMessage` detects Lang, strips fences, and renders with `@openuidev/react-lang` `Renderer` and **`projectOpenUILibrary`** (full GenUI catalog + Bullets).

```mermaid
flowchart LR
  DocAPI[Documents API] --> Step1[Step 1 pane]
  Step1 --> Prompt[systemPrompt + doc content]
  Prompt --> FullScreen[FullScreen]
  FullScreen --> ApiChat["POST /api/chat"]
  ApiChat --> Llm[Mistral or Gemini stream]
  Llm --> Assistant[CustomAssistantMessage]
  Assistant --> Renderer[Renderer + projectOpenUILibrary]
```

### Rendering pitfalls

- **`assistantMessage={CustomAssistantMessage}` overrides** the default `FullScreen` assistant renderer. If the custom component only shows markdown, users see raw Lang in a code block.
- Use **`projectOpenUILibrary`** for this page (not bare `openuiLibrary` — Bullets will fail; not `adpaLibrary` — legacy Report grammar).
- Prompts should request **Card / Stack / Accordion / Table** layouts, not a single top-level `Bullets` (see `systemPrompt.ts`).
- Always run model output through **`extractOpenUILangText()`** before `looksLikeOpenUILang()` / `Renderer`.

## Environment variables

Set in `.env.local` (see `.env.local.example`):

| Variable | Required for Step 2 | Notes |
| --- | --- | --- |
| `MISTRAL_API_KEY` | Yes | Missing key → 503 from `/api/chat` |
| `MISTRAL_MODEL` | No | Default `mistral-large-latest` |
| `BACKEND_URL` | Step 1 | Document fetch via Express proxy |
| Auth (`auth_token` cookie / Firebase) | Yes | Page requires login |

OpenUI package styles are imported on the page:

```ts
import "@openuidev/react-ui/defaults.css";
import "@openuidev/react-ui/components.css";
```

## Persistence and sessions

- **Threads:** Not stored in `openui_chat_threads` today. Chat state is in-memory in `FullScreen`.
- **New chat:** Increments `chatSessionKey` to remount `FullScreen`; also resets when `documentId` changes.
- **Copy toolbar:** Copies raw document text (Step 1), not the chat transcript.

## Extending the workspace

| Goal | Where to change |
| --- | --- |
| Suggested questions | `lib/documents/document-chat-prompts.ts` |
| Grounding / instructions | `systemPrompt` block in `genui/page.tsx` |
| Layout / contrast / OpenUI embed | `genui-workspace.css` |
| New OpenUI components | Prefer `@openuidev/react-ui/genui-lib` Lang syntax; consult OpenUI docs for grammar |
| Thread history per document | New persistence design — do not break `/api/v1/openui-chat` without a migration plan |
| RAG for large documents | Chunk retrieval from existing server RAG; watch Mistral context limits |

Future PM dashboards are described in `docs/superpowers/specs/2026-05-18-genui-personalized-dashboards-design.md`; that is a separate route from this document workspace.

## Manual test checklist

1. Log in; open `/projects/{id}/documents/genui?docId={uuid}` for a document with body text.
2. Confirm Step 1 shows title, metrics, and extracted content.
3. Confirm Step 2 shows welcome text and conversation starters; input is centered in the right panel.
4. Send a starter (e.g. risks table) — response should be **rendered UI**, not a fenced code block.
5. Use **View source** / **Show rendered** on an assistant message.
6. **New chat** clears the thread; changing document in the toolbar loads the new doc and resets chat.
7. Toolbar links: View, Source, Report, GenUI.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Raw `openui-lang` code block | Assistant path not using `Renderer` + `projectOpenUILibrary` |
| Broken or empty widgets | Wrong library (`adpaLibrary` or bare `openuiLibrary`) |
| `unknown-component` Bullets | Use `projectOpenUILibrary` on renderer |
| Only Bullets in UI | Model chose minimal layout; adjust prompt or user request |
| 503 on send | API key missing for `GENUI_LLM_PROVIDER` |
| 401 on send | Not logged in |
| Empty Step 1 | Document API or missing `doc.content` |
| Chat layout broken | `genui-workspace.css` overrides under `.genui-openui-root` |
| Model ignores document | Empty content or weak system prompt |

## Related documentation

- [OpenUI Chat](/docs/openui-chat) — backend module, threads, SSE payloads
- `docs/superpowers/specs/2026-05-14-openui-chat-design.md` — GenUI strategy for project chat
- `docs/superpowers/specs/2026-05-18-genui-personalized-dashboards-design.md` — future dashboards
- `.agents/skills/adpa-genui-workspace/SKILL.md` — agent maintenance skill
