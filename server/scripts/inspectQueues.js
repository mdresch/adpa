/*
  Quick inspection script for DB pending jobs and Bull/Redis queue counts.
  Run from repo root: `node ./server/scripts/inspectQueues.js`
  Requires env vars: DATABASE_URL and either REDIS_URL or REDIS_HOST/REDIS_PORT
*/

require('dotenv').config()
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule
const { createClient } = require('redis')

const QUEUES = [
  'ai-processing',
  'document-processing',
  'pipeline-processing',
  'baseline-processing',
  'process-flow-processing',
  'document-regeneration',
  'quality-audit',
  'project-data-extraction',
  'confluence-publishing'
]

async function inspectDb() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in environment')
    return { error: 'no-database-url' }
  }

  try {
    await db.initDb()
    const pending = await db.query("SELECT id,type,status,queue_name,queued_at,worker_id,error_message FROM jobs WHERE status='pending' ORDER BY queued_at DESC LIMIT 200")
    const processing = await db.query("SELECT id,type,status,queue_name,queued_at,worker_id,error_message,started_at,processing_started_at FROM jobs WHERE status='processing' ORDER BY processing_started_at DESC LIMIT 200")
    return { pending: pending?.rows || [], processing: processing?.rows || [] }
  } catch (err) {
    return { error: err.message || String(err), stack: err.stack }
  } finally {
    try { await db.end() } catch (e) {}
  }
}

async function inspectRedis() {
  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`
  let client
  try {
    client = createClient({ url: redisUrl })
    client.on('error', (e) => {})
    await client.connect()
  } catch (err) {
    return { error: `redis_connect_failed: ${err.message || err}` }
  }

  try {
    const info = await client.ping()
    const results = { ping: info, queues: {} }
    for (const q of QUEUES) {
      const waitKey = `bull:${q}:wait`
      const activeKey = `bull:${q}:active`
      const delayedKey = `bull:${q}:delayed`
      const failedKey = `bull:${q}:failed`

      let wait = 0, active = 0, delayed = 0, failed = 0
      try { wait = await client.lLen(waitKey) } catch (e) {}
      try { active = await client.lLen(activeKey) } catch (e) {}
      try { delayed = await client.zCard(delayedKey) } catch (e) {}
      try { failed = await client.lLen(failedKey) } catch (e) {}

      let sampleWaiting = []
      try {
        const raw = await client.lRange(waitKey, 0, 9)
        sampleWaiting = raw
      } catch (e) {}

      results.queues[q] = { wait, active, delayed, failed, sampleWaiting }
    }

    // Also list keys for bull:* prefix (count up to 200 keys)
    let keys = []
    try {
      keys = await client.sendCommand(['KEYS', 'bull:*'])
    } catch (e) { keys = [] }

    results.keysSample = keys.slice(0, 200)
    
      // Gather limited details for a subset of keys to help identify where jobs are stored
      const keysDetails = {}
      try {
        const sampleKeys = results.keysSample.slice(0, 80)
        for (const k of sampleKeys) {
          try {
            const type = await client.sendCommand(['TYPE', k])
            let sample = null
            if (type === 'hash') {
              try { sample = await client.hGetAll(k) } catch (e) { sample = `hgetall_error: ${e.message || e}` }
            } else if (type === 'string') {
              try { sample = await client.get(k) } catch (e) { sample = `get_error: ${e.message || e}` }
            } else if (type === 'list') {
              try { sample = await client.lRange(k, 0, 9) } catch (e) { sample = `lrange_error: ${e.message || e}` }
            } else if (type === 'zset') {
              try { sample = await client.zRangeWithScores(k, 0, 9) } catch (e) { sample = `zrange_error: ${e.message || e}` }
            } else {
              sample = `type:${type}`
            }
            keysDetails[k] = { type, sample }
          } catch (e) {
            keysDetails[k] = { error: e.message || String(e) }
          }
        }
      } catch (e) {
        // ignore
      }

      results.keysDetails = keysDetails
    await client.disconnect()
    return results
  } catch (err) {
    try { await client.disconnect() } catch (e) {}
    return { error: err.message || String(err) }
  }
}

async function main() {
  console.log('Inspecting database for pending/processing jobs...')
  const db = await inspectDb()
  console.log('DB inspection result:')
  console.log(JSON.stringify(db.error ? { error: db.error } : { pendingCount: (db.pending||[]).length, processingCount: (db.processing||[]).length, samplePending: (db.pending||[]).slice(0,10) }, null, 2))

  console.log('\nInspecting Redis/Bull queues...')
  const redis = await inspectRedis()
  console.log('Redis inspection result:')
  console.log(JSON.stringify(redis, null, 2))

  // Short interpretation hints
  console.log('\nHints:')
  if (db.error) console.log('- DB error occurred; workers will not be able to update job status if DB is unreachable')
  if (redis.error) console.log('- Redis error occurred; Bull cannot claim or deliver jobs if Redis is unreachable')
  if (!db.error && (db.pending||[]).length > 0) console.log(`- There are ${db.pending.length} pending jobs in DB`) 
  if (!redis.error) {
    const totalWaiting = Object.values(redis.queues||{}).reduce((s, q) => s + (q.wait||0), 0)
    console.log(`- Total waiting jobs reported in Redis across known queues: ${totalWaiting}`)
  }
}

main().catch(e => { console.error('Script error:', e); process.exit(1) })
