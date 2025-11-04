import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"

import { errorHandler } from "./middleware/errorHandler"
import requestIdMiddleware from "./middleware/requestId"
import { logger } from "./utils/logger"
import { connectDatabase } from "./database/connection"
import { connectRedis } from "./utils/redis"
import { initializeQueues } from "./services/queueService"
import { aiService } from "./services/aiService"
import jwt from "jsonwebtoken"
import { pool } from "./database/connection"

// Routes
import authRoutes from "./routes/auth"
import projectRoutes from "./routes/projects"
import programRoutes from "./routes/programRoutes"
import documentRoutes from "./routes/documents"
import projectDataExtractionRoutes from "./routes/projectDataExtraction"
import userRoutes from "./routes/users"
import aiRoutes from "./routes/ai"
import aiProvidersRoutes from "./routes/ai-providers"
import aiFailoverRoutes from "./routes/ai-failover"
import analyticsRoutes from "./routes/analytics"
import jobRoutes from "./routes/jobs"
import queueStatsRoutes from "./routes/queue-stats"
import securityRoutes from "./routes/security"
import integrationRoutes from "./routes/integrations"
import confluenceRoutes from "./routes/confluenceRoutes"
import githubRoutes from "./routes/githubRoutes"
import sharepointRoutes from "./routes/sharepointRoutes"
import ibabsRoutes from "./routes/ibabsRoutes"
import templateRoutes from "./routes/templates"
import templateAnalyticsRoutes from "./routes/template-analytics"
import { documentTemplateRoutes } from "./modules/documentTemplates"
import { documentGeneratorRoutes } from "./modules/documentGenerator"
import adobePdfRoutes from "./routes/adobe-pdf"
import { createDocumentFormatRoutes } from "./routes/document-formats"
import contextAiRoutes from "./routes/context-ai"
import costManagementRoutes from "./routes/costManagement"
import tasksRoutes from "./routes/tasks"
// import ecsAiRoutes from "./routes/ecs-ai"
// import quantumStabilityRoutes from "./routes/quantum-stability"
// import speedOfLightRoutes from "./routes/speed-of-light"
// import monteCarloProofRoutes from "./routes/monte-carlo-proof"
// Optional: AI Provider Testing routes (skip if module absent)
let aiProviderTestingRoutes: any | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("./routes/ai-provider-testing")
  aiProviderTestingRoutes = m?.default || m
} catch (e) {
  console.warn("⚠️  Skipping ai-provider-testing routes:", (e as any)?.message || e)
}
// import azureAIFoundryRoutes from "./routes/azure-ai-foundry"
import processFlowRoutes from "./routes/process-flow"
import aiModelsRoutes from "./routes/ai-models"
import aiAnalyticsRoutes from "./routes/ai-analytics"
import stakeholderRoutes from "./routes/stakeholders"
import contentStructuringRoutes from "./routes/content-structuring"
import compressionRoutes from "./routes/compression"
import contextInjectionRoutes from "./routes/context-injection"
import pipelineRoutes from "./routes/pipeline"
import documentGenerationRoutes from "./routes/documentGeneration"
import templateStatsRoutes from "./routes/template-stats"
import settingsRoutes from "./routes/settings"
import baselinesRoutes from "./routes/baselines"
import qualityAuditRoutes from "./routes/qualityAuditRoutes"
import documentUploadRoutes from "./routes/documentUploadRoutes"
import adminRoutes from "./routes/adminRoutes"

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin)
        }
        return false
      })
      
      if (isAllowed) {
        callback(null, true)
      } else {
        console.warn(`Socket.IO CORS blocked origin: ${origin}`)
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const PORT = parseInt(process.env.PORT || "5000", 10)

// Middleware
app.use(helmet())

// CORS Configuration - Allow Vercel deployments
const allowedOrigins = [
  "http://localhost:3000",                    // Local development
  "http://localhost:3001",                    // Alternative local port
  process.env.FRONTEND_URL,                   // Configured frontend URL
  /https:\/\/.*\.vercel\.app$/,               // All Vercel preview deployments
  /https:\/\/adpa.*\.vercel\.app$/,           // ADPA Vercel deployments
  "https://adpa.vercel.app",                  // Production Vercel domain
  "https://adpa-production.up.railway.app",   // Railway frontend (if accessing directly)
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin)
        }
        return false
      })
      
      if (isAllowed) {
        callback(null, true)
      } else {
        logger.warn(`CORS blocked origin: ${origin}`)
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
// assign a request id to each incoming request
app.use(requestIdMiddleware)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Make pool available to all routes
app.locals.pool = pool

// Analytics tracking middleware (tracks all API requests automatically)
import { analyticsMiddleware } from "./middleware/analyticsMiddleware"
// Enable analytics in all environments (database schema verified Oct 2025)
app.use(analyticsMiddleware)
logger.info("📊 Analytics tracking middleware enabled")

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
app.use("/api/programs", programRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/project-data-extraction", projectDataExtractionRoutes)
app.use("/api/document-generation", documentGenerationRoutes)
app.use("/api/users", userRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/ai-providers", aiProvidersRoutes)
app.use("/api/ai-failover", aiFailoverRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/queue-stats", queueStatsRoutes)
app.use("/api/security", securityRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations", integrationRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations/sharepoint", sharepointRoutes)
app.use("/api/integrations/ibabs", ibabsRoutes)
app.use("/api/templates", templateRoutes)
app.use("/api/template-analytics", templateAnalyticsRoutes)
app.use("/api/cost-management", costManagementRoutes)
app.use("/api/tasks", tasksRoutes)
app.use("/api/template-stats", templateStatsRoutes)
app.use("/api/document-templates", documentTemplateRoutes)
app.use("/api/document-generator", documentGeneratorRoutes)
app.use("/api/adobe-pdf", adobePdfRoutes)
app.use("/api/documents", createDocumentFormatRoutes(pool))
app.use("/api/context-ai", contextAiRoutes)
// app.use("/api/ecs-ai", ecsAiRoutes)
// app.use("/api/quantum-stability", quantumStabilityRoutes)
// app.use("/api/speed-of-light", speedOfLightRoutes)
// app.use("/api/monte-carlo-proof", monteCarloProofRoutes)
if (aiProviderTestingRoutes) {
  app.use("/api/ai-provider-testing", aiProviderTestingRoutes)
}
// app.use("/api/azure-ai-foundry", azureAIFoundryRoutes)
app.use("/api/process-flow", processFlowRoutes)
app.use("/api/ai-models", aiModelsRoutes)
app.use("/api/ai-analytics", aiAnalyticsRoutes)
app.use("/api/stakeholders", stakeholderRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/content-structuring", contentStructuringRoutes)
app.use("/api/compression", compressionRoutes)
app.use("/api/context-injection", contextInjectionRoutes)
app.use("/api/pipeline", pipelineRoutes)
app.use("/api/baselines", baselinesRoutes)
app.use("/api/quality-audits", qualityAuditRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/onboarding", documentUploadRoutes)
console.log("✅ All API routes registered")

// WebSocket connection handling
io.on("connection", (socket) => {
  logger.debug(`[WS] Client connected: ${socket.id}`)

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
          // VALIDATE JWT FIRST - don't hit database if token is malformed
          let decoded: any
          try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
          } catch (jwtError: any) {
            // JWT malformed, expired, or invalid - reject immediately
            logger.warn('WebSocket JWT validation failed', {
              error: jwtError.message,
              room
            })
            socket.emit('join:error', { 
              room, 
              message: 'Invalid or expired token. Please log out and log back in.',
              code: 'JWT_INVALID'
            })
            // Disconnect socket to prevent retry storm
            socket.disconnect(true)
            return
          }

          const userId = decoded?.userId
          if (!userId) {
            socket.emit('join:error', { room, message: 'Invalid token payload', code: 'USER_ID_MISSING' })
            socket.disconnect(true)
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
    logger.debug(`[WS] Client disconnected: ${socket.id}`)
  })
})

// Global error handler
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    console.log("🚀 Starting server initialization...")
    
    // Try to connect to database, but don't fail if it's not available
    try {
      console.log("📊 Connecting to database...")
      await connectDatabase()
      console.log("✅ Database connected successfully")
      
      // Auto-create document_summaries table if it doesn't exist
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS document_summaries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            compression_method VARCHAR(50) NOT NULL,
            compression_level DECIMAL(3,2) NOT NULL,
            target_tokens INTEGER NOT NULL,
            original_content TEXT NOT NULL,
            original_tokens INTEGER NOT NULL,
            compressed_content TEXT NOT NULL,
            compressed_tokens INTEGER NOT NULL,
            compression_ratio DECIMAL(5,4) NOT NULL,
            ai_provider VARCHAR(100),
            ai_model VARCHAR(100),
            template_context JSONB,
            template_context_hash VARCHAR(64),
            document_version INTEGER NOT NULL DEFAULT 1,
            is_valid BOOLEAN NOT NULL DEFAULT true,
            times_reused INTEGER NOT NULL DEFAULT 0,
            last_reused_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT document_summaries_unique_cache_v2 UNIQUE (document_id, compression_method, compression_level, template_context_hash)
          );
          
          CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);
          CREATE INDEX IF NOT EXISTS idx_document_summaries_valid ON document_summaries(is_valid) WHERE is_valid = true;
          CREATE INDEX IF NOT EXISTS idx_document_summaries_method ON document_summaries(compression_method);
          CREATE INDEX IF NOT EXISTS idx_document_summaries_reuse ON document_summaries(times_reused DESC);
        `)
        console.log("✅ document_summaries table ready (auto-migration)")
      } catch (migrationError) {
        console.warn("⚠️  Could not create document_summaries table:", migrationError)
      }
    } catch (dbError) {
      console.warn(
        "⚠️  Database connection failed, starting server without database:",
        typeof dbError === "object" && dbError !== null && "message" in dbError ? (dbError as { message?: string }).message : dbError
      )
    }

    // Try to connect to Redis, but don't fail if it's not available
    try {
      console.log("💾 Connecting to Redis...")
      await connectRedis()
      console.log("✅ Redis connected successfully")
    } catch (redisError) {
      console.warn(
        "⚠️  Redis connection failed, starting server without Redis:",
        typeof redisError === "object" && redisError !== null && "message" in redisError
          ? (redisError as { message?: string }).message
          : redisError
      )
    }

    // Try to initialize job queues, but don't fail if it's not available
    try {
      console.log("🔄 Initializing job queues...")
      await initializeQueues()
      console.log("✅ Job queues initialized successfully")
    } catch (queueError) {
      console.warn(
        "⚠️  Job queue initialization failed:",
        typeof queueError === "object" && queueError !== null && "message" in queueError
          ? (queueError as { message?: string }).message
          : queueError
      )
    }

    // Initialize document conversion queue worker
    try {
      console.log("📄 Initializing document conversion worker...")
      const { setupDocumentConversionWorker } = require('./jobs/documentConversionJob')
      setupDocumentConversionWorker(pool)
      console.log("✅ Document conversion worker initialized (5 concurrent workers)")
    } catch (workerError) {
      console.warn(
        "⚠️  Document conversion worker initialization failed:",
        typeof workerError === "object" && workerError !== null && "message" in workerError
          ? (workerError as { message?: string }).message
          : workerError
      )
    }

    // Initialize AI providers
    try {
      console.log("🤖 Initializing AI providers...")
      await aiService.initializeProviders()
      console.log("✅ AI providers initialized successfully")
    } catch (aiError) {
      console.warn(
        "⚠️  AI provider initialization failed:",
        typeof aiError === "object" && aiError !== null && "message" in aiError
          ? (aiError as { message?: string }).message
          : aiError
      )
    }

    console.log(`🌐 Starting server on port ${PORT} at 0.0.0.0...`)
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`)
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`)
      console.log("🔗 SharePoint test endpoint available at /api/integrations/sharepoint/test")
      
      // Initialize weekly template analysis job
      const { initializeTemplateAnalysisJob } = require('./jobs/templateAnalysisJob')
      initializeTemplateAnalysisJob()
      console.log("✅ Template analysis job scheduled (Mondays at 2:00 AM)")
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}


// Only start server if this file is run directly
// if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
// }

export { app, io }









