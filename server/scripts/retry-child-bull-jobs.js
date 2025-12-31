require('dotenv').config({ path: '../.env' })
const Bull = require('bull')

function parseRedisConfig() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS
  if (!redisUrl) return { redis: { host: 'localhost', port: 6379, maxRetriesPerRequest: null } }
  try {
    const u = new URL(redisUrl)
    const cfg = {
      host: u.hostname,
      port: parseInt(u.port) || 6379,
      password: u.password || undefined,
      username: u.username !== 'default' ? u.username : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
    if (u.protocol === 'rediss:') cfg.tls = { rejectUnauthorized: false }
    return { redis: cfg }
  } catch (e) {
    return { redis: { url: redisUrl, maxRetriesPerRequest: null } }
  }
}

const extractionQueue = new Bull('project-data-extraction', parseRedisConfig())

const parentId = process.argv[2]
if (!parentId) { console.error('Usage: node retry-child-bull-jobs.js <parentJobId>'); process.exit(2) }

(async () => {
  try {
    // Fetch parent job from DB to get childJobIds
    const { Client } = require('pg')
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    const p = await client.query('SELECT data FROM jobs WHERE id = $1', [parentId])
    await client.end()
    if (!p.rows || p.rows.length === 0) { console.error('Parent job not found'); process.exit(1) }
    const childIds = (p.rows[0].data && p.rows[0].data.childJobIds) || []
    if (!childIds.length) { console.log('No childJobIds'); process.exit(0) }

    for (const id of childIds) {
      try {
        const job = await extractionQueue.getJob(id)
        if (!job) {
          console.log(`Job ${id}: not found in Bull`) 
          continue
        }
        const state = await job.getState()
        console.log(`Job ${id}: state=${state}`)
        if (state === 'failed' || state === 'stalled') {
          try {
            await job.retry()
            console.log(`Job ${id}: retry requested`)
          } catch (e) {
            console.error(`Job ${id}: retry failed: ${e.message || e}`)
          }
        }
      } catch (e) {
        console.error(`Error handling job ${id}: ${e && e.stack ? e.stack : e}`)
      }
    }
    process.exit(0)
  } catch (e) {
    console.error(e && e.stack ? e.stack : e)
    process.exit(1)
  }
})();
