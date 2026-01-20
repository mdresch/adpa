
import "./src/tracing"
import dotenv from "dotenv"
import path from "path"
dotenv.config()

import { connectDatabase } from "./src/database/connection"
import { connectRedis } from "./src/utils/redis"
import { logger } from "./src/utils/logger"

// Import queueService to register processors
import "./src/services/queueService"
import { registerPipelineWorker } from "./src/workers/pipelineWorker"
import { WorkerMonitoring } from "./src/utils/workerMonitoring"

async function startWorker() {
    logger.info("🚀 Starting Extra Worker Process...")
    await connectDatabase()
    await connectRedis()

    const WORKER_ID = `worker-extra-${process.pid}-${Date.now()}`
    WorkerMonitoring.start(WORKER_ID, "Extra Worker")

    registerPipelineWorker()
    logger.info("✅ Extra Worker initialized and listening to RabbitMQ")
}

startWorker().catch(err => {
    logger.error("❌ Worker failed to start:", err)
    process.exit(1)
})
