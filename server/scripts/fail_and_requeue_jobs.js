#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const db = require('../src/lib/db')
const { randomUUID } = require('crypto')

const dbHost = process.env.DB_HOST || process.env.PGHOST || '127.0.0.1'
const dbPort = Number(process.env.DB_PORT || process.env.PGPORT || 5432)
const dbUser = process.env.DB_USER || process.env.PGUSER || 'postgres'
const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD || ''
const dbName = process.env.DB_NAME || process.env.PGDATABASE || 'postgres'

const idsArg = process.argv.find(a => a.startsWith('--job-ids=')) || process.argv[2]
if (!idsArg) {
  console.error('Usage: fail_and_requeue_jobs.js --job-ids id1,id2,... [--no-auto-fix]')
  process.exit(1)
}

const ids = (idsArg.indexOf('=') > -1 ? idsArg.split('=')[1] : idsArg).split(',').map(s => s.trim()).filter(Boolean)
const autoFix = !process.argv.includes('--no-auto-fix')

async function main() {
  await db.initDb()
  try {
    for (const id of ids) {
      console.log('Processing job:', id)
      const res = await db.query('SELECT id, type, queue_name, data, created_by FROM jobs WHERE id = $1', [id])
      if (!res.rows.length) {
        console.warn('Job not found:', id)
        continue
      }
      const job = res.rows[0]

      // Mark original job as failed
      const failMsg = 'Manually marked failed for safe requeue'
      await db.query('UPDATE jobs SET status = $2, error_message = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $1', [id, 'failed', failMsg])
      console.log('Marked original job failed:', id)

      // Prepare data, with optional simple auto-fix for "Month N" -> ISO date YYYY-MM-01
      let jobData = job.data || {}
      if (autoFix) {
        try {
          const raw = typeof jobData === 'string' ? jobData : JSON.stringify(jobData)
          const fixed = raw.replace(/Month\s+(\d{1,2})/g, (m, p1) => {
            const mm = String(Math.max(1, Math.min(12, Number(p1)))).padStart(2, '0')
            const iso = `${new Date().getUTCFullYear()}-${mm}-01`
            return iso
          })
          jobData = JSON.parse(fixed)
        } catch (e) {
          console.warn('Auto-fix parse error, leaving data as-is for job', id)
          jobData = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
        }
      } else {
        jobData = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
      }

      // Insert a new pending job with a new id and queued_at set to 10 minutes ago so requeue script can pick it
      const newId = randomUUID()
      const insertSql = `INSERT INTO jobs (id, type, status, queue_name, data, created_at, queued_at, created_by)
                         VALUES ($1, $2, $3, $4, $5::jsonb, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', $6)`
      await db.query(insertSql, [newId, job.type, 'pending', job.queue_name || null, JSON.stringify(jobData), job.created_by || null])
      console.log('Inserted new pending job:', newId)
    }

    console.log('Done. Closing DB connection.')
    try { await db.end() } catch (e) {}
  } catch (err) {
    console.error('Error during fail & requeue:', err.message || err)
    try { await db.end() } catch (e) {}
    process.exit(1)
  }
}

main()
