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
  {
    path: "/openui-chat",
    router,
    version: "1",
    category: "AI-Search",
  },
]

export default routes