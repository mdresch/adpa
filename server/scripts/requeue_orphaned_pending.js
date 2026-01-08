#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

(async function(){ try{ await db.initDb() } catch(e){} })();
const db = require('../src/lib/db')
const Bull = require('bull')
const path = require('path')

const { readFileSync } = require('fs')
const dbHost = process.env.DB_HOST || process.env.PGHOST || '127.0.0.1'
const dbPort = Number(process.env.DB_PORT || process.env.PGPORT || 5432)
const dbUser = process.env.DB_USER || process.env.PGUSER || 'postgres'
const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD || ''
const dbName = process.env.DB_NAME || process.env.PGDATABASE || 'postgres'

let pool = null


const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`

const typeToQueue = {
  'ai-generate': 'ai-processing',
  'document-convert': 'document-processing',
  'pipeline-processing': 'pipeline-processing',
  'baseline-extract': 'baseline-processing',
  'process-flow': 'process-flow-processing',
  'document-regeneration': 'document-regeneration',
  'quality-audit': 'quality-audit',
  'extract-project-data': 'project-data-extraction'
}

async function requeueOrphaned() {
  console.log('Connecting to DB...')
  try {
    console.log('DB connection params:', { host: dbHost, port: dbPort, user: dbUser, database: dbName })
    // Create pool: prefer explicit POSTGRES_URL/DATABASE_URL when present
    const connString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (connString) {
      pool = new (require('pg').Pool)({ connectionString: connString, ssl: process.env.DB_SSL || process.env.PGSSLMODE ? { rejectUnauthorized: false } : false })
    } else {
      pool = new (require('pg').Pool)({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: String(dbPassword),
        database: dbName,
        ssl: process.env.DB_SSL || process.env.PGSSLMODE ? { rejectUnauthorized: false } : false
      })
    }
    console.log('DB password type:', typeof dbPassword)
    const res = await db.query(
      `SELECT id, type, queue_name, data
       FROM jobs
       WHERE status = 'pending'
         AND COALESCE(queued_at, created_at) < NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC
       LIMIT 200`
    )

    if (!res.rows.length) {
      console.log('No orphaned pending jobs found.')
      try { await db.end() } catch (e) {}return
    }

    console.log(`Found ${res.rows.length} orphaned pending jobs. Attempting to re-queue...`)

    const requeued = []
    const failed = []

    for (const job of res.rows) {
      const queueName = job.queue_name || typeToQueue[job.type] || 'ai-processing'
      const q = new Bull(queueName, redisUrl)

      try {
        const existing = await q.getJob(job.id)
        if (existing) {
          console.log(`Job ${job.id} already exists in queue ${queueName}, skipping.`)
          await q.close()
          continue
        }

        const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data || {}

        await q.add(job.type, { ...jobData, jobId: job.id }, { jobId: job.id, priority: jobData.priority || 0 })

        requeued.push({ jobId: job.id, queue: queueName })
        console.log(`Re-queued job ${job.id} -> ${queueName}`)
      } catch (err) {
        console.error(`Failed to requeue ${job.id}:`, err.message || err)
        try {
          await db.query(
            `UPDATE jobs SET status = 'failed', error_message = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [job.id, `Orphaned job - failed to re-queue: ${err.message || String(err)}`]
          )
        } catch (uerr) {
          console.error('Also failed to mark job as failed in DB:', uerr.message || uerr)
        }
        failed.push({ jobId: job.id, error: err.message || String(err) })
      } finally {
        try { await q.close() } catch (e) {}
      }
    }

    console.log('\nSummary:')
    console.log(`Requeued: ${requeued.length}`)
    if (failed.length) console.log(`Failed: ${failed.length}`)

    try { await db.end() } catch (e) {}} catch (err) {
    console.error('Requeue script error:', err.message || err)
    console.error(err.stack || '')
    try { try { await db.end() } catch (e) {}} catch (e) {}
    process.exit(1)
  }
}

requeueOrphaned()
