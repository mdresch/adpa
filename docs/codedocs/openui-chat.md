---
title: "OpenUI Chat"
description: "Project-scoped chat threads, structured assistant payloads, and the OpenUI chat HTTP contract."
---

OpenUI chat is a project-scoped assistant surface that stores chat history in PostgreSQL and returns structured UI payloads over Server-Sent Events (SSE). It is implemented by the Express module in `server/src/modules/openuiChat` and consumed by the Next.js pages under `app/openui-chat` and `app/ai/openui-chat`.

For the **document GenUI workspace** (split-pane document + advisor at `/projects/{id}/documents/genui`), see [Document GenUI Workspace](/docs/genui-workspace). That surface uses `POST /api/chat` with a document-embedded system prompt and Mistral streaming—not the `/api/v1/openui-chat` thread APIs described below.

## Source Map

| Concern | Source files |
| --- | --- |
| Express routes | `server/src/modules/openuiChat/routes.ts` |
| Request validation and streaming bridge | `server/src/modules/openuiChat/OpenUIChatController.ts` |
| Context assembly and assistant payload creation | `server/src/modules/openuiChat/OpenUIChatService.ts` |
| Thread/message persistence | `server/src/modules/openuiChat/OpenUIChatRepository.ts` |
| Shared payload types and SSE parsing helpers | `lib/openui/library.ts` |
| Component selection heuristics | `lib/openui/componentSelector.ts` |
| Primary chat shell | `app/openui-chat/page.tsx`, `components/openui-chat/openui-chat-shell.tsx` |
| Alternate AI page | `app/ai/openui-chat/page.tsx` |
| Next.js proxy handlers | `app/api/chat/route.ts`, `app/api/openui-chat/threads/route.ts`, `app/api/openui-chat/threads/[id]/route.ts` |
| Database schema expected by the repository | `server/migrations/409_create_openui_chat_tables.sql` |

## Route Contract

The backend module is mounted in `server/src/server.ts` at:

```txt
/api/v1/openui-chat
```

All backend routes require `authenticateToken`, so direct callers must send a JWT bearer token.

| Method | Path | Required input | Response |
| --- | --- | --- | --- |
| `POST` | `/api/v1/openui-chat/chat` | JSON body with `projectId` and a non-empty `messages` array whose last item has `role: "user"` and extractable text | `text/event-stream` with one `message` event containing a JSON assistant payload |
| `GET` | `/api/v1/openui-chat/threads?projectId=<uuid>` | `projectId` query string | `{ "threads": [...] }` |
| `GET` | `/api/v1/openui-chat/threads/:id?projectId=<uuid>` | `projectId` query string and thread id path param | `{ "thread": ... }` or `404` |

Example direct request:

```bash
curl -N http://localhost:5000/api/v1/openui-chat/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "projectId": "00000000-0000-0000-0000-000000000000",
    "messages": [
      { "role": "user", "content": "Create a charter report summary" }
    ]
  }'
```

The response body uses the SSE shape produced by `OpenUIChatService`:

```txt
event: message
data: {"type":"report","component":"ReportOverview","props":{"title":"Project charter report","projectId":"...","threadId":"...","prompt":"Create a charter report summary","supportingEvidence":3,"synopsis":"..."}}
```

The current implementation returns a single structured SSE event. It is not token-by-token model streaming.

## Frontend Routing and Auth Modes

There are two supported call paths:

1. **Primary authenticated shell**: `components/openui-chat/openui-chat-shell.tsx` calls `/api/v1/openui-chat/...` with the React auth context bearer token. Because `next.config.mjs` excludes paths that begin with `morphic`, `auth`, `chat`, and `openui-chat` after `/api/`, requests beginning with `/api/v1/...` are rewritten to the Express backend.
2. **Next.js cookie proxy routes**: `app/api/chat/route.ts` and `app/api/openui-chat/threads/*` read the `auth_token` cookie and proxy to `${BACKEND_URL}/api/v1/openui-chat/...`. Use these routes when the browser should not assemble the `Authorization` header directly.

`BACKEND_URL` defaults to `http://localhost:5000` in the proxy route handlers. Production deployments should set it explicitly so server-side proxy calls target the deployed Express API.

## Request Workflow

1. The client sends `projectId`, optional `threadId`, and chat `messages`.
2. `OpenUIChatController` validates authentication, `projectId`, message array shape, the last user message, and extractable message text.
3. The controller enables report mode when the latest user content includes a `reportMode: true` flag, an `intent` of `report` or `charter`, or text matching `charter` or `report`.
4. `OpenUIChatService.streamReply` creates or updates a thread and persists the user message.
5. The service calls `aiSearchRAGService.assembleContext` with `projectIds: [projectId]`, relationship depth 2, knowledge-base inclusion, and a larger context limit in report mode.
6. If report mode has no RAG sources, the service loads a fallback project summary from the `projects` table.
7. `selectComponentType` chooses a component type from prompt keywords and source count. Report mode always returns a `ReportOverview` payload.
8. The assistant payload is persisted as JSONB and returned as one SSE `message` event.

## Persistence Model

`OpenUIChatRepository` expects the schema from `server/migrations/409_create_openui_chat_tables.sql`:

```sql
CREATE TABLE public.openui_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New thread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.openui_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.openui_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Messages store structured assistant responses as JSONB. This keeps the persisted canonical value replayable by UI renderers without storing generated PDF or DOCX artifacts.

## Operational Constraints and Pitfalls

- `server/migrations/410_create_openui_chat_tables.sql` defines a second, incompatible table shape with text user/project identifiers. The repository code targets the UUID and foreign-key shape from migration `409`.
- `projectId` should be a real project UUID. The repository contains a compatibility fallback for `"default"` and `"test"` that selects the first project in the database; do not rely on that fallback for new clients.
- The OpenUI design plan references richer OpenUI package integration, but the current TSX implementation renders with local components and deterministic structured payloads.
- Context assembly failures are logged and do not abort the request. The returned payload can have `supportingEvidence: 0` and a fallback synopsis.
- The thread APIs always filter by both `user_id` and `project_id`; callers must pass the same project id used to create the thread.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `401 Unauthorized` | Confirm `Authorization: Bearer <token>` for `/api/v1/...` or an `auth_token` cookie for Next proxy routes. |
| `400 projectId is required` | Send `projectId` in the JSON body for `POST /chat` or as a query string for thread reads. |
| `400 A user message is required as the last message` | Ensure the last item in `messages` has `role: "user"`. |
| `404 Thread not found` | Confirm the `threadId`, `userId`, and `projectId` combination matches an existing thread. |
| Empty or generic assistant context | Check RAG source availability for the selected project and the backend logs for `[OPENUI-CHAT] Assisted context assembly failed`. |
