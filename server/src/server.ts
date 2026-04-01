// IMPORTANT: Tracing must be initialized BEFORE any other imports
import dotenv from "dotenv"
dotenv.config()

import "./tracing"

import express from "express"
import cors from "cors"
import helmet from "helmet"
import { createServer } from "http"
import { initSocketIO } from "./socket"
import * as admin from 'firebase-admin'

// Initialize Firebase Admin for ID token verification
if (!admin.apps.length) {
  let serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  const options: any = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'adpa-frontend'
  };
  
  if (serviceAccountVar) {
    try {
      // Robust cleaning for Azure/Docker env var weirdness
      let cleanedVar = serviceAccountVar.trim();
      
      // Remove wrapping double quotes if present
      if (cleanedVar.startsWith('"') && cleanedVar.endsWith('"')) {
        cleanedVar = cleanedVar.substring(1, cleanedVar.length - 1);
      }
      
      // Handle double-escaped characters
      cleanedVar = cleanedVar.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      
      const serviceAccount = JSON.parse(cleanedVar);
      options.credential = admin.credential.cert(serviceAccount);
      console.log("✅ Firebase Admin initialized with Service Account");
    } catch (err: any) {
      console.error(`❌ Failed to parse FIREBASE_SERVICE_ACCOUNT: ${err.message}. Falling back to Project ID only.`);
    }
  }

  admin.initializeApp(options);
}

import { errorHandler } from "./middleware/errorHandler"
import { correlationIdMiddleware } from "./middleware/correlationId";
import { logger } from "./utils/logger";
import pinoHttp from "pino-http";
import jwt from "jsonwebtoken"
import { pool } from "./database/connection"
import { safeQuery } from './services/jobs/dbGuards'
import { initializeServerWithDependencyGraph } from "./startup/serverBootstrap"

// Routes
import projectsModuleRoutes from "./modules/projects/routes"
import jobRoutes from "./routes/jobs"
import jobsDiagnosticsRoutes from "./routes/jobs-diagnostics"
import queueStatsRoutes from "./routes/queue-stats"
import securityRoutes from "./routes/security"
// retired legacy routes handled by modular registry
import { documentTemplateRoutes } from "./modules/documentTemplates"
import { documentGeneratorRoutes } from "./modules/documentGenerator"
import authModuleRoutes from "./modules/auth/routes"
import identityModuleRoutes from "./modules/identity/routes"
import portfolioModuleRoutes from "./modules/portfolio/routes"
import executionModuleRoutes from "./modules/execution/routes"
import templatesModuleRoutes from "./modules/templates/routes"
import intelligenceModuleRoutes from "./modules/intelligence/routes"
import integrationsModuleRoutes from "./modules/integrations/routes"
import adobePdfRoutes from "./routes/adobe-pdf"
import { createDocumentFormatRoutes } from "./routes/document-formats"
import contextAiRoutes from "./routes/context-ai"
import contextRoutes from "./routes/contextRoutes"
import costManagementRoutes from "./routes/costManagement"
// Optional: AI Provider Testing routes (skip if module absent)
let aiProviderTestingRoutes: any | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("./routes/ai-provider-testing")
  aiProviderTestingRoutes = m?.default || m
} catch (e) {
  // This is expected if the file is ignored in production
}
import processFlowRoutes from "./routes/process-flow"
import stakeholderRoutes from "./routes/stakeholders"
import skillsRoutes from "./routes/skills"
import competenciesRoutes from "./routes/competencies"
import contentStructuringRoutes from "./routes/content-structuring"
import compressionRoutes from "./routes/compression"
import contextInjectionRoutes from "./routes/context-injection"
import pipelineRoutes from "./routes/pipeline"
import documentGenerationRoutes from "./routes/documentGeneration"
// Retired legacy template stats
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
import ragRoutes from "./routes/ragRoutes"
import tasksRoutes from "./routes/tasks"
import programRoutes from "./routes/programRoutes"
import goalsRoutes from "./routes/goals"
import agentsRoutes from "./routes/agents"

import assessmentExportRoutes from "./routes/assessmentExportRoutes"
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
import promptAssistantRoutes from "./routes/promptAssistantRoutes"
import signatureRoutes from "./routes/signatures"
import searchRoutes from "./routes/search"
import gkgEnrichedSearchRoutes from "./routes/gkgEnrichedSearch"
import mitigationPlanRoutes from "./routes/mitigationPlanRoutes"
import pmbok6Routes from "./routes/pmbok6Routes"
import reviewRoutes from "./routes/reviewRoutes"
import developmentApproachRoutes from "./routes/developmentApproachRoutes"
import lessonsLearnedRoutes from "./routes/lessonsLearnedRoutes"
import developmentApproachModuleRoutes from "./modules/developmentApproach/routes"
import contextOrchestratorRoutes from "./routes/contextOrchestrator"
import morphicModuleRoutes from "./modules/morphic/routes"
import uxDocumentationRoutes from "./routes/uxDocumentationRoutes"
import digitalTwinAssetsRoutes from "./routes/digital-twin-assets"
import digitalTwinEventsRoutes from "./routes/digital-twin-events"
import digitalTwinTriggersRoutes from "./routes/digital-twin-triggers"
import digitalTwinIngestionRoutes from "./routes/digital-twin-ingestion"
import digitalTwinExportRoutes from "./routes/digital-twin-export"
import digitalTwinAnalyticsRoutes from "./routes/digital-twin-analytics"
import digitalTwinConnectorsRoutes from "./routes/digital-twin-connectors"
import mediaRoutes from "./routes/mediaRoutes"
import healthRoutes from "./routes/health"
import aiProvidersRoutes from "./routes/ai-providers"
// import aiAnalyticsRoutes from "./routes/ai-analytics" // Missing file
import aiModelsRoutes from "./routes/ai-models"
import documentModuleRoutes from "./modules/documents/routes"
import analysisModuleRoutes from "./modules/analysis/routes"
import projectModuleRoutes from "./modules/projects/routes"
import { registerRoutes } from "./routes/registry"

const app = express()
const server = createServer(app)
const io = initSocketIO(server)

const PORT = parseInt(process.env.PORT || "5000", 10)

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS Configuration - Allow Vercel deployments
const allowedOrigins = [
  "http://localhost:3000",                    // Local development
  "http://localhost:3001",                    // Alternative local port
  "http://localhost:3005",                    // Standard Next.js dev port
  "http://localhost:4280",                    // Azure SWA local emulator
  process.env.FRONTEND_URL,                   // Configured frontend URL
  process.env.CORS_ORIGIN,                    // Configured CORS origin
  ...(process.env.ADDITIONAL_ALLOWED_ORIGINS
    ? process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : []),
  /https:\/\/.*\.vercel\.app$/,               // All Vercel preview deployments
  /https:\/\/adpa.*\.vercel\.app$/,           // ADPA Vercel deployments
  /https:\/\/.*\.onrender\.com$/,             // Render deployments
  /https:\/\/.*\.azurestaticapps\.net$/,      // Azure Static Web Apps
  "https://adpa-frontend.onrender.com",       // Specific Render Frontend
  "https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io", // Azure Container Apps Backend (Self)
  "https://adpa.vercel.app",                  // Production Vercel domain
  "https://adpa--adpa-frontend.europe-west4.hosted.app", // NEW Production Firebase App Hosting URL
].filter(Boolean) as (string | RegExp)[]

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
// Use pino-http for automatic request logging
app.use(pinoHttp({ logger: logger as any }));

// Use correlation ID middleware for request tracking
app.use(correlationIdMiddleware);
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

// Health checks (available at both root and /api)
app.use("/health", healthRoutes)
app.use("/api/health", healthRoutes)

// Debug env (sanitized)
app.get("/api/debug-env", (req, res) => {
  res.json({
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_CLIENT_NAME: process.env.NEO4J_CLIENT_NAME,
    NEO4J_CLIENT_ID: process.env.NEO4J_CLIENT_ID ? 'SET' : 'NOT SET',
    NEO4J_USER: process.env.NEO4J_USER,
    NODE_ENV: process.env.NODE_ENV,
    TIMESTAMP: new Date().toISOString()
  })
})

// API Routes
console.log("🔧 Registering API routes...")
console.log("DEBUG: authModuleRoutes type:", typeof authModuleRoutes, "is array:", Array.isArray(authModuleRoutes));
console.log("DEBUG: documentModuleRoutes type:", typeof documentModuleRoutes, "is array:", Array.isArray(documentModuleRoutes));

// retired legacy auth routes - now handled by modular registry (/api/v1/auth)
// Aliased here for legacy frontend compatibility (Phase 3 compatibility layer)
if (authModuleRoutes && authModuleRoutes[0]) {
  app.use("/api/auth", authModuleRoutes[0].router)
} else {
  console.warn("⚠️ authModuleRoutes is missing or empty")
}
if (identityModuleRoutes && identityModuleRoutes[0]) {
  app.use("/api/users", (req, res, next) => { req.url = '/users' + req.url; next(); }, identityModuleRoutes[0].router) 
  app.use("/api/companies", (req, res, next) => { req.url = '/companies' + req.url; next(); }, identityModuleRoutes[0].router)
  app.use("/api", identityModuleRoutes[0].router) // Mounts /users and /companies
} else {
  console.warn("⚠️ identityModuleRoutes is missing or empty")
}

if (projectsModuleRoutes && projectsModuleRoutes[0]) {
  app.use("/api/projects", projectsModuleRoutes[0].router)
} else {
  console.warn("⚠️ projectsModuleRoutes is missing or empty")
}

if (morphicModuleRoutes && morphicModuleRoutes[0]) {
  app.use("/api/v1/morphic", morphicModuleRoutes[0].router)
  // Legacy compatibility mounting if needed
  app.use("/api/morphic", morphicModuleRoutes[0].router)
} else {
  console.warn("⚠️ morphicModuleRoutes is missing or empty")
}

if (executionModuleRoutes && executionModuleRoutes[0]) {
  app.use("/api", executionModuleRoutes[0].router) // Mounts /issues, /tasks, /risks, /playbooks under /api
} else {
  console.warn("⚠️ executionModuleRoutes is missing or empty")
}

if (portfolioModuleRoutes && portfolioModuleRoutes[0]) {
  app.use("/api/portfolios", portfolioModuleRoutes[0].router)
  app.use("/api/portfolio", portfolioModuleRoutes[0].router)
  app.use("/api/portfolio-domains", (req, res, next) => { req.url = '/domains' + req.url; next(); }, portfolioModuleRoutes[0].router)
  app.use("/api/portfolio-assessment", (req, res, next) => { req.url = '/assessment' + req.url; next(); }, portfolioModuleRoutes[0].router)
} else {
  console.warn("⚠️ portfolioModuleRoutes is missing or empty")
}

if (templatesModuleRoutes && templatesModuleRoutes[0]) {
  app.use("/api/templates", templatesModuleRoutes[0].router)
  app.use("/api/template-analytics", templatesModuleRoutes[0].router)
  app.use("/api/template-stats", (req, res, next) => { req.url = '/statistics' + req.url; next(); }, templatesModuleRoutes[0].router)
}

if (intelligenceModuleRoutes && intelligenceModuleRoutes[0]) {
  app.use("/api/analytics", intelligenceModuleRoutes[0].router)
} else {
  console.warn("⚠️ intelligenceModuleRoutes is missing or empty")
}

if (integrationsModuleRoutes && integrationsModuleRoutes[0]) {
  app.use("/api/integrations", integrationsModuleRoutes[0].router)
} else {
  console.warn("⚠️ integrationsModuleRoutes is missing or empty")
}

if (documentModuleRoutes && documentModuleRoutes[0]) {
  console.log("DEBUG: mounting documentModuleRoutes");
  app.use("/api/documents", documentModuleRoutes[0].router)
} else {
  console.warn("⚠️ documentModuleRoutes is missing or empty")
}

if (analysisModuleRoutes && analysisModuleRoutes[0]) {
  app.use("/api/project-data-extraction", (req, res, next) => {
    // Map /:projectId/summary to /summary/:projectId
    const summaryMatch = req.url.match(/^\/([^/]+)\/summary$/)
    if (summaryMatch) {
      req.url = `/summary/${summaryMatch[1]}`
    }
    next()
  }, analysisModuleRoutes[0].router)
} else {
  console.warn("⚠️ analysisModuleRoutes is missing or empty")
}


console.log("✅ Legacy compatibility routes registered (Bridge Layer Active)")

// Modular routes are automatically discovered and registered via registerRoutes(app) below

app.use("/api/document-generation", documentGenerationRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/jobs/diagnostics", jobsDiagnosticsRoutes)
app.use("/api/queue-stats", queueStatsRoutes)
app.use("/api/security", securityRoutes)
// Retired legacy templates routes handled by bridge layer
app.use("/api/cost-management", costManagementRoutes)
// retired legacy template stats handled by bridge layer
app.use("/api/document-templates", documentTemplateRoutes)
app.use("/api/document-generator", documentGeneratorRoutes)
app.use("/api/adobe-pdf", adobePdfRoutes)
app.use("/api/documents", createDocumentFormatRoutes(pool))
app.use("/api/context-ai", contextAiRoutes)
app.use("/api/contexts", contextRoutes)
if (aiProviderTestingRoutes) {
  app.use("/api/ai-provider-testing", aiProviderTestingRoutes)
}
app.use("/api/process-flow", processFlowRoutes)
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
app.use("/api/digital-twin/analytics", digitalTwinAnalyticsRoutes)
app.use("/api/digital-twin-connectors", digitalTwinConnectorsRoutes)
app.use("/api/entities", entityBaselineRoutes)
app.use("/api/emergency-meetings", emergencyMeetingsRoutes)
app.use("/api/escalation", escalationRoutes)
app.use("/api/quality-audits", qualityAuditRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/onboarding", documentUploadRoutes)
app.use("/api/executive-dashboard", executiveDashboardRoutes)
app.use("/api/rag", ragRoutes)
app.use("/api/projects", projectSimilarityRoutes)
app.use("/api/projects", developmentApproachRoutes)
app.use("/api/development-approach", developmentApproachModuleRoutes)
app.use("/api/tasks", tasksRoutes)
app.use("/api/programs", programRoutes)
app.use("/api/goals", goalsRoutes)
app.use("/api/agents", agentsRoutes)
app.use("/api/media", mediaRoutes)
app.use("/api/ai-providers", aiProvidersRoutes)
app.use("/api/ai", aiProvidersRoutes)
// app.use("/api/ai-analytics", aiAnalyticsRoutes) // Missing file
app.use("/api/ai-models", aiModelsRoutes)
console.log("✅ All API routes registered")
app.use("/api/notifications", notificationsRoutes)
app.use("/api/email-notifications", emailNotificationsRoutes)
app.use("/api/knowledge-base", knowledgeBaseRoutes)
app.use("/api/approvals", approvalsRoutes)
app.use("/api/performance-actuals", performanceActualsRoutes)
app.use("/api/prioritization", prioritizationRoutes)
app.use("/api/team-agreements", teamAgreementsRoutes)
app.use("/api/okrs", okrRoutes)
app.use("/api/prompt-assistant", promptAssistantRoutes)
app.use("/api/signatures", signatureRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/search", gkgEnrichedSearchRoutes)
app.use("/api/mitigation-plans", mitigationPlanRoutes)
app.use("/api/pmbok6", pmbok6Routes)
// Retired legacy execution and portfolio routes handled by bridge layer
app.use("/api/lessons", lessonsLearnedRoutes)
app.use("/api/context-orchestrator", contextOrchestratorRoutes)
app.use("/api/ux-documentation", uxDocumentationRoutes)
// Playbooks retired (execution domain)

console.log("✅ All API routes registered (including approvals, notifications, email notifications, knowledge base, assessment, executive dashboard, performance actuals, team agreements, OKRs, signatures, search, PMBOK 6, review scheduling, UX documentation, playbooks, and playbook generation)")

// Register new Modular routes (Phase 3)
registerRoutes(app).catch(err => {
  console.error("❌ Failed to register modular routes:", err)
  logger.error(err, "❌ Failed to register modular routes")
})

import { attachAgentRoutes } from './routes/agents';
attachAgentRoutes(io);

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

        let decoded: any
        try {
          // DUAL-AUTH: Try Firebase first, then legacy JWT
          if (token.length > 500) { // Firebase tokens are significantly longer than legacy ones
            try {
              const firebaseUser = await admin.auth().verifyIdToken(token);
              decoded = { userId: firebaseUser.uid, email: firebaseUser.email, firebase: true };
            } catch (fbError) {
              // Fallback to legacy JWT if Firebase fails
              decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            }
          } else {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          }
        } catch (jwtError: any) {
          // Both methods failed
          logger.warn({
            error: jwtError.message,
            room
          }, 'WebSocket authentication failed (Dual-Auth)')
          socket.emit('join:error', {
            room,
            message: 'Invalid or expired token. Please log out and log back in.',
            code: 'AUTH_INVALID'
          })
          socket.disconnect(true)
          return
        }

        const userId = decoded?.userId || decoded?.uid || (decoded?.firebase ? decoded.userId : null); 
        // Note: Firebase uses .uid, Legacy uses .userId. Handled below.
        
        const finalUserId = decoded?.firebase ? decoded.userId : decoded?.userId;

        if (!finalUserId) {
          socket.emit('join:error', { room, message: 'Invalid token payload', code: 'USER_ID_MISSING' })
          socket.disconnect(true)
          return
        }

        // Fetch user and project to validate membership
        const userRes = await safeQuery(pool, 'SELECT id, name, role FROM users WHERE id = $1', [finalUserId])
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

        const isOwner = project.owner_id === finalUserId
        const isCreator = project.created_by === finalUserId
        let isTeamMember = false
        try {
          let teamMembers = project.team_members || []
          // Handle JSONB: might be string or already parsed array
          if (typeof teamMembers === 'string') {
            try {
              teamMembers = JSON.parse(teamMembers)
            } catch (parseError) {
              logger.warn(parseError, `Failed to parse team_members for project ${projectId}:`)
              teamMembers = []
            }
          }
          if (Array.isArray(teamMembers)) {
            // team_members is an array of user IDs, not names
            isTeamMember = teamMembers.includes(finalUserId) || teamMembers.includes(user.id)
          }
        } catch (e) {
          logger.warn(`Error checking team membership for project ${projectId}:`, e)
          isTeamMember = false
        }

        const hasAccess = isOwner || isCreator || isTeamMember || user.role === 'admin' || user.role === 'super_admin'

        if (hasAccess) {
          socket.join(room)
          logger.info(`Client ${socket.id} (user: ${finalUserId}) joined room ${room}`, {
            isOwner,
            isCreator,
            isTeamMember,
            userRole: user.role
          })
          socket.emit('join:ok', { room })
        } else {
          logger.warn(`Access denied for user ${finalUserId} to join room ${room}`, {
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
      } else {
        // Non-project rooms: allow join without special checks
        socket.join(room)
        logger.info(`Client ${socket.id} joined room ${room}`)
        socket.emit('join:ok', { room })
      }
    } catch (err) {
      logger.error(err, 'Error during join handling:')
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
  await initializeServerWithDependencyGraph(server, io, PORT)
}



// Global process error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection at Promise');
});

process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught Exception thrown');
  process.exit(1);
});

// Only start server if this file is the main entry point
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js') || process.argv[1].includes('src/server.ts'))) {
  console.log("🚀 Starting server context...");
  startServer().catch(err => {
    console.error("❌ Error during server startup (continuing if possible):", err);
    // Do not exit! Allow the server to stay alive for resilient features like Morphic
    // process.exit(1);
  });
}
// For ts-node/tsx where process.argv[1] might be the script path
else if (!process.argv[1] || process.argv[1].includes('server')) {
  // Conservative fallback - if we're not sure, don't auto-start if imported
  if (require.main === module) {
    console.log("🚀 Starting server context (main fallback)...");
    startServer().catch(err => {
      console.error("❌ Fatal error during server startup (fallback):", err);
      process.exit(1);
    });
  }
}


export { app }
