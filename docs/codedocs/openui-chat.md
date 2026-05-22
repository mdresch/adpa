---
title: "OpenUI Chat"
description: "Project-scoped OpenUI Lang chat (Gemini SSE), thread persistence, and GenUI rendering."
---

Project OpenUI Chat is the **full-screen advisor** at `/openui-chat`: pick a project, use persisted threads, stream **OpenUI Lang** from Gemini, and render the merged **GenUI + Bullets** library.

For the **document GenUI workspace** (split-pane document + Mistral at `/projects/{id}/documents/genui`), see [Document GenUI Workspace](/docs/genui-workspace).

| Surface | Route | LLM | Library | Chat API |
| --- | --- | --- | --- | --- |
| Project OpenUI Chat | `/openui-chat` | Gemini (`GOOGLE_AI_API_KEY` in `server/.env`) | `projectOpenUILibrary` | `POST /api/v1/openui-chat/chat` (SSE) |
| Document GenUI | `/projects/.../genui` | Mistral (`.env.local`) | `projectOpenUILibrary` | `POST /api/chat` |

Agent skills: `.agents/skills/adpa-openui-chat/SKILL.md`, `.agents/skills/adpa-genui-workspace/SKILL.md`.

## Source map

| Concern | Files |
| --- | --- |
| Page + shell | `app/openui-chat/page.tsx`, `components/openui-chat/openui-chat-shell.tsx` |
| FullScreen + SSE | `components/openui-chat/openui-chat-fullscreen-panel.tsx` |
| Thread sync (no reload mid-stream) | `components/openui-chat/openui-chat-thread-sync.tsx` |
| SSE adapter | `lib/openui/streaming.ts` |
| System prompt + starters | `lib/openui/systemPrompt.ts`, `lib/openui/project-chat-prompts.ts` |
| **Canonical library** | `lib/openui/projectOpenUILibrary.ts`, `lib/openui/bulletsDef.tsx` |
| Rendering | `components/openui-chat/AssistantMessage.tsx`, `DynamicComponentRenderer.tsx` |
| Lang helpers | `lib/openui/library.ts` |
| Backend | `server/src/modules/openuiChat/` |
| Tests | `__tests__/lib/openui-streaming.test.ts`, `__tests__/lib/projectOpenUILibrary.test.ts` |
| Schema | `server/migrations/409_create_openui_chat_tables.sql` |

## Library contract

`projectOpenUILibrary` merges **all** components from `@openuidev/react-ui/genui-lib` plus ADPA `Bullets`. Use it for:

- `FullScreen` `componentLibrary`
- `Renderer` `library` in `DynamicComponentRenderer`
- `projectOpenUILibrary.prompt(openuiPromptOptions)` in `buildOpenUISystemPrompt()`

Do **not** use bare `openuiLibrary` when prompts mention Bullets (renderer will log `unknown-component`). Do **not** use `adpaLibrary` for new OpenUI Lang threads (legacy `Report(...)` grammar).

Prompt rules in `systemPrompt.ts` require **Stack / Card / Accordion / Table** layouts — not a single top-level `Bullets` assignment.

## Route contract

Mounted at `/api/v1/openui-chat` (JWT required).

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/chat` | SSE stream of OpenUI Lang (`text` / `done` / `error` events via `adpaOpenUIChatStreamAdapter`) |
| `GET` | `/threads?projectId=` | List threads for project |
| `GET` | `/threads/:id?projectId=` | Thread + messages |

Request body (chat): `projectId`, `messages` (last must be `user`), optional `threadId`, optional `documentId`.

The frontend panel calls `/api/v1/openui-chat/...` with the auth bearer token. Next rewrites `/api/v1/*` to Express (`BACKEND_URL`).

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `GOOGLE_AI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | `server/.env` | Gemini in `OpenUIChatService` |
| `BACKEND_URL` | `.env.local` | Next → Express proxy |
| Auth | cookie / Firebase | Required for API |

## Streaming and threads

1. User sends a message; `OpenUIChatService` persists user + assistant rows.
2. Gemini streams OpenUI Lang; frontend `streamProtocol` uses `adpaOpenUIChatStreamAdapter`.
3. **`x-thread-id`** may arrive mid-stream — panel resolves thread id on **`onStreamDone`** only, so `OpenUIChatThreadSync` does not abort an in-flight stream.
4. Assistant content is parsed/rendered by `CustomAssistantMessage` → `DynamicComponentRenderer` + `projectOpenUILibrary`.

## Persistence

Tables from migration `409` (`openui_chat_threads`, `openui_chat_messages` with JSONB `content`). Use migration `409` shape (UUID FKs) — not the alternate `410` draft.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Empty assistant / message disappears mid-stream | Thread sync during `isRunning`; see `openui-chat-thread-sync.tsx` |
| `unknown-component` for Bullets | Renderer must use `projectOpenUILibrary` |
| `unknown-component` for Card/Table | Same — do not use Bullets-only custom library |
| Only Bullets rendered | Model output; verify library test; strengthen user prompt / starters |
| 401 | Auth token / login |
| 503 / no stream | `GOOGLE_AI_API_KEY` in `server/.env`, backend running |
| 404 thread | `projectId` + `threadId` match persisted thread |

## Related docs

- [Document GenUI Workspace](/docs/genui-workspace)
- `AGENTS.md` — startup, ports, env files
