require('dotenv').config({ path: '../.env' })
const { v4: uuidv4 } = require('uuid')
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
  const parentJobId = process.argv[2] || uuidv4()
  const projectId = process.argv[3] || 'e9500dfd-aced-431d-81b4-821a5aada216'
  const userId = process.argv[4] || '42ca7333-b37e-4e1b-bd50-ac04abd7e682'

  const jobData = {
    projectId,
    userId,
    domains: [
      'stakeholders','team','development_approach','planning','project_work','delivery','measurement','uncertainty','governance','scope','schedule','finance','resources','risk','stakeholders_ops'
    ],
    documentIds: ['94d19283-94a2-4827-a447-457703293d45'],
    aiProvider: process.env.DEFAULT_AI_PROVIDER || null,
    aiModel: process.env.DEFAULT_AI_MODEL || null,
    autoTriggered: false
  }

  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE
  if (!dbUrl) {
    console.error('DATABASE_URL not set in environment')
    process.exit(2)
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    // Insert a parent job row (minimal columns used by QueueService.addJob)
    const insertSql = `INSERT INTO jobs (id, type, status, data, created_by, project_id, queue_name, queued_at, worker_id)
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`

    await client.query(insertSql, [
      parentJobId,
      'extract-project-data',
      JSON.stringify(jobData),
      userId,
      projectId,
      'project-data-extraction',
      `worker-pending-${process.pid}`
    ])

    console.log('Inserted parent job row:', parentJobId)

    // Enqueue to Bull with same jobId
    const redisCfg = parseRedisConfig()
    const extractionQueue = new Bull('project-data-extraction', redisCfg)

    await extractionQueue.add('extract-project-data', jobData, {
      jobId: parentJobId,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false
    })

    console.log('Enqueued parent job to Bull queue with id:', parentJobId)

    // Close
    await extractionQueue.close()
    await client.end()

    process.exit(0)
  } catch (err) {
    console.error('Error creating/enqueuing parent job:', err.stack || err)
    try { await client.end() } catch (_) {}
    process.exit(1)
  }
}

main()
