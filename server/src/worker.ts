// IMPORTANT: Tracing and Environment must be initialized FIRST
import path from "path"
import dotenv from "dotenv"
dotenv.config({ path: path.join(__dirname, "../.env") })

// 1. Initialize Firebase Admin immediately (needed for dependency boot if optional deps fail)
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'adpa-frontend';
  
  console.log(`🔍 [Worker Startup] Initializing Firebase Admin:`);
  console.log(`   - Project ID: ${projectId}`);
  
  const options: any = {
    projectId: projectId
  };

  try {
    if (serviceAccountBase64) {
      const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      options.credential = admin.credential.cert(JSON.parse(decoded));
      console.log("✅ Firebase Admin initialized with Base64 in Worker");
    } else if (privateKey && clientEmail) {
      const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/\n/g, '\n');
      options.credential = admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: formattedKey,
      });
      console.log("✅ Firebase Admin initialized with individual credentials in Worker");
    } else if (serviceAccountVar) {
      let cleanedVar = serviceAccountVar.trim();
      cleanedVar = cleanedVar.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      options.credential = admin.credential.cert(JSON.parse(cleanedVar));
      console.log("✅ Firebase Admin initialized with JSON string in Worker");
    }
  } catch (err: any) {
    console.error(`❌ Early Firebase init failure in Worker: ${err.message}`);
  }

  admin.initializeApp(options);
}

// 2. Initialize Tracing
import "./tracing"

import { createServer } from "http"
import { logger } from "./utils/logger"
import { initializeServerWithDependencyGraph } from "./startup/serverBootstrap"
import { getDependencyHealthStatus } from "./routes/health"
import { pool } from "./database/connection"
import { safeQuery } from "./services/jobs/dbGuards"

// Worker HTTP Health Check Port (defaults to 5001 for separate process role checking)
const PORT = parseInt(process.env.WORKER_PORT || process.env.PORT || "5001", 10)

// Create a minimal Node HTTP server to satisfy dependency graph bindings without Express app
const server = createServer(async (req, res) => {
  const url = req.url || ""

  // Liveness Check
  if (url === "/health" || url === "/api/health" || url === "/health/live") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      role: "worker"
    }))
    return
  }

  // Readiness Check
  if (url === "/health/ready") {
    try {
      const dbRegistryStatus = getDependencyHealthStatus("Database")
      const queryResult = await safeQuery(pool, "SELECT 1")
      
      if (queryResult === null || dbRegistryStatus === "unhealthy") {
        res.writeHead(503, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "unhealthy", message: "Database is not ready" }))
      } else {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "healthy", message: "Worker is ready to process jobs" }))
      }
    } catch (err) {
      res.writeHead(503, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "unhealthy", error: String(err) }))
    }
    return
  }

  // Default Fallback
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not Found", message: "Worker node only exposes health endpoints" }))
})

// Stub socket.io to prevent startup exceptions when progress is updated in jobs
const mockIo = {
  emit: (event: string, data: any) => {
    logger.debug({ event, data }, "[WORKER-IO] Stubbed socket emit")
  },
  on: () => {}
}

async function startWorker() {
  console.log("🚀 Starting ADPA Worker Context...");
  
  // Disable stuck job monitor on the worker instance, let the API server manage cleanups
  process.env.SKIP_JOBS = "true"

  await initializeServerWithDependencyGraph(server, mockIo as any, PORT)
  logger.info(`✅ Worker initialization complete. Listening on port ${PORT}`)
}

startWorker().catch(err => {
  console.error("❌ Critical failure during worker startup:", err)
  logger.error(err, "Worker process crashed")
  process.exit(1)
})
