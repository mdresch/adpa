<<<<<<< HEAD
import express from "express"

import { authenticateToken } from "../../middleware/auth"
import { RouteConfig } from "../../routes/registry"

import { OpenUIChatController } from "./OpenUIChatController"

const router = express.Router()

// Chat — SSE streaming response
router.post("/chat", authenticateToken, OpenUIChatController.chat.bind(OpenUIChatController))

// Thread history
router.get("/threads", authenticateToken, OpenUIChatController.listThreads.bind(OpenUIChatController))
router.get("/threads/:threadId", authenticateToken, OpenUIChatController.getThread.bind(OpenUIChatController))

const openuiChatRoutes: RouteConfig[] = [
=======
import { Router } from "express"

import { authenticateToken } from "../../middleware/auth"
import { asyncHandler } from "../../middleware/errorHandler"
import type { RouteConfig } from "../../routes/registry"

import { OpenUIChatController } from "./OpenUIChatController"

const router = Router()

router.post("/chat", authenticateToken, asyncHandler((req, res) => OpenUIChatController.chat(req, res)))
router.get("/threads", authenticateToken, asyncHandler((req, res) => OpenUIChatController.listThreads(req, res)))
router.get("/threads/:id", authenticateToken, asyncHandler((req, res) => OpenUIChatController.getThread(req, res)))

const routes: RouteConfig[] = [
>>>>>>> adpa-project-charter
  {
    path: "/openui-chat",
    router,
    version: "1",
<<<<<<< HEAD
    category: "OpenUI Chat",
  },
]

export default openuiChatRoutes
=======
    category: "AI-Search",
  },
]

export default routes
>>>>>>> adpa-project-charter
