import { NotFoundError, ValidationError } from "../../../middleware/errorHandler"
import aiSearchRAGService from "../../../services/aiSearchRAGService"
import {
  OpenUIChatService,
  type OpenUIChatUserMessage,
} from "../../../modules/openuiChat/OpenUIChatService"
import type {
  OpenUIChatRepository,
  OpenUIChatThread,
} from "../../../modules/openuiChat/OpenUIChatRepository"

jest.mock("../../../services/aiSearchRAGService", () => ({
  __esModule: true,
  default: {
    assembleContext: jest.fn(),
  },
}))

jest.mock("ai", () => ({
  streamText: jest.fn(),
}))

jest.mock("@ai-sdk/google", () => ({
  google: jest.fn(() => "mock-google-model"),
}))

jest.mock("@/lib/openui/systemPrompt", () => ({
  buildOpenUISystemPrompt: jest.fn(() => "mock openui system prompt"),
  buildOpenUIUserMessage: jest.fn((options: { prompt: string; ragContext?: string; projectName?: string }) => {
    const parts = [options.ragContext, options.projectName ? `Project: ${options.projectName}` : "", options.prompt]
    return parts.filter(Boolean).join("\n")
  }),
}))

import { streamText } from "ai"

const mockedStreamText = jest.mocked(streamText)

function mockLangStream(chunks: string[]) {
  mockedStreamText.mockResolvedValue({
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk
      }
    })(),
  } as Awaited<ReturnType<typeof streamText>>)
}

describe("OpenUIChatService", () => {
  const mockedAiSearchRAGService = jest.mocked(aiSearchRAGService)

  function createRepositoryMock() {
    return {
      appendMessage: jest.fn(),
      getThread: jest.fn(),
      listThreads: jest.fn(),
    } as unknown as jest.Mocked<Pick<OpenUIChatRepository, "appendMessage" | "getThread" | "listThreads">>
  }

  function createUserMessage(content: string): OpenUIChatUserMessage {
    return {
      role: "user",
      content,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLangStream(["<Tabs title=\"Test\" />"])
  })

  test("passes the selected project into assisted context assembly", async () => {
    const repository = createRepositoryMock()
    repository.appendMessage
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Project scope prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-1",
          threadId: "thread-1",
          userId: "user-1",
          role: "user",
          content: "Project scope prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Project scope prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-2",
          threadId: "thread-1",
          userId: "user-1",
          role: "assistant",
          content: { type: "text", text: "Scoped answer" },
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })

    mockedAiSearchRAGService.assembleContext.mockResolvedValue({
      contextPrompt: "Scoped project evidence",
      sources: [{ id: "project-1" }],
    } as any)

    const service = new OpenUIChatService(repository as unknown as OpenUIChatRepository)
    const response = await service.streamReply({
      user: { id: "user-1", role: "user" } as any,
      projectId: "project-1",
      message: createUserMessage("Project scope prompt"),
      reportMode: false,
    })

    expect(mockedAiSearchRAGService.assembleContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Project scope prompt",
        projectIds: ["project-1"],
      }),
      "user-1"
    )
    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining("Scoped project evidence"),
          }),
        ],
      })
    )
    await expect(response.text()).resolves.toContain("event: text")
  })

  test("rejects blank user content before persisting the thread", async () => {
    const repository = createRepositoryMock()
    const service = new OpenUIChatService(repository as unknown as OpenUIChatRepository)

    await expect(
      service.streamReply({
        user: { id: "user-1", role: "user" } as any,
        projectId: "project-1",
        message: createUserMessage("   "),
        reportMode: false,
      })
    ).rejects.toBeInstanceOf(ValidationError)

    expect(repository.appendMessage).not.toHaveBeenCalled()
    expect(mockedAiSearchRAGService.assembleContext).not.toHaveBeenCalled()
  })

  test("degrades gracefully when assisted context assembly fails", async () => {
    const repository = createRepositoryMock()
    repository.appendMessage
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Fallback prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-1",
          threadId: "thread-1",
          userId: "user-1",
          role: "user",
          content: "Fallback prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Fallback prompt",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-2",
          threadId: "thread-1",
          userId: "user-1",
          role: "assistant",
          content: { type: "text", text: "Fallback" },
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })

    mockedAiSearchRAGService.assembleContext.mockRejectedValue(new Error("boom"))

    const service = new OpenUIChatService(repository as unknown as OpenUIChatRepository)
    const response = await service.streamReply({
      user: { id: "user-1", role: "user" } as any,
      projectId: "project-1",
      message: createUserMessage("Fallback prompt"),
      reportMode: false,
    })

    expect(repository.appendMessage).toHaveBeenCalledTimes(1)
    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining("Fallback prompt"),
          }),
        ],
      })
    )
  })

  test("uses basic project context when report mode has no assisted sources", async () => {
    const repository = createRepositoryMock()
    repository.appendMessage
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Project charter report",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-1",
          threadId: "thread-1",
          userId: "user-1",
          role: "user",
          content: "Create a project charter report with risks and recommendations",
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        thread: {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Project charter report",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
        message: {
          id: "message-2",
          threadId: "thread-1",
          userId: "user-1",
          role: "assistant",
          content: { type: "report" },
          createdAt: "2026-05-14T00:00:00.000Z",
        },
      })

    mockedAiSearchRAGService.assembleContext.mockResolvedValue({
      contextPrompt: "No internal ADPA search context was found for query: Create a project charter report with risks and recommendations",
      sources: [],
    } as any)

    const projectFallbackLoader = jest.fn().mockResolvedValue({
      name: "Apollo",
      description: "Digital transformation delivery for the finance platform.",
      framework: "PMBOK 7",
    })

    const service = new OpenUIChatService(
      repository as unknown as OpenUIChatRepository,
      projectFallbackLoader
    )

    const response = await service.streamReply({
      user: { id: "user-1", role: "user" } as any,
      projectId: "project-1",
      message: createUserMessage("Create a project charter report with risks and recommendations"),
      reportMode: true,
    })

    expect(projectFallbackLoader).toHaveBeenCalledWith("project-1")
    expect(mockedStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining("Project: Apollo"),
          }),
        ],
      })
    )
    const payload = await response.text()
    expect(payload).toContain("event: text")
    expect(payload).not.toContain("No internal ADPA search context was found")
  })

  test("returns not found before persisting when a thread is outside the selected project scope", async () => {
    const repository = createRepositoryMock()
    repository.getThread.mockResolvedValue(null)

    const service = new OpenUIChatService(repository as unknown as OpenUIChatRepository)

    await expect(
      service.streamReply({
        user: { id: "user-1", role: "user" } as any,
        projectId: "project-1",
        threadId: "thread-1",
        message: createUserMessage("Continue this thread"),
        reportMode: false,
      })
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(repository.appendMessage).not.toHaveBeenCalled()
  })

  test("remaps repository thread-not-found races to a 404-style error", async () => {
    const repository = createRepositoryMock()
    repository.getThread.mockResolvedValue({
      id: "thread-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Existing thread",
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: "2026-05-14T00:00:00.000Z",
      messages: [],
    } as OpenUIChatThread)
    repository.appendMessage.mockRejectedValue(new Error("OpenUI chat thread not found"))

    const service = new OpenUIChatService(repository as unknown as OpenUIChatRepository)

    await expect(
      service.streamReply({
        user: { id: "user-1", role: "user" } as any,
        projectId: "project-1",
        threadId: "thread-1",
        message: createUserMessage("Continue this thread"),
        reportMode: false,
      })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})