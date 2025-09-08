import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"

import { errorHandler } from "./middleware/errorHandler"
import { logger } from "./utils/logger"
import { connectDatabase } from "./database/connection"
import { connectRedis } from "./utils/redis"
import { initializeQueues } from "./services/queueService"
import jwt from "jsonwebtoken"
import { pool } from "./database/connection"

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
import githubRoutes from "./routes/githubRoutes"
import sharepointRoutes from "./routes/sharepointRoutes"
import templateRoutes from "./routes/templates"
import { documentTemplateRoutes } from "./modules/documentTemplates"
import { documentGeneratorRoutes } from "./modules/documentGenerator"
import adobePdfRoutes from "./routes/adobe-pdf"

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
console.log("🔧 Registering API routes...")

// Debug middleware for auth routes (must be before route registration)
app.use("/api/auth", (req, res, next) => {
  console.log(`🔍 Auth route called: ${req.method} ${req.path}`)
  next()
})

app.use("/api/auth", authRoutes)
console.log("✅ Auth routes registered")

app.use("/api/projects", projectRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/users", userRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/security", securityRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations", integrationRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations/sharepoint", sharepointRoutes)
app.use("/api/templates", templateRoutes)
app.use("/api/document-templates", documentTemplateRoutes)
app.use("/api/document-generator", documentGeneratorRoutes)
app.use("/api/adobe-pdf", adobePdfRoutes)
console.log("✅ All API routes registered")

// WebSocket connection handling
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  // Support generic join/leave with room names supplied by client
  socket.on("join", async (room: string) => {
    try {
      // If joining a project room, enforce permission checks
      const projectMatch = typeof room === 'string' ? room.match(/^project:(.+)$/) : null

      if (projectMatch) {
        const projectId = projectMatch[1]
        const token = socket.handshake?.auth?.token
        if (!token) {
          socket.emit('join:error', { room, message: 'Authentication required' })
          return
        }

        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
          const userId = decoded?.userId
          if (!userId) {
            socket.emit('join:error', { room, message: 'Invalid token' })
            return
          }

          // Fetch user and project to validate membership
          const userRes = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [userId])
          if (userRes.rows.length === 0) {
            socket.emit('join:error', { room, message: 'User not found' })
            return
          }

          const user = userRes.rows[0]

          const projRes = await pool.query('SELECT id, owner_id, created_by, team_members FROM projects WHERE id = $1', [projectId])
          if (projRes.rows.length === 0) {
            socket.emit('join:error', { room, message: 'Project not found' })
            return
          }

          const project = projRes.rows[0]

          const isOwner = project.owner_id === userId
          const isCreator = project.created_by === userId
          let isTeamMember = false
          try {
            const teamMembers = project.team_members || []
            if (Array.isArray(teamMembers)) {
              isTeamMember = teamMembers.includes(user.name)
            }
          } catch (e) {
            isTeamMember = false
          }

          if (isOwner || isCreator || isTeamMember || user.role === 'admin') {
            socket.join(room)
            logger.info(`Client ${socket.id} joined room ${room}`)
            socket.emit('join:ok', { room })
          } else {
            socket.emit('join:error', { room, message: 'Access denied' })
          }
        } catch (err) {
          logger.error('Socket auth error:', err)
          socket.emit('join:error', { room, message: 'Authentication failed' })
        }
      } else {
        // Non-project rooms: allow join without special checks
        socket.join(room)
        logger.info(`Client ${socket.id} joined room ${room}`)
        socket.emit('join:ok', { room })
      }
    } catch (err) {
      logger.error('Error during join handling:', err)
      socket.emit('join:error', { room, message: 'Internal server error' })
    }
  })

  socket.on("leave", (room: string) => {
    socket.leave(room)
    logger.info(`Client ${socket.id} left room ${room}`)
    socket.emit('leave:ok', { room })
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
      logger.warn(
        "Database connection failed, starting server without database:",
        typeof dbError === "object" && dbError !== null && "message" in dbError ? (dbError as { message?: string }).message : dbError
      )
    }

    // Try to connect to Redis, but don't fail if it's not available
    try {
      await connectRedis()
      logger.info("Redis connected successfully")
    } catch (redisError) {
      logger.warn(
        "Redis connection failed, starting server without Redis:",
        typeof redisError === "object" && redisError !== null && "message" in redisError
          ? (redisError as { message?: string }).message
          : redisError
      )
    }

    // Try to initialize job queues, but don't fail if it's not available
    try {
      await initializeQueues()
      logger.info("Job queues initialized successfully")
    } catch (queueError) {
      logger.warn(
        "Job queue initialization failed:",
        typeof queueError === "object" && queueError !== null && "message" in queueError
          ? (queueError as { message?: string }).message
          : queueError
      )
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
// if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
// }

export { app, io }
