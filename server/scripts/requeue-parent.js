require('dotenv').config({ path: '../.env' })
const { Client } = require('pg')
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

async function main() {
  const parentId = process.argv[2]
  if (!parentId) { console.error('Usage: node requeue-parent.js <parentJobId>'); process.exit(2) }

  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(2) }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    const res = await client.query('SELECT data, status FROM jobs WHERE id = $1', [parentId])
    if (!res.rows || res.rows.length === 0) { console.error('Parent job not found'); process.exit(1) }
    const row = res.rows[0]
    const data = row.data || {}
    console.log(`Parent ${parentId} status=${row.status}. Re-enqueuing...`)

    const extractionQueue = new Bull('project-data-extraction', parseRedisConfig())

    await extractionQueue.add('extract-project-data', data, {
      jobId: parentId,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false
    })

    console.log(`Enqueued parent job to Bull queue with id: ${parentId}`)
    await extractionQueue.close()
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error('Error re-enqueuing parent job:', err.stack || err)
    try { await client.end() } catch (_) {}
    process.exit(1)
  }
}

main()
