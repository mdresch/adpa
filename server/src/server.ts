// IMPORTANT: Tracing and Environment must be initialized FIRST
import dotenv from "dotenv"
dotenv.config()

// 1. Initialize Firebase Admin immediately to ensure credentials are set before any other module imports it
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'adpa-frontend';
  
  console.log(`🔍 [Startup] Initializing Firebase Admin FIRST:`);
  console.log(`   - Project ID: ${projectId}`);
  console.log(`   - Client Email: ${clientEmail || '(not set)'}`);
  
  const options: any = {
    projectId: projectId
  };

  try {
    if (serviceAccountBase64) {
      const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      options.credential = admin.credential.cert(JSON.parse(decoded));
      console.log("✅ Firebase Admin initialized with Base64");
    } else if (privateKey && clientEmail) {
      // Fix: Be extremely aggressive with newline cleaning for Windows/Shell compatibility
      const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/\n/g, '\n');
      options.credential = admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: formattedKey,
      });
      console.log("✅ Firebase Admin initialized with individual credentials");
    } else if (serviceAccountVar) {
      let cleanedVar = serviceAccountVar.trim();
      cleanedVar = cleanedVar.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      options.credential = admin.credential.cert(JSON.parse(cleanedVar));
      console.log("✅ Firebase Admin initialized with JSON string");
    }
  } catch (err: any) {
    console.error(`❌ Critical failure during early Firebase init: ${err.message}`);
  }

  admin.initializeApp(options);
}

// 2. Initialize Tracing
import "./tracing"

import express from "express"
import cors from "cors"
import helmet from "helmet"
import { createServer } from "http"
import { initSocketIO } from "./socket"

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
// Optional: AI Provider Testing routes
let aiProviderTestingRoutes: any | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("./routes/ai-provider-testing")
  aiProviderTestingRoutes = m?.default || m
} catch (e) { }

import processFlowRoutes from "./routes/process-flow"
import stakeholderRoutes from "./routes/stakeholders"
import skillsRoutes from "./routes/skills"
import competenciesRoutes from "./routes/competencies"
import contentStructuringRoutes from "./routes/content-structuring"
import compressionRoutes from "./routes/compression"
import contextInjectionRoutes from "./routes/context-injection"
import pipelineRoutes from "./routes/pipeline"
import documentGenerationRoutes from "./routes/documentGeneration"
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
import complianceRoutes from "./routes/complianceRoutes"
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
import semanticProcessingRoutes from "./routes/semanticProcessingRoutes"
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
import aiModelsRoutes from "./routes/ai-models"
import documentModuleRoutes from "./modules/documents/routes"
import analysisModuleRoutes from "./modules/analysis/routes"
import openuiChatModuleRoutes from "./modules/openuiChat/routes"
import { registerRoutes } from "./routes/registry"

const app = express()
const server = createServer(app)
const io = initSocketIO(server)

const PORT = parseInt(process.env.PORT || "5000", 10)

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3005",
  "http://localhost:4280",
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.ADDITIONAL_ALLOWED_ORIGINS ? process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
  /https:\/\/.*\.vercel\.app$/,
  /https:\/\/adpa.*\.vercel\.app$/,
  /https:\/\/.*\.onrender\.com$/,
  /https:\/\/.*\.azurestaticapps\.net$/,
  "https://adpa-frontend.onrender.com",
  "https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io",
  "https://adpa.vercel.app",
  "https://adpa--adpa-frontend.europe-west4.hosted.app",
].filter(Boolean) as (string | RegExp)[]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') return allowed === origin
        if (allowed instanceof RegExp) return allowed.test(origin)
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

app.use(pinoHttp({ logger: logger as any }));
app.use(correlationIdMiddleware);
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.startsWith('multipart/form-data')) return next()
  express.json({ limit: "10mb" })(req, res, next)
})
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.startsWith('multipart/form-data')) return next()
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next)
})

app.locals.pool = pool
import { analyticsMiddleware } from "./middleware/analyticsMiddleware"
app.use(analyticsMiddleware)
logger.info("📊 Analytics tracking middleware enabled")

app.use("/health", healthRoutes)
app.use("/api/health", healthRoutes)

app.get("/api/debug-env", (req, res) => {
  res.json({
    NEO4J_URI: process.env.NEO4J_URI,
    NODE_ENV: process.env.NODE_ENV,
    TIMESTAMP: new Date().toISOString()
  })
})

// Block API requests until all dependencies (like the database) are fully initialized.
// This prevents 500 errors and unhandled exceptions caused by accessing uninitialized pools.
import { startupManager } from "./startup/serverBootstrap";
app.use((req, res, next) => {
  if (startupManager && !startupManager.isReady()) {
    res.setHeader('Retry-After', '5'); // Hint to clients (and frontend proxy) to retry
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is currently initializing dependencies (e.g. database connection). Please try again in a few seconds.'
    });
  }
  next();
});

console.log("🔧 Registering API routes...")

if (morphicModuleRoutes && morphicModuleRoutes[0]) {
  app.use("/api/v1/morphic", morphicModuleRoutes[0].router)
  app.use("/api/morphic", morphicModuleRoutes[0].router)
}
if (projectsModuleRoutes && projectsModuleRoutes[0]) app.use("/api/projects", projectsModuleRoutes[0].router)
if (authModuleRoutes && authModuleRoutes[0]) app.use("/api/auth", authModuleRoutes[0].router)
if (morphicModuleRoutes && morphicModuleRoutes[0]) {
  app.use("/api/v1/morphic", morphicModuleRoutes[0].router)
  app.use("/api/morphic", morphicModuleRoutes[0].router)
}
if (executionModuleRoutes && executionModuleRoutes[0]) app.use("/api", executionModuleRoutes[0].router)
if (portfolioModuleRoutes && portfolioModuleRoutes[0]) {
  app.use("/api/portfolios", portfolioModuleRoutes[0].router)
  app.use("/api/portfolio", portfolioModuleRoutes[0].router)
  app.use("/api/portfolio-domains", (req, res, next) => { req.url = '/domains' + req.url; next(); }, portfolioModuleRoutes[0].router)
}
if (templatesModuleRoutes && templatesModuleRoutes[0]) app.use("/api/templates", templatesModuleRoutes[0].router)
if (intelligenceModuleRoutes && intelligenceModuleRoutes[0]) app.use("/api/analytics", intelligenceModuleRoutes[0].router)
if (integrationsModuleRoutes && integrationsModuleRoutes[0]) app.use("/api/integrations", integrationsModuleRoutes[0].router)
if (documentModuleRoutes && documentModuleRoutes[0]) app.use("/api/documents", documentModuleRoutes[0].router)
if (analysisModuleRoutes && analysisModuleRoutes[0]) {
  app.use("/api/project-data-extraction", (req, res, next) => {
    const summaryMatch = req.url.match(/^\/([^/]+)\/summary$/)
    if (summaryMatch) req.url = `/summary/${summaryMatch[1]}`
    next()
  }, analysisModuleRoutes[0].router)
}

app.use("/api/document-generation", documentGenerationRoutes)
if (openuiChatModuleRoutes && openuiChatModuleRoutes[0]) app.use("/api/v1/openui-chat", openuiChatModuleRoutes[0].router)
app.use("/api/jobs", jobRoutes)
app.use("/api/jobs/diagnostics", jobsDiagnosticsRoutes)
app.use("/api/queue-stats", queueStatsRoutes)
app.use("/api/security", securityRoutes)
app.use("/api/cost-management", costManagementRoutes)
app.use("/api/document-templates", documentTemplateRoutes)
app.use("/api/document-generator", documentGeneratorRoutes)
app.use("/api/adobe-pdf", adobePdfRoutes)
app.use("/api/documents", createDocumentFormatRoutes(pool))
app.use("/api/context-ai", contextAiRoutes)
app.use("/api/contexts", contextRoutes)
if (aiProviderTestingRoutes) app.use("/api/ai-provider-testing", aiProviderTestingRoutes)
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
app.use("/api/compliance", complianceRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/onboarding", documentUploadRoutes)
app.use("/api/assessment", assessmentExportRoutes)
app.use("/api/semantic-processing", semanticProcessingRoutes)
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
app.use("/api/ai-models", aiModelsRoutes)
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
app.use("/api/lessons", lessonsLearnedRoutes)
app.use("/api/context-orchestrator", contextOrchestratorRoutes)
app.use("/api/ux-documentation", uxDocumentationRoutes)

registerRoutes(app).catch(err => {
  console.error("❌ Failed to register modular routes:", err)
  logger.error(err, "❌ Failed to register modular routes")
})

import { attachAgentRoutes } from './routes/agents';
attachAgentRoutes(io);

io.on("connection", (socket) => {
  socket.on("join", async (room: string) => {
    try {
      const projectMatch = typeof room === 'string' ? room.match(/^project:(.+)$/) : null
      if (projectMatch) {
        const token = socket.handshake?.auth?.token
        if (!token) { socket.emit('join:error', { room, message: 'Authentication required' }); return; }
        const jwtParts = token.split('.')
        if (jwtParts.length !== 3) {
          socket.emit('join:error', { room, message: 'Invalid token format', code: 'AUTH_INVALID' })
          return
        }
        // Match authenticateToken: Firebase ID token first, then legacy JWT (internal user UUID).
        let firebaseEmail: string | null = null
        let legacyUserId: string | null = null
        try {
          const firebaseUser = await admin.auth().verifyIdToken(token)
          firebaseEmail = firebaseUser.email ? String(firebaseUser.email).trim() : null
        } catch {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId?: string }
            legacyUserId = decoded?.userId || null
          } catch {
            socket.emit('join:error', { room, message: 'Invalid token', code: 'AUTH_INVALID' })
            socket.disconnect(true)
            return
          }
        }
        let userRes
        if (firebaseEmail) {
          userRes = await safeQuery(
            pool,
            'SELECT id, name, role FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))',
            [firebaseEmail]
          )
        } else if (legacyUserId) {
          userRes = await safeQuery(pool, 'SELECT id, name, role FROM users WHERE id = $1', [legacyUserId])
        } else {
          socket.emit('join:error', { room, message: 'Invalid token', code: 'AUTH_INVALID' })
          socket.disconnect(true)
          return
        }
        if (!userRes || userRes.rows.length === 0) {
          socket.emit('join:error', { room, message: 'User not found' })
          return
        }
        const user = userRes.rows[0]
        const internalUserId = user.id as string

        const roleLower = String(user.role || '').toLowerCase()
        const isElevated = roleLower === 'admin' || roleLower === 'super_admin'
        const projRes = await safeQuery(
          pool,
          `SELECT id FROM projects
           WHERE id = $1
             AND (
               $2::boolean
               OR owner_id = $3
               OR created_by = $3
               OR team_members ? $3::text
             )`,
          [projectMatch[1], isElevated, internalUserId]
        )
        if (!projRes || projRes.rows.length === 0) {
          const exists = await safeQuery(pool, 'SELECT 1 FROM projects WHERE id = $1 LIMIT 1', [projectMatch[1]])
          if (!exists || exists.rows.length === 0) {
            socket.emit('join:error', { room, message: 'Project not found' })
          } else {
            socket.emit('join:error', { room, message: 'Access denied' })
          }
          return
        }
        socket.join(room)
        socket.emit('join:ok', { room })
      } else {
        socket.join(room); socket.emit('join:ok', { room });
      }
    } catch (err) { socket.emit('join:error', { room, message: 'Internal error' }); }
  })
})

app.use(errorHandler)
async function startServer() {
  await initializeServerWithDependencyGraph(server, io, PORT)
}

process.on('unhandledRejection', (reason, promise) => { logger.error({ promise, reason }, 'Unhandled Rejection'); });
process.on('uncaughtException', (error) => { logger.error(error, 'Uncaught Exception'); process.exit(1); });

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].includes('src/server.ts'))) {
  console.log("🚀 Starting server context...");
  startServer().catch(err => { console.error("❌ Error during server startup:", err); });
} else if (!process.argv[1] || process.argv[1].includes('server')) {
  console.log("🚀 Starting server context (fallback)...");
  startServer().catch(err => { console.error("❌ Fatal error during server startup:", err); process.exit(1); });
}

export { app }
