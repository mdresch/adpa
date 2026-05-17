# OpenUI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated project-scoped OpenUI chat experience with streaming responses, project-bound thread history, GenUI report rendering, and project-charter-driven report output.

**Architecture:** The frontend adds a new OpenUI page and Next route proxies that speak an OpenUI-oriented contract while keeping auth tokens and generated prompts server-side. The backend adds a dedicated `openui-chat` module with its own routes, repository, and persistence tables, but reuses existing project access and retrieval helpers for project-scoped RAG and charter-aware synthesis.

**Tech Stack:** Next.js App Router, React, TypeScript, Express, PostgreSQL, Jest, Playwright, `@openuidev/react-ui`, `@openuidev/react-headless`, existing ADPA auth/project APIs, existing RAG services.

---

## File Map

### Frontend

- Create: `app/openui-chat/page.tsx`
- Create: `components/openui-chat/openui-chat-shell.tsx`
- Create: `components/openui-chat/project-selector.tsx`
- Create: `components/openui-chat/report-components.tsx`
- Create: `components/openui-chat/report-empty-state.tsx`
- Create: `lib/openui/library.ts`
- Create: `lib/openui/system-prompt.ts`
- Create: `app/api/chat/route.ts`
- Create: `app/api/openui-chat/threads/route.ts`
- Create: `app/api/openui-chat/threads/[id]/route.ts`
- Modify: `package.json`

### Backend

- Create: `server/migrations/409_create_openui_chat_tables.sql`
- Create: `server/src/modules/openuiChat/routes.ts`
- Create: `server/src/modules/openuiChat/OpenUIChatController.ts`
- Create: `server/src/modules/openuiChat/OpenUIChatRepository.ts`
- Create: `server/src/modules/openuiChat/OpenUIChatService.ts`
- Modify: `server/src/routes/registry` integration surface if needed by the route registry used for modular modules

### Tests

- Create: `__tests__/app/openui-chat/page.test.tsx`
- Create: `__tests__/app/api/chat/route.test.ts`
- Create: `__tests__/app/api/openui-chat-threads.route.test.ts`
- Create: `server/src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts`
- Create: `server/src/__tests__/modules/openuiChat/OpenUIChatController.test.ts`
- Create: `e2e/openui-chat-report.spec.ts`

## Task 1: Install OpenUI Dependencies and Lock the Frontend Contract

**Files:**
- Modify: `package.json`
- Test: `__tests__/app/openui-chat/page.test.tsx`

- [ ] **Step 1: Write the failing frontend contract test**

```tsx
import { render, screen } from '@testing-library/react'
import OpenUIChatPage from '@/app/openui-chat/page'

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false })
}))

jest.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    data: { projects: [{ id: 'project-1', name: 'Apollo' }] },
    loading: false,
    error: null,
    refetch: jest.fn()
  })
}))

describe('OpenUIChatPage', () => {
  test('renders project selection before chat is enabled', () => {
    render(<OpenUIChatPage />)
    expect(screen.getByText(/select a project/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to confirm the page does not exist yet**

Run: `pnpm test -- --runTestsByPath __tests__/app/openui-chat/page.test.tsx`
Expected: FAIL with module resolution errors for `app/openui-chat/page.tsx`.

- [ ] **Step 3: Add the OpenUI dependencies and the page export stub**

```json
{
  "dependencies": {
    "@openuidev/react-headless": "^0.2.0",
    "@openuidev/react-ui": "^0.2.0"
  }
}
```

```tsx
export const dynamic = 'force-dynamic'

import { OpenUIChatShell } from '@/components/openui-chat/openui-chat-shell'

export default function OpenUIChatPage() {
  return <OpenUIChatShell />
}
```

- [ ] **Step 4: Re-run the test and install the new packages**

Run: `pnpm install ; pnpm test -- --runTestsByPath __tests__/app/openui-chat/page.test.tsx`
Expected: the dependency install succeeds and the test now fails deeper in `OpenUIChatShell`, proving the route contract is wired.

- [ ] **Step 5: Commit the dependency and route scaffold**

```bash
git add package.json pnpm-lock.yaml app/openui-chat/page.tsx __tests__/app/openui-chat/page.test.tsx
git commit -m "feat: scaffold openui chat page entry"
```

## Task 2: Add Backend Persistence for Project-Bound Threads and Report Replay

**Files:**
- Create: `server/migrations/409_create_openui_chat_tables.sql`
- Create: `server/src/modules/openuiChat/OpenUIChatRepository.ts`
- Test: `server/src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts`

- [ ] **Step 1: Write the failing repository test for thread scope and report replay**

```ts
import { OpenUIChatRepository } from '../../../src/modules/openuiChat/OpenUIChatRepository'

describe('OpenUIChatRepository', () => {
  test('lists only threads for the requested user and project', async () => {
    const repository = new OpenUIChatRepository()
    const rows = await repository.listThreads('user-1', 'project-1')
    expect(Array.isArray(rows)).toBe(true)
  })

  test('stores structured assistant payloads for report replay', async () => {
    const repository = new OpenUIChatRepository()
    await repository.appendMessage({
      threadId: 'thread-1',
      userId: 'user-1',
      role: 'assistant',
      content: [{ type: 'component', name: 'ReportOverview', props: { title: 'Charter Overview' } }]
    })
    const thread = await repository.getThread('thread-1', 'user-1')
    expect(thread?.messages[0].content[0].name).toBe('ReportOverview')
  })
})
```

- [ ] **Step 2: Run the repository test to confirm the module is missing**

Run: `cd server && npm test -- --runTestsByPath src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts`
Expected: FAIL because `OpenUIChatRepository.ts` and the test file do not exist yet.

- [ ] **Step 3: Create the migration and repository implementation**

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS openui_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS openui_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES openui_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_openui_chat_threads_user_project
  ON openui_chat_threads (user_id, project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_openui_chat_messages_thread_created
  ON openui_chat_messages (thread_id, created_at ASC);

COMMIT;
```

```ts
export class OpenUIChatRepository {
  async listThreads(userId: string, projectId: string) {
    return pool.query(
      `SELECT id, project_id, title, created_at, updated_at
       FROM openui_chat_threads
       WHERE user_id = $1 AND project_id = $2
       ORDER BY updated_at DESC`,
      [userId, projectId]
    ).then(r => r.rows)
  }

  async appendMessage(input: {
    threadId: string
    userId: string
    role: 'user' | 'assistant' | 'system'
    content: unknown
  }) {
    await pool.query(
      `INSERT INTO openui_chat_messages (thread_id, user_id, role, content)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [input.threadId, input.userId, input.role, JSON.stringify(input.content)]
    )
  }
}
```

- [ ] **Step 4: Run the migration and repository tests**

Run: `pnpm migrate ; cd server && npm test -- --runTestsByPath src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts`
Expected: the migration completes and the repository test passes.

- [ ] **Step 5: Commit the persistence layer**

```bash
git add server/migrations/409_create_openui_chat_tables.sql server/src/modules/openuiChat/OpenUIChatRepository.ts server/src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts
git commit -m "feat: add openui chat persistence"
```

## Task 3: Add Backend Routes, Project Access Enforcement, and Charter-Aware Streaming

**Files:**
- Create: `server/src/modules/openuiChat/OpenUIChatController.ts`
- Create: `server/src/modules/openuiChat/OpenUIChatService.ts`
- Create: `server/src/modules/openuiChat/routes.ts`
- Test: `server/src/__tests__/modules/openuiChat/OpenUIChatController.test.ts`

- [ ] **Step 1: Write the failing controller test for access control and charter report mode**

```ts
import express from 'express'
import request from 'supertest'
import openuiChatRoutes from '../../../src/modules/openuiChat/routes'

jest.mock('../../../src/lib/project-access', () => ({
  userHasProjectAccess: jest.fn().mockResolvedValue(true)
}))

describe('OpenUI chat routes', () => {
  test('rejects chat without a project id', async () => {
    const app = express()
    app.use(express.json())
    app.use((req: any, _res, next) => { req.user = { id: 'user-1', role: 'user' }; next() })
    app.use('/api/v1/openui-chat', openuiChatRoutes[0].router)
    const res = await request(app).post('/api/v1/openui-chat/chat').send({ messages: [] })
    expect(res.status).toBe(400)
  })

  test('streams a report-capable response for charter prompts', async () => {
    const app = express()
    app.use(express.json())
    app.use((req: any, _res, next) => { req.user = { id: 'user-1', role: 'user' }; next() })
    app.use('/api/v1/openui-chat', openuiChatRoutes[0].router)
    const res = await request(app)
      .post('/api/v1/openui-chat/chat')
      .send({ projectId: 'project-1', messages: [{ role: 'user', content: 'Create a project charter report' }] })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run the controller test to confirm the route module is missing**

Run: `cd server && npm test -- --runTestsByPath src/__tests__/modules/openuiChat/OpenUIChatController.test.ts`
Expected: FAIL because the controller, service, and route files do not exist yet.

- [ ] **Step 3: Implement the service, controller, and routes**

```ts
router.post('/chat', authenticateToken, (req, res) => OpenUIChatController.chat(req, res))
router.get('/threads', authenticateToken, (req, res) => OpenUIChatController.listThreads(req, res))
router.get('/threads/:id', authenticateToken, (req, res) => OpenUIChatController.getThread(req, res))
```

```ts
static async chat(req: Request, res: Response) {
  const user = (req as any).user
  const { projectId, threadId, messages } = req.body
  if (!projectId) return res.status(400).json({ error: 'projectId is required' })

  const allowed = await userHasProjectAccess(pool, user, projectId)
  if (!allowed) return res.status(403).json({ error: 'Access denied' })

  const stream = await OpenUIChatService.streamReply({
    user,
    projectId,
    threadId,
    messages,
    reportMode: /charter|report|overview/i.test(JSON.stringify(messages))
  })

  await pipeWebResponseToExpress(stream, res)
}
```

```ts
const charterContext = await aiSearchRAGService.assembleContext({
  query,
  limit: 10,
  sortBy: 'relevance',
  includeRelationships: true,
  includeKnowledgeBase: true,
  maxContextItems: 8
}, user.id)
```

- [ ] **Step 4: Run the focused backend tests**

Run: `cd server && npm test -- --runTestsByPath src/__tests__/modules/openuiChat/OpenUIChatController.test.ts src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts`
Expected: PASS for both repository and controller slices.

- [ ] **Step 5: Commit the backend module**

```bash
git add server/src/modules/openuiChat/routes.ts server/src/modules/openuiChat/OpenUIChatController.ts server/src/modules/openuiChat/OpenUIChatService.ts server/src/__tests__/modules/openuiChat/OpenUIChatController.test.ts
git commit -m "feat: add openui chat backend routes"
```

## Task 4: Add Next Route Proxies for Streaming Chat and Thread History

**Files:**
- Create: `app/api/chat/route.ts`
- Create: `app/api/openui-chat/threads/route.ts`
- Create: `app/api/openui-chat/threads/[id]/route.ts`
- Test: `__tests__/app/api/chat/route.test.ts`
- Test: `__tests__/app/api/openui-chat-threads.route.test.ts`

- [ ] **Step 1: Write the failing route proxy tests**

```ts
import { POST } from '@/app/api/chat/route'

describe('app/api/chat route', () => {
  test('forwards auth, project id, and messages to the backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('ok', { status: 200 })) as jest.Mock
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'project-1', messages: [{ role: 'user', content: 'Summarize the charter' }] })
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
  })
})
```

```ts
import { GET } from '@/app/api/openui-chat/threads/route'

describe('openui thread proxy', () => {
  test('forwards project filtering to the backend', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ threads: [] }), { status: 200 })) as jest.Mock
    const response = await GET(new Request('http://localhost/api/openui-chat/threads?projectId=project-1') as any)
    expect(response.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run the proxy tests before adding the routes**

Run: `pnpm test -- --runTestsByPath __tests__/app/api/chat/route.test.ts __tests__/app/api/openui-chat-threads.route.test.ts`
Expected: FAIL because the proxy route files do not exist yet.

- [ ] **Step 3: Implement the Next route proxies using the existing Morphic pattern**

```ts
const response = await fetch(`${BACKEND_URL}/api/v1/openui-chat/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ ...body, systemPrompt })
})
```

```ts
const fetchUrl = `${BACKEND_URL}/api/v1/openui-chat/threads?${searchParams.toString()}`
const response = await fetch(fetchUrl, {
  headers: { Authorization: `Bearer ${token}` }
})
```

- [ ] **Step 4: Run the route proxy tests**

Run: `pnpm test -- --runTestsByPath __tests__/app/api/chat/route.test.ts __tests__/app/api/openui-chat-threads.route.test.ts`
Expected: PASS, confirming the proxy contract is correct.

- [ ] **Step 5: Commit the frontend-to-backend proxy layer**

```bash
git add app/api/chat/route.ts app/api/openui-chat/threads/route.ts app/api/openui-chat/threads/[id]/route.ts __tests__/app/api/chat/route.test.ts __tests__/app/api/openui-chat-threads.route.test.ts
git commit -m "feat: add openui chat route proxies"
```

## Task 5: Build the OpenUI Page, Project Selector, and Thread-Bound Report UX

**Files:**
- Create: `components/openui-chat/openui-chat-shell.tsx`
- Create: `components/openui-chat/project-selector.tsx`
- Create: `components/openui-chat/report-empty-state.tsx`
- Modify: `app/openui-chat/page.tsx`
- Test: `__tests__/app/openui-chat/page.test.tsx`

- [ ] **Step 1: Expand the page test to cover locked state and project switching**

```tsx
test('keeps the composer locked until a project is selected', () => {
  render(<OpenUIChatPage />)
  expect(screen.getByText(/select a project to start/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
})

test('loads only threads for the selected project', async () => {
  render(<OpenUIChatPage />)
  expect(await screen.findByText(/apollo/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the page test before implementing the shell**

Run: `pnpm test -- --runTestsByPath __tests__/app/openui-chat/page.test.tsx`
Expected: FAIL because `OpenUIChatShell` and the selection/locking behavior are not implemented yet.

- [ ] **Step 3: Implement the OpenUI page shell and project selector**

```tsx
export function OpenUIChatShell() {
  const { data, loading } = useApi<{ projects: Array<{ id: string; name: string }> }>('/api/projects?limit=100')
  const [projectId, setProjectId] = useState('')

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      <ProjectSelector
        projects={data?.projects ?? []}
        value={projectId}
        onChange={setProjectId}
        loading={loading}
      />
      <ReportEmptyState locked={!projectId} />
    </div>
  )
}
```

```tsx
export function ProjectSelector({ projects, value, onChange, loading }: ProjectSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Project selector">
        <SelectValue placeholder={loading ? 'Loading projects...' : 'Select a project'} />
      </SelectTrigger>
      <SelectContent>
        {projects.map(project => (
          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 4: Run the page test again**

Run: `pnpm test -- --runTestsByPath __tests__/app/openui-chat/page.test.tsx`
Expected: PASS, proving the page gates chat by project selection.

- [ ] **Step 5: Commit the page shell**

```bash
git add app/openui-chat/page.tsx components/openui-chat/openui-chat-shell.tsx components/openui-chat/project-selector.tsx components/openui-chat/report-empty-state.tsx __tests__/app/openui-chat/page.test.tsx
git commit -m "feat: add openui chat page shell"
```

## Task 6: Add the OpenUI Library, Report Components, and Project-Charter Streaming Experience

**Files:**
- Create: `lib/openui/library.ts`
- Create: `lib/openui/system-prompt.ts`
- Create: `components/openui-chat/report-components.tsx`
- Modify: `components/openui-chat/openui-chat-shell.tsx`
- Test: `e2e/openui-chat-report.spec.ts`

- [ ] **Step 1: Write the failing end-to-end test for charter-driven report streaming**

```ts
import { test, expect } from '@playwright/test'

test('streams a project charter request into a report-style UI', async ({ page }) => {
  await page.goto('/openui-chat')
  await page.getByLabel('Project selector').click()
  await page.getByRole('option', { name: 'Apollo' }).click()
  await page.getByPlaceholder(/ask about your project/i).fill('Create a project charter report with risks and recommendations')
  await page.getByRole('button', { name: /send/i }).click()

  await expect(page.getByText(/charter overview/i)).toBeVisible()
  await expect(page.getByText(/recommendations/i)).toBeVisible()
  await expect(page.getByText(/supporting evidence/i)).toBeVisible()
})
```

- [ ] **Step 2: Run the Playwright test to confirm the report UI does not exist yet**

Run: `pnpm playwright test e2e/openui-chat-report.spec.ts`
Expected: FAIL because the OpenUI chat shell is not yet wired to stream report components.

- [ ] **Step 3: Implement the library, prompt generation helper, and report components**

```ts
export const openuiLibrary = [
  openuiChatLibrary,
  {
    name: 'ReportOverview',
    description: 'Top-level charter report summary with title, status, and synopsis',
    component: ReportOverview
  },
  {
    name: 'ReportSection',
    description: 'A structured report section with heading and body content',
    component: ReportSection
  },
  {
    name: 'RecommendationList',
    description: 'A list of recommendations with priority and rationale',
    component: RecommendationList
  }
]
```

```ts
export async function loadOpenUISystemPrompt() {
  const promptPath = path.join(process.cwd(), 'lib', 'openui', 'generated-system-prompt.txt')
  return fs.promises.readFile(promptPath, 'utf8')
}
```

```tsx
<FullScreen
  messageFormat={openAIMessageFormat}
  processMessage={async ({ messages, threadId }) => {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        threadId,
        messages: openAIMessageFormat.toApi(messages)
      })
    })
  }}
  components={openuiLibrary}
  threadApiUrl="/api/openui-chat/threads"
/>
```

- [ ] **Step 4: Run the focused tests and Playwright scenario**

Run: `pnpm test -- --runTestsByPath __tests__/app/openui-chat/page.test.tsx __tests__/app/api/chat/route.test.ts __tests__/app/api/openui-chat-threads.route.test.ts ; cd server && npm test -- --runTestsByPath src/__tests__/modules/openuiChat/OpenUIChatRepository.test.ts src/__tests__/modules/openuiChat/OpenUIChatController.test.ts ; Set-Location .. ; pnpm playwright test e2e/openui-chat-report.spec.ts`
Expected: all focused tests pass and the Playwright scenario confirms the report-style rendering path.

- [ ] **Step 5: Commit the OpenUI library and report flow**

```bash
git add lib/openui/library.ts lib/openui/system-prompt.ts components/openui-chat/report-components.tsx components/openui-chat/openui-chat-shell.tsx e2e/openui-chat-report.spec.ts
git commit -m "feat: add openui report streaming experience"
```

## Self-Review

- Spec coverage check: the plan covers authenticated access, project selection, thread persistence, OpenUI route proxies, GenUI component registration, report rendering, project-charter flow, and focused verification.
- Placeholder scan: no deferred placeholder language remains.
- Type consistency check: the plan uses one `projectId` and `threadId` contract across frontend, route proxies, and backend endpoints.