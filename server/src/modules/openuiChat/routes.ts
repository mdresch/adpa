import express from "express"

import { authenticateToken } from "../../middleware/auth"
import { RouteConfig } from "../../routes/registry"

import { OpenUIChatController } from "./OpenUIChatController"

const router = express.Router()

// Chat — SSE streaming response
router.post("/chat", authenticateToken, OpenUIChatController.chat)

// Thread history
router.get("/threads", authenticateToken, OpenUIChatController.getThreads)
router.get("/threads/:threadId", authenticateToken, OpenUIChatController.getThread)

const openuiChatRoutes: RouteConfig[] = [
  {
    path: "/openui-chat",
    router,
    version: "1",
    category: "OpenUI Chat",
  },
]

export default openuiChatRoutes
