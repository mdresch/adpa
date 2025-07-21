import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"

import { errorHandler } from "./middleware/errorHandler"
import { logger } from "./utils/logger"
import { connectDatabase } from "./database/connection"
import { connectRedis } from "./utils/redis"
import { initializeQueues } from "./services/queueService"

// Routes
import authRoutes from "./routes/auth"
import projectRoutes from "./routes/projects"
import documentRoutes from "./routes/documents"
import userRoutes from "./routes/users"
import aiRoutes from "./routes/ai"
import analyticsRoutes from "./routes/analytics"
import jobRoutes from "./routes/jobs"
import securityRoutes from "./routes/security"
import integrationRoutes from "./routes/integrations"
import confluenceRoutes from "./routes/confluenceRoutes"
import sharepointRoutes from "./routes/sharepointRoutes"
import templateRoutes from "./routes/templates"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  })
})

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/projects", projectRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/users", userRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/security", securityRoutes)
app.use("/api/integrations", integrationRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/sharepoint", sharepointRoutes)
app.use("/api/templates", templateRoutes)

// WebSocket connection handling
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  socket.on("join-project", (projectId: string) => {
    socket.join(`project-${projectId}`)
    logger.info(`Client ${socket.id} joined project ${projectId}`)
  })

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Global error handler
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Try to connect to database, but don't fail if it's not available
    try {
      await connectDatabase()
      logger.info("Database connected successfully")
    } catch (dbError) {
      logger.warn("Database connection failed, starting server without database:", dbError.message)
    }

    // Try to connect to Redis, but don't fail if it's not available
    try {
      await connectRedis()
      logger.info("Redis connected successfully")
    } catch (redisError) {
      logger.warn("Redis connection failed, starting server without Redis:", redisError.message)
    }

    // Try to initialize job queues, but don't fail if it's not available
    try {
      await initializeQueues()
      logger.info("Job queues initialized successfully")
    } catch (queueError) {
      logger.warn("Job queue initialization failed:", queueError.message)
    }

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`)
      logger.info("SharePoint test endpoint available at /api/integrations/sharepoint/test")
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer()
}

export { app, io }
