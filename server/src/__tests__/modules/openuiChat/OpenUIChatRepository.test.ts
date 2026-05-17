import { OpenUIChatRepository } from "../../../modules/openuiChat/OpenUIChatRepository"

function createRepositoryWithConnectedClient(client: {
  query: jest.Mock
  release: jest.Mock
}) {
  return new OpenUIChatRepository({
    connect: jest.fn().mockResolvedValue(client),
    query: jest.fn(async () => {
      throw new Error("db.query should not be used when a connected client is available")
    }),
  } as never)
}

describe("OpenUIChatRepository", () => {
  it("creates a new thread and returns the appended user message on success", async () => {
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const client = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] }
        }

        if (sql.includes("INSERT INTO public.openui_chat_threads")) {
          expect(params).toEqual(["user-1", "project-1", "Planning sync"])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Planning sync",
                created_at: createdAt,
                updated_at: createdAt,
              },
            ],
          }
        }

        if (sql.includes("INSERT INTO public.openui_chat_messages")) {
          expect(params).toEqual([
            "thread-1",
            "user-1",
            "user",
            JSON.stringify({ type: "text", text: "Hello" }),
          ])

          return {
            rows: [
              {
                id: "message-1",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "user",
                content: { type: "text", text: "Hello" },
                created_at: createdAt,
              },
            ],
          }
        }

        if (sql.includes("UPDATE public.openui_chat_threads")) {
          expect(params).toEqual(["thread-1", "Planning sync"])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Planning sync",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }

    const repository = new OpenUIChatRepository({
      connect: jest.fn().mockResolvedValue(client),
      query: jest.fn(),
    } as never)

    const result = await repository.appendMessage({
      userId: "user-1",
      projectId: "project-1",
      title: "Planning sync",
      role: "user",
      content: { type: "text", text: "Hello" },
    })

    expect(result).toEqual({
      thread: {
        id: "thread-1",
        userId: "user-1",
        projectId: "project-1",
        title: "Planning sync",
        createdAt,
        updatedAt,
      },
      message: {
        id: "message-1",
        threadId: "thread-1",
        userId: "user-1",
        role: "user",
        content: { type: "text", text: "Hello" },
        createdAt,
      },
    })

    const statements = client.query.mock.calls.map(([statement]) => statement.trim())

    expect(statements[0]).toBe("BEGIN")
    expect(statements).toContain("COMMIT")
    expect(statements.some((statement) => statement.includes("INSERT INTO public.openui_chat_threads"))).toBe(true)
    expect(statements.some((statement) => statement.includes("INSERT INTO public.openui_chat_messages"))).toBe(true)
    expect(statements.some((statement) => statement.includes("UPDATE public.openui_chat_threads"))).toBe(true)
    expect(client.release).toHaveBeenCalledTimes(1)
  })

  it("lists only the current user's threads for the selected project", async () => {
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const client = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (sql.includes("FROM public.openui_chat_threads")) {
          expect(params).toEqual(["user-1", "project-1"])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Visible thread",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }
    const repository = createRepositoryWithConnectedClient(client)

    const threads = await repository.listThreads("user-1", "project-1")

    expect(threads).toHaveLength(1)
    expect(threads[0]).toEqual({
      id: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Visible thread",
      createdAt,
      updatedAt,
    })
    expect(client.release).toHaveBeenCalledTimes(1)
  })

  it("replays structured report payloads from getThread without collapsing JSON content", async () => {
    const reportPayload = {
      type: "report",
      component: "project-summary",
      props: {
        reportId: "report-123",
        sections: [
          { heading: "Risks", body: "Two delivery risks detected" },
          { heading: "Timeline", body: "Milestone slips by 5 days" },
        ],
      },
    }
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const client = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (sql.includes("FROM public.openui_chat_threads")) {
          expect(params).toEqual(["thread-1", "user-1", "project-1"])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Quarterly review",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        if (sql.includes("FROM public.openui_chat_messages")) {
          expect(params).toEqual(["thread-1"])

          return {
            rows: [
              {
                id: "message-1",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "assistant",
                content: reportPayload,
                created_at: createdAt,
              },
              {
                id: "message-2",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "user",
                content: { type: "text", text: "Please keep this thread open" },
                created_at: updatedAt,
              },
            ],
          }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }
    const repository = createRepositoryWithConnectedClient(client)

    const thread = await repository.getThread("thread-1", "user-1", "project-1")

    expect(thread).not.toBeNull()
    expect(thread).toMatchObject({
      id: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Quarterly review",
    })
    expect(thread?.messages).toHaveLength(2)
    expect(thread?.messages[0]).toMatchObject({
      role: "assistant",
      content: reportPayload,
    })
    expect(thread?.messages[0].content).toEqual(reportPayload)
    expect(thread?.messages[1]).toMatchObject({
      role: "user",
      content: { type: "text", text: "Please keep this thread open" },
    })
    expect(client.release).toHaveBeenCalledTimes(1)
  })

  it("returns null from getThread when the thread belongs to a different project", async () => {
    const client = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (sql.includes("FROM public.openui_chat_threads")) {
          expect(params).toEqual(["thread-1", "user-1", "project-2"])
          return { rows: [] }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }
    const repository = createRepositoryWithConnectedClient(client)

    const thread = await repository.getThread("thread-1", "user-1", "project-2")

    expect(thread).toBeNull()
    expect(client.release).toHaveBeenCalledTimes(1)
  })

  it("rolls back appendMessage when the thread update fails", async () => {
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const failingClient = {
      query: jest.fn(async (statement: string) => {
        const sql = statement.trim()

        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] }
        }

        if (sql.includes("INSERT INTO public.openui_chat_threads")) {
          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Atomic thread",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        if (sql.includes("INSERT INTO public.openui_chat_messages")) {
          return {
            rows: [
              {
                id: "message-1",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "user",
                content: { type: "text", text: "Hello" },
                created_at: createdAt,
              },
            ],
          }
        }

        if (sql.includes("UPDATE public.openui_chat_threads")) {
          throw new Error("update failed")
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }

    const transactionalRepository = new OpenUIChatRepository({
      connect: jest.fn().mockResolvedValue(failingClient),
      query: jest.fn(),
    } as never)

    await expect(
      transactionalRepository.appendMessage({
        userId: "user-1",
        projectId: "project-1",
        title: "Atomic thread",
        role: "user",
        content: { type: "text", text: "Hello" },
      })
    ).rejects.toThrow("update failed")

    const statements = failingClient.query.mock.calls.map(([statement]) => statement.trim())

    expect(statements[0]).toBe("BEGIN")
    expect(statements).toContain("ROLLBACK")
    expect(statements.some((statement) => statement === "COMMIT")).toBe(false)
    expect(statements.some((statement) => statement.includes("INSERT INTO public.openui_chat_threads"))).toBe(true)
    expect(statements.some((statement) => statement.includes("INSERT INTO public.openui_chat_messages"))).toBe(true)
    expect(statements.some((statement) => statement.includes("UPDATE public.openui_chat_threads"))).toBe(true)
    expect(failingClient.release).toHaveBeenCalledTimes(1)
  })

  it("uses a savepoint when appendMessage runs against an already-connected transactional client", async () => {
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const connectedClient = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (
          sql === "SAVEPOINT openui_chat_append_message" ||
          sql === "RELEASE SAVEPOINT openui_chat_append_message"
        ) {
          return { rows: [] }
        }

        if (sql.includes("SELECT id, user_id, project_id, title, created_at, updated_at")) {
          expect(params).toEqual(["thread-1", "user-1", "project-1"])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Existing thread",
                created_at: createdAt,
                updated_at: createdAt,
              },
            ],
          }
        }

        if (sql.includes("INSERT INTO public.openui_chat_messages")) {
          expect(params).toEqual([
            "thread-1",
            "user-1",
            "assistant",
            JSON.stringify({ type: "text", text: "Reply" }),
          ])

          return {
            rows: [
              {
                id: "message-1",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "assistant",
                content: { type: "text", text: "Reply" },
                created_at: updatedAt,
              },
            ],
          }
        }

        if (sql.includes("UPDATE public.openui_chat_threads")) {
          expect(params).toEqual(["thread-1", null])

          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Existing thread",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }
    const repository = new OpenUIChatRepository(connectedClient as never)

    const result = await repository.appendMessage({
      threadId: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      role: "assistant",
      content: { type: "text", text: "Reply" },
    })

    expect(result).toEqual({
      thread: {
        id: "thread-1",
        userId: "user-1",
        projectId: "project-1",
        title: "Existing thread",
        createdAt,
        updatedAt,
      },
      message: {
        id: "message-1",
        threadId: "thread-1",
        userId: "user-1",
        role: "assistant",
        content: { type: "text", text: "Reply" },
        createdAt: updatedAt,
      },
    })

    const statements = connectedClient.query.mock.calls.map(([statement]) => statement.trim())

    expect(statements[0]).toBe("SAVEPOINT openui_chat_append_message")
    expect(statements).toContain("RELEASE SAVEPOINT openui_chat_append_message")
    expect(statements.some((statement) => statement === "BEGIN")).toBe(false)
    expect(statements.some((statement) => statement === "COMMIT")).toBe(false)
    expect(statements.some((statement) => statement === "ROLLBACK")).toBe(false)
    expect(statements.some((statement) => statement === "ROLLBACK TO SAVEPOINT openui_chat_append_message")).toBe(false)
    expect(connectedClient.release).not.toHaveBeenCalled()
  })

  it("uses the connected client for listThreads and getThread reads", async () => {
    const createdAt = new Date("2026-05-14T12:00:00.000Z")
    const updatedAt = new Date("2026-05-14T12:01:00.000Z")
    const client = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        const sql = statement.trim()

        if (sql.includes("FROM public.openui_chat_threads") && params?.length === 2) {
          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Connected thread",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        if (sql.includes("FROM public.openui_chat_threads") && params?.length === 3) {
          return {
            rows: [
              {
                id: "thread-1",
                user_id: "user-1",
                project_id: "project-1",
                title: "Connected thread",
                created_at: createdAt,
                updated_at: updatedAt,
              },
            ],
          }
        }

        if (sql.includes("FROM public.openui_chat_messages")) {
          return {
            rows: [
              {
                id: "message-1",
                thread_id: "thread-1",
                user_id: "user-1",
                role: "assistant",
                content: { type: "text", text: "Hello from connected client" },
                created_at: createdAt,
              },
            ],
          }
        }

        throw new Error(`Unexpected SQL: ${sql}`)
      }),
      release: jest.fn(),
    }

    const connectBasedRepository = new OpenUIChatRepository({
      connect: jest.fn().mockResolvedValue(client),
      query: jest.fn(async () => {
        throw new Error("db.query should not be used for read operations")
      }),
    } as never)

    const threads = await connectBasedRepository.listThreads("user-1", "project-1")
    const thread = await connectBasedRepository.getThread("thread-1", "user-1", "project-1")

    expect(threads).toHaveLength(1)
    expect(threads[0]).toMatchObject({
      id: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Connected thread",
    })
    expect(thread).toMatchObject({
      id: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Connected thread",
      messages: [
        {
          id: "message-1",
          role: "assistant",
          content: { type: "text", text: "Hello from connected client" },
        },
      ],
    })
    expect(client.release).toHaveBeenCalledTimes(2)
  })
})