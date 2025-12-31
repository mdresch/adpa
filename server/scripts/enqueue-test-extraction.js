require('dotenv').config({ path: '../.env' })
const { Client } = require('pg')
const { v4: uuidv4 } = require('uuid')
const Bull = require('bull')

async function parseRedisConfig() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS
  if (!redisUrl) return { host: 'localhost', port: 6379 }
  try {
    const u = new URL(redisUrl)
    return { host: u.hostname, port: parseInt(u.port) || 6379, password: u.password || undefined, tls: u.protocol === 'rediss:' }
  } catch (e) {
    return { url: redisUrl }
  }
}

;(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.DATABASE })
  await client.connect()

  const jobId = uuidv4()
  const projectId = process.argv[2] || 'e9500dfd-aced-431d-81b4-821a5aada216'
  const userId = process.env.TEST_USER_ID || null
  const domains = [
    'stakeholders','team','development_approach','planning','project_work','delivery','measurement','uncertainty','governance','scope','schedule','finance','resources','risk','stakeholders_ops'
  ]

  const data = {
    jobId,
    projectId,
    userId,
    documentIds: [],
    domains,
    autoTriggered: false
  }

  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO jobs (id, type, status, data, created_by, project_id, queue_name, queued_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [jobId, 'extract-project-data', 'pending', JSON.stringify(data), userId, projectId, 'project-data-extraction'])
    await client.query('COMMIT')
    console.log('Inserted parent job row', jobId)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('DB insert failed', e)
    await client.end()
    process.exit(1)
  }

  // enqueue to Bull with same jobId
  const redisCfg = await parseRedisConfig()
  const queueOpts = redisCfg.url ? { redis: { url: redisCfg.url } } : { redis: { host: redisCfg.host, port: redisCfg.port, password: redisCfg.password, tls: redisCfg.tls ? { rejectUnauthorized: false } : undefined, maxRetriesPerRequest: null, enableReadyCheck: false } }
  const extractionQueue = new Bull('project-data-extraction', queueOpts)

  try {
    const qjob = await extractionQueue.add('extract-project-data', data, { jobId })
    console.log('Enqueued parent job into Bull', qjob.id)
  } catch (e) {
    console.error('Failed to enqueue parent job', e)
    process.exit(1)
  } finally {
    await client.end()
    // do not close queue to allow workers to pick up
  }
})()
