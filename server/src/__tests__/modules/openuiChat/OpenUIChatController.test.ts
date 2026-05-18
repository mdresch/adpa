import express from "express"
import request from "supertest"

import { NotFoundError } from "../../../middleware/errorHandler"
import { errorHandler } from "../../../middleware/errorHandler"
import openuiChatRoutes from "../../../modules/openuiChat/routes"
import { userHasProjectAccess } from "../../../lib/project-access"
import { OpenUIChatController } from "../../../modules/openuiChat/OpenUIChatController"

let mockUser: { id: string; role: string } | undefined = { id: "user-1", role: "user" }

jest.mock("../../../middleware/auth", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = mockUser
    next()
  },
}))

jest.mock("../../../lib/project-access", () => ({
  userHasProjectAccess: jest.fn(),
}))

jest.mock("@/lib/openui/systemPrompt", () => ({
  buildOpenUISystemPrompt: jest.fn(() => "mock openui system prompt"),
  buildOpenUIUserMessage: jest.fn((options: { prompt: string }) => options.prompt),
}))

describe("OpenUIChatController routes", () => {
  const mockedUserHasProjectAccess = jest.mocked(userHasProjectAccess)

  function createApp() {
    const app = express()
    app.use(express.json())
    app.use("/api/v1/openui-chat", openuiChatRoutes[0].router)
    app.use(errorHandler)
    return app
  }

  beforeEach(() => {
    jest.resetAllMocks()
    mockUser = { id: "user-1", role: "user" }
    mockedUserHasProjectAccess.mockResolvedValue(true)
  })

  test("returns 401 when the request is unauthorized", async () => {
    mockUser = undefined
    const app = createApp()

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({ projectId: "project-1", messages: [{ role: "user", content: "Hello" }] })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: "Unauthorized" })
  })

  test("returns 403 when project access is denied", async () => {
    mockedUserHasProjectAccess.mockResolvedValue(false)
    const app = createApp()

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({ projectId: "project-1", messages: [{ role: "user", content: "Hello" }] })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: "Access denied" })
  })

  test("returns 401 when listing threads without an authenticated user", async () => {
    mockUser = undefined
    const app = createApp()

    const response = await request(app).get("/api/v1/openui-chat/threads").query({ projectId: "project-1" })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: "Unauthorized" })
  })

  test("returns 403 when listing threads without project access", async () => {
    mockedUserHasProjectAccess.mockResolvedValue(false)
    const app = createApp()

    const response = await request(app).get("/api/v1/openui-chat/threads").query({ projectId: "project-1" })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: "Access denied" })
  })

  test("returns 400 when projectId is missing", async () => {
    const app = createApp()

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({ messages: [{ role: "user", content: "Hello" }] })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: "projectId is required" })
  })

  test("returns 400 when thread lookup is missing projectId", async () => {
    const app = createApp()

    const response = await request(app).get("/api/v1/openui-chat/threads/thread-1")

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: "projectId is required" })
  })

  test("returns 400 when the submitted message role is not user", async () => {
    const app = createApp()

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        messages: [
          { role: "user", content: "Initial request" },
          { role: "assistant", content: "Assistant reply" },
        ],
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: "The latest message must be a user message" })
  })

  test("returns 400 when the submitted message content is blank", async () => {
    const app = createApp()

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        messages: [{ role: "user", content: "   " }],
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: "message content is required" })
  })

  test("streams a successful response for charter/report prompts", async () => {
    const app = createApp()

    const streamReplySpy = jest
      .spyOn(OpenUIChatController.service, "streamReply")
      .mockResolvedValue(
        new Response("event: message\ndata: {\"ok\":true}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      )

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        threadId: "thread-1",
        messages: [{ role: "user", content: "Create a project charter report" }],
      })

    expect(response.status).toBe(200)
    expect(streamReplySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        threadId: "thread-1",
        reportMode: true,
      })
    )
  })

  test("returns 404 when chat targets a thread outside the selected project scope", async () => {
    const app = createApp()

    jest
      .spyOn(OpenUIChatController.service, "streamReply")
      .mockRejectedValue(new NotFoundError("OpenUI chat thread"))

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        threadId: "missing-thread",
        messages: [{ role: "user", content: "Continue this thread" }],
      })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      success: false,
      error: {
        message: "OpenUI chat thread not found",
        statusCode: 404,
      },
    })
  })

  test("uses only the submitted user turn to infer report mode", async () => {
    const app = createApp()

    const streamReplySpy = jest
      .spyOn(OpenUIChatController.service, "streamReply")
      .mockResolvedValue(
        new Response("event: message\ndata: {\"ok\":true}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      )

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        threadId: "thread-1",
        messages: [
          { role: "user", content: "Create a project charter report" },
          { role: "assistant", content: "Here is the report draft" },
          { role: "user", content: "Thanks, now answer with one short sentence" },
        ],
      })

    expect(response.status).toBe(200)
    expect(streamReplySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reportMode: false,
      })
    )
  })

  test("ignores non-text metadata when inferring report mode", async () => {
    const app = createApp()

    const streamReplySpy = jest
      .spyOn(OpenUIChatController.service, "streamReply")
      .mockResolvedValue(
        new Response("event: message\ndata: {\"ok\":true}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      )

    const response = await request(app)
      .post("/api/v1/openui-chat/chat")
      .send({
        projectId: "project-1",
        messages: [
          {
            role: "user",
            content: {
              text: "Answer with one short sentence",
              metadata: {
                previousIntent: "create charter report",
              },
            },
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(streamReplySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reportMode: false,
      })
    )
  })

  test("propagates async route failures through the error handler", async () => {
    const app = createApp()

    jest
      .spyOn(OpenUIChatController.service, "listThreads")
      .mockRejectedValue(new Error("boom"))

    const response = await request(app).get("/api/v1/openui-chat/threads").query({ projectId: "project-1" })

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      success: false,
      error: {
        message: "Internal server error",
        statusCode: 500,
      },
    })
  })

  test("lists project-scoped threads for the authenticated user", async () => {
    const app = createApp()

    jest.spyOn(OpenUIChatController.service, "listThreads").mockResolvedValue([
      {
        id: "thread-1",
        userId: "user-1",
        projectId: "project-1",
        title: "Thread title",
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T00:00:00.000Z",
      },
    ])

    const response = await request(app).get("/api/v1/openui-chat/threads").query({ projectId: "project-1" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      threads: [
        {
          id: "thread-1",
          userId: "user-1",
          projectId: "project-1",
          title: "Thread title",
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
      ],
    })
  })

  test("returns 404 when the requested thread does not exist for the selected project", async () => {
    const app = createApp()

    jest.spyOn(OpenUIChatController.service, "getThread").mockResolvedValue(null)

    const response = await request(app)
      .get("/api/v1/openui-chat/threads/thread-1")
      .query({ projectId: "project-1" })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: "Thread not found" })
  })
})