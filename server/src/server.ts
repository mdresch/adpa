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
    // Connect to database
    await connectDatabase()
    logger.info("Database connected successfully")

    // Connect to Redis
    await connectRedis()
    logger.info("Redis connected successfully")

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()

export { io }
