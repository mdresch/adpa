// IMPORTANT: Tracing must be initialized BEFORE any other imports
import "./tracing"

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
import { connectNeo4j, isNeo4jConfigured, getNeo4jCircuitState } from "./utils/neo4j"
import { SystemMonitoring } from "./utils/systemMonitoring"
import { addJob, getJobStatus, cancelJob, updateJobStatus } from "./services/queueService"
import { aiService } from "./services/aiService"
import jwt from "jsonwebtoken"
import { pool } from "./database/connection"
import { safeQuery, safeUpdate } from './services/jobs/dbGuards'

// Routes
import authRoutes from "./routes/auth"
import projectRoutes from "./routes/projects"
import projectSettingsRoutes from "./routes/projectSettings"
import programRoutes from "./routes/programRoutes"
import documentRoutes from "./routes/documents"
import projectDataExtractionRoutes from "./routes/projectDataExtraction"
import userRoutes from "./routes/users"
import companiesRoutes from "./routes/companies"
import aiRoutes from "./routes/ai"
import aiCopilotRoutes from "./routes/ai-copilot"
import aiProvidersRoutes from "./routes/ai-providers"
import aiFailoverRoutes from "./routes/ai-failover"
import analyticsRoutes from "./routes/analytics"
import jobRoutes from "./routes/jobs"
import jobsDiagnosticsRoutes from "./routes/jobs-diagnostics"
import queueStatsRoutes from "./routes/queue-stats"
import metricsRoutes from "./routes/metrics"
import securityRoutes from "./routes/security"
import integrationRoutes from "./routes/integrations"
import confluenceRoutes from "./routes/confluenceRoutes"
import githubRoutes from "./routes/githubRoutes"
import sharepointRoutes from "./routes/sharepointRoutes"
import ibabsRoutes from "./routes/ibabsRoutes"
import dynamics365GuidesRoutes from "./routes/dynamics365GuidesRoutes"
import templateRoutes from "./routes/templates"
import templateAnalyticsRoutes from "./routes/template-analytics"
import { documentTemplateRoutes } from "./modules/documentTemplates"
import { documentGeneratorRoutes } from "./modules/documentGenerator"
import adobePdfRoutes from "./routes/adobe-pdf"
import { createDocumentFormatRoutes } from "./routes/document-formats"
import contextAiRoutes from "./routes/context-ai"
import contextRoutes from "./routes/contextRoutes"
import costManagementRoutes from "./routes/costManagement"
import tasksRoutes from "./routes/tasks"
import resourceCapacityRoutes from "./routes/resourceCapacityRoutes"
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
import skillsRoutes from "./routes/skills"
import competenciesRoutes from "./routes/competencies"
import contentStructuringRoutes from "./routes/content-structuring"
import compressionRoutes from "./routes/compression"
import contextInjectionRoutes from "./routes/context-injection"
import pipelineRoutes from "./routes/pipeline"
import documentGenerationRoutes from "./routes/documentGeneration"
import templateStatsRoutes from "./routes/template-stats"
import settingsRoutes from "./routes/settings"
import jiraLinkageRoutes from "./routes/jiraLinkage"
import baselinesRoutes from "./routes/baselines"
import gkgRoutes from "./routes/gkg"
import driftRoutes from "./routes/drift"
import entityBaselineRoutes from "./routes/entityBaselineRoutes"
import emergencyMeetingsRoutes from "./routes/emergency-meetings"
import baselineUpdatesRoutes from "./routes/baselineUpdates"
import escalationRoutes from "./routes/escalation"
import qualityAuditRoutes from "./routes/qualityAuditRoutes"
import documentUploadRoutes from "./routes/documentUploadRoutes"
import adminRoutes from "./routes/adminRoutes"
import assessmentExportRoutes from "./routes/assessmentExportRoutes"
import portfolioAssessmentRoutes from "./routes/portfolioAssessmentRoutes"
import executiveDashboardRoutes from "./routes/executive-dashboard"
import projectSimilarityRoutes from "./routes/projectSimilarity"
import notificationsRoutes from "./routes/notifications"
import emailNotificationsRoutes from "./routes/emailNotifications"
import { knowledgeBaseRoutes } from "./modules/knowledgeBase"
import approvalsRoutes from "./routes/approvals"
import performanceActualsRoutes from "./routes/performanceActuals"
import prioritizationRoutes from "./routes/prioritizationRoutes"
import teamAgreementsRoutes from "./routes/teamAgreementsRoutes"
import okrRoutes from "./routes/okrRoutes"
import signatureRoutes from "./routes/signatures"
import searchRoutes from "./routes/search"
import mitigationPlanRoutes from "./routes/mitigationPlanRoutes"
import pmbok6Routes from "./routes/pmbok6Routes"
import reviewRoutes from "./routes/reviewRoutes"
import issueRoutes from "./routes/issueRoutes"
import riskReportingRoutes from "./routes/riskReportingRoutes"
import portfolioFinancialRoutes from "./routes/portfolioFinancial"
import taskCostRoutes from "./routes/taskCosts"
import developmentApproachRoutes from "./routes/developmentApproachRoutes"
import lessonsLearnedRoutes from "./routes/lessonsLearnedRoutes"
import contextOrchestratorRoutes from "./routes/contextOrchestrator"
import uxDocumentationRoutes from "./routes/uxDocumentationRoutes"
import playbookRoutes from "./routes/playbookRoutes"
import digitalTwinAssetsRoutes from "./routes/digital-twin-assets"
import digitalTwinEventsRoutes from "./routes/digital-twin-events"
import digitalTwinTriggersRoutes from "./routes/digital-twin-triggers"
import digitalTwinIngestionRoutes from "./routes/digital-twin-ingestion"
import digitalTwinExportRoutes from "./routes/digital-twin-export"

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
// JSON parser - skip multipart/form-data requests (handled by multer)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.startsWith('multipart/form-data')) {
    return next()
  }
  express.json({ limit: "10mb" })(req, res, next)
})
// URL-encoded parser - skip multipart/form-data requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.startsWith('multipart/form-data')) {
    return next()
  }
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next)
})

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
app.use("/api/projects", require("./routes/projectIntegrationRoutes").default)
app.use("/api/projects", projectSettingsRoutes)
app.use("/api/programs", programRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/project-data-extraction", projectDataExtractionRoutes)
app.use("/api/document-generation", documentGenerationRoutes)
app.use("/api/users", userRoutes)
app.use("/api/companies", companiesRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/ai/copilot", aiCopilotRoutes)
app.use("/api/ai-providers", aiProvidersRoutes)
app.use("/api/ai-failover", aiFailoverRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/jobs/diagnostics", jobsDiagnosticsRoutes)
app.use("/api/queue-stats", queueStatsRoutes)
app.use("/metrics", metricsRoutes) // Prometheus metrics endpoint (no /api prefix for standard Prometheus scraping)
app.use("/api/security", securityRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations", integrationRoutes)
app.use("/api/integrations/confluence", confluenceRoutes)
app.use("/api/integrations/github", githubRoutes)
app.use("/api/integrations/sharepoint", sharepointRoutes)
app.use("/api/integrations/ibabs", ibabsRoutes)
app.use("/api/dynamics365-guides", dynamics365GuidesRoutes)
app.use("/api/templates", templateRoutes)
app.use("/api/template-analytics", templateAnalyticsRoutes)
app.use("/api/cost-management", costManagementRoutes)
app.use("/api/tasks", tasksRoutes)
app.use("/api/resource-capacity", resourceCapacityRoutes)
app.use("/api/template-stats", templateStatsRoutes)
app.use("/api/document-templates", documentTemplateRoutes)
app.use("/api/document-generator", documentGeneratorRoutes)
app.use("/api/adobe-pdf", adobePdfRoutes)
app.use("/api/documents", createDocumentFormatRoutes(pool))
app.use("/api/context-ai", contextAiRoutes)
app.use("/api/contexts", contextRoutes)
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
app.use("/api/skills", skillsRoutes)
app.use("/api/competencies", competenciesRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/jira-linkage", jiraLinkageRoutes)
app.use("/api/content-structuring", contentStructuringRoutes)
app.use("/api/compression", compressionRoutes)
app.use("/api/context-injection", contextInjectionRoutes)
app.use("/api/pipeline", pipelineRoutes)
app.use("/api/baselines", baselinesRoutes)
app.use("/api/gkg", gkgRoutes)
app.use("/api/drift", driftRoutes)
app.use("/api/digital-twin/assets", digitalTwinAssetsRoutes)
app.use("/api/digital-twin/events", digitalTwinEventsRoutes)
app.use("/api/digital-twin/triggers", digitalTwinTriggersRoutes)
app.use("/api/digital-twin/ingestion", digitalTwinIngestionRoutes)
app.use("/api/digital-twin/export", digitalTwinExportRoutes)
app.use("/api/entities", entityBaselineRoutes)
app.use("/api/emergency-meetings", emergencyMeetingsRoutes)
app.use("/api/baseline-updates", baselineUpdatesRoutes)
app.use("/api/escalation", escalationRoutes)
app.use("/api/quality-audits", qualityAuditRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/onboarding", documentUploadRoutes)
app.use("/api/assessment", assessmentExportRoutes)
app.use("/api/portfolio-assessment", portfolioAssessmentRoutes)
app.use("/api/executive-dashboard", executiveDashboardRoutes)
app.use("/api/projects", projectSimilarityRoutes)
app.use("/api/projects", developmentApproachRoutes)
console.log("✅ All API routes registered")
app.use("/api/notifications", notificationsRoutes)
app.use("/api/email-notifications", emailNotificationsRoutes)
app.use("/api/knowledge-base", knowledgeBaseRoutes)
app.use("/api/approvals", approvalsRoutes)
app.use("/api/performance-actuals", performanceActualsRoutes)
app.use("/api/prioritization", prioritizationRoutes)
app.use("/api/team-agreements", teamAgreementsRoutes)
app.use("/api/okrs", okrRoutes)
app.use("/api/signatures", signatureRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/mitigation-plans", mitigationPlanRoutes)
app.use("/api/pmbok6", pmbok6Routes)
app.use("/api", reviewRoutes)
app.use("/api/issues", issueRoutes)
app.use("/api/risks", riskReportingRoutes)
app.use("/api/portfolios", require("./routes/portfolioRoutes").default)
app.use("/api/portfolio", portfolioFinancialRoutes)
app.use("/api/tasks", taskCostRoutes)
app.use("/api/portfolio-domains", require("./routes/portfolioDomains").default)
app.use("/api/lessons", lessonsLearnedRoutes)
app.use("/api/context-orchestrator", contextOrchestratorRoutes)
app.use("/api/ux-documentation", uxDocumentationRoutes)
app.use("/api/playbooks", playbookRoutes)
console.log("✅ All API routes registered (including approvals, notifications, email notifications, knowledge base, assessment, executive dashboard, performance actuals, team agreements, OKRs, signatures, search, PMBOK 6, review scheduling, UX documentation, and playbooks)")

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
          const userRes = await safeQuery(pool, 'SELECT id, name, role FROM users WHERE id = $1', [userId])
          if (!userRes || userRes.rows.length === 0) {
            socket.emit('join:error', { room, message: 'User not found' })
            return
          }

          const user = userRes.rows[0]

          const projRes = await safeQuery(pool, 'SELECT id, owner_id, created_by, team_members FROM projects WHERE id = $1', [projectId])
          if (!projRes || projRes.rows.length === 0) {
            socket.emit('join:error', { room, message: 'Project not found' })
            return
          }

          const project = projRes.rows[0]

          const isOwner = project.owner_id === userId
          const isCreator = project.created_by === userId
          let isTeamMember = false
          try {
            let teamMembers = project.team_members || []
            // Handle JSONB: might be string or already parsed array
            if (typeof teamMembers === 'string') {
              try {
                teamMembers = JSON.parse(teamMembers)
              } catch (parseError) {
                logger.warn(`Failed to parse team_members for project ${projectId}:`, parseError)
                teamMembers = []
              }
            }
            if (Array.isArray(teamMembers)) {
              // team_members is an array of user IDs, not names
              isTeamMember = teamMembers.includes(userId) || teamMembers.includes(user.id)
            }
          } catch (e) {
            logger.warn(`Error checking team membership for project ${projectId}:`, e)
            isTeamMember = false
          }

          const hasAccess = isOwner || isCreator || isTeamMember || user.role === 'admin' || user.role === 'super_admin'

          if (hasAccess) {
            socket.join(room)
            logger.info(`Client ${socket.id} (user: ${userId}) joined room ${room}`, {
              isOwner,
              isCreator,
              isTeamMember,
              userRole: user.role
            })
            socket.emit('join:ok', { room })
          } else {
            logger.warn(`Access denied for user ${userId} to join room ${room}`, {
              projectId,
              isOwner,
              isCreator,
              isTeamMember,
              userRole: user.role,
              ownerId: project.owner_id,
              createdBy: project.created_by
            })
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
        await safeQuery(pool, `
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

      // Auto-migrate is_curated column on risks table
      try {
        await safeQuery(pool, `
          ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE
        `)
        await safeQuery(pool, `
          CREATE INDEX IF NOT EXISTS idx_risks_is_curated ON risks(is_curated)
        `)
        console.log("✅ risks.is_curated column ready (auto-migration)")
      } catch (migrationError: any) {
        // Ignore if column already exists
        if (!migrationError.message?.includes('already exists')) {
          console.warn("⚠️  Could not add is_curated column:", migrationError.message)
        }
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

    // Neo4j: optional, parallel to PostgreSQL/Redis; only when NEO4J_URI is set
    if (isNeo4jConfigured()) {
      try {
        console.log("🕸️ Connecting to Neo4j...")
        await connectNeo4j()
        console.log("✅ Neo4j connected successfully")
      } catch (neo4jError) {
        console.warn(
          "⚠️  Neo4j connection failed, continuing without Neo4j:",
          typeof neo4jError === "object" && neo4jError !== null && "message" in neo4jError
            ? (neo4jError as { message?: string }).message
            : neo4jError
        )
      }
    }

    // Job queues are now initialized automatically when the queueService module is imported
    try {
      console.log("🔄 Job queues are initialized automatically...")


      // Start system resource monitoring
      SystemMonitoring.start()

      // Start worker heartbeat monitoring
      const { WorkerMonitoring } = require('./utils/workerMonitoring')
      const WORKER_ID = `worker-${process.pid}-${Date.now()}`
      WorkerMonitoring.start(WORKER_ID, 'Backend Worker')

      console.log("✅ System and worker resource monitoring started")

    } catch (queueError) {
      console.warn(
        "⚠️  Job queue initialization failed:",
        typeof queueError === "object" && queueError !== null && "message" in queueError
          ? (queueError as { message?: string }).message
          : queueError
      )
    }

    // Initialize document conversion queue worker
    // Note: The worker is automatically initialized when the module is imported
    try {
      console.log("📄 Initializing document conversion worker...")
      require('./jobs/documentConversionJob') // Import to trigger worker initialization
      console.log("✅ Document conversion worker initialized")
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

      // Start stuck-job health monitor
      try {
        // Require here to avoid circular import during module init
        const { StuckJobMonitor } = require('./services/stuckJobMonitor')
        const monitor = new StuckJobMonitor(pool, io, {
          intervalMs: Number(process.env.STUCK_JOB_MONITOR_INTERVAL_MS || 300000),
          thresholdMinutes: Number(process.env.STUCK_JOB_THRESHOLD_MINUTES || 30),
        })
        monitor.start()
        console.log('✅ Stuck-job monitor started')
      } catch (err) {
        console.warn('⚠️ Could not start stuck-job monitor', err)
      }
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}



// Only start server if this file is the main entry point
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js') || process.argv[1].includes('src/server.ts'))) {
  startServer()
}
// For ts-node/tsx where process.argv[1] might be the script path
else if (!process.argv[1] || process.argv[1].includes('server')) {
  // Conservative fallback - if we're not sure, don't auto-start if imported
  if (require.main === module) {
    startServer()
  }
}


export { app, io }









