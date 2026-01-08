#!/usr/bin/env ts-node
/**
 * Quick queue inspector: lists Bull queue stats and optionally resumes paused queues.
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/inspect-queues.ts [--resume] [--queue=name1,name2] [--jobs]
 */
import dotenv from "dotenv"
import type Bull from "bull"

dotenv.config()

// Use require for local TS modules to avoid ESM resolution issues when running via ts-node
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { connectDatabase } = require("../server/src/database/connection")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { connectRedis } = require("../server/src/utils/redis")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
  extractionQueue,
  confluenceQueue,
} = require("../server/src/services/queueService") as {
  aiQueue: Bull.Queue
  documentQueue: Bull.Queue
  pipelineQueue: Bull.Queue
  baselineQueue: Bull.Queue
  processFlowQueue: Bull.Queue
  regenerationQueue: Bull.Queue
  qualityAuditQueue: Bull.Queue
  extractionQueue: Bull.Queue
  confluenceQueue: Bull.Queue
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { documentUploadQueue } = require("../server/src/services/documentUploadService") as {
  documentUploadQueue: Bull.Queue
}

interface CliFlags {
  resume: boolean
  queueFilter: Set<string> | null
  showJobs: boolean
}

function parseFlags(): CliFlags {
  const raw = process.argv.slice(2)
  let resume = false
  let queueFilter: Set<string> | null = null
  let showJobs = false

  raw.forEach((arg) => {
    if (arg === "--resume") resume = true
    if (arg === "--jobs") showJobs = true
    if (arg.startsWith("--queue=")) {
      const list = arg.split("=")[1]?.split(",").map((s) => s.trim()).filter(Boolean) || []
      if (list.length > 0) {
        queueFilter = new Set(list)
      }
    }
  })

  return { resume, queueFilter, showJobs }
}

interface QueueDescriptor {
  name: string
  queue: Bull.Queue
}

const queues: QueueDescriptor[] = [
  { name: "ai-processing", queue: aiQueue },
  { name: "document-processing", queue: documentQueue },
  { name: "document-upload", queue: documentUploadQueue },
  { name: "pipeline-processing", queue: pipelineQueue },
  { name: "baseline-processing", queue: baselineQueue },
  { name: "process-flow-processing", queue: processFlowQueue },
  { name: "document-regeneration", queue: regenerationQueue },
  { name: "quality-audit", queue: qualityAuditQueue },
  { name: "project-data-extraction", queue: extractionQueue },
  { name: "confluence-publishing", queue: confluenceQueue },
]

async function getTopWaitingJobs(queue: Bull.Queue, limit: number) {
  const jobs = await queue.getJobs(["waiting", "paused"], 0, limit - 1)
  return jobs.map((job) => ({
    id: job.id?.toString?.() || String(job.id),
    name: job.name,
    attempts: job.attemptsMade,
  }))
}

async function inspectQueue({ name, queue }: QueueDescriptor, showJobs: boolean) {
  const [waiting, active, delayed, failed, completed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
    queue.getCompletedCount(),
    queue.isPaused().catch(() => false),
  ])

  const summary = { waiting, active, delayed, failed, completed, paused }
  console.log(`\n[${name}]`, summary)

  if (showJobs && waiting > 0) {
    const top = await getTopWaitingJobs(queue, 25)
    console.log(`[${name}] waiting jobs (up to 25):`, top)
  }

  return summary
}

async function main() {
  const flags = parseFlags()

  // Ensure backing services are up before hitting queues
  await connectDatabase()
  await connectRedis()

  const targets = flags.queueFilter
    ? queues.filter((q) => flags.queueFilter!.has(q.name))
    : queues

  console.log(`Inspecting ${targets.length} queue(s)...${flags.resume ? " (will resume if paused)" : ""}`)

  for (const descriptor of targets) {
    const summary = await inspectQueue(descriptor, flags.showJobs)
    if (flags.resume && summary.paused) {
      await descriptor.queue.resume()
      console.log(`[${descriptor.name}] resumed`)
    }
  }

  console.log("Done")
  process.exit(0)
}

main().catch((err) => {
  console.error("Queue inspection failed:", err)
  process.exit(1)
})
