require('dotenv').config()
const { createClient } = require('redis')

async function findJobs(ids) {
  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`
  const client = createClient({ url: redisUrl })
  client.on('error', () => {})
  await client.connect()
  const results = {}
  try {
    for (const id of ids) {
      results[id] = { keys: [], details: {} }
      // Use SCAN to find matching keys (safe for large keyspaces)
      let cursor = '0'
      do {
        const resp = await client.sendCommand(['SCAN', cursor, 'MATCH', `*${id}*`, 'COUNT', '100'])
        const nextCursor = resp[0]
        const keys = resp[1]
        cursor = String(nextCursor)
        for (const k of keys) {
          results[id].keys.push(k)
        }
      } while (cursor !== '0')

      // Fetch basic details for found keys (limit to 50)
      const sample = results[id].keys.slice(0, 50)
      for (const k of sample) {
        try {
          const type = await client.sendCommand(['TYPE', k])
          let sampleVal = null
          if (type === 'hash') sampleVal = await client.hGetAll(k)
          else if (type === 'string') sampleVal = await client.get(k)
          else if (type === 'list') sampleVal = await client.lRange(k, 0, 9)
          else if (type === 'zset') sampleVal = await client.zRangeWithScores(k, 0, 9)
          else sampleVal = `type:${type}`
          results[id].details[k] = { type, sample: sampleVal }
        } catch (e) {
          results[id].details[k] = { error: e.message || String(e) }
        }
      }
    }
  } finally {
    await client.disconnect()
  }
  return results
}

async function main() {
  const ids = process.argv.slice(2)
  if (!ids.length) {
    console.error('Usage: node findRedisJobs.js <jobId1> <jobId2> ...')
    process.exit(1)
  }
  const r = await findJobs(ids)
  console.log(JSON.stringify(r, null, 2))
}

main().catch(e => { console.error(e); process.exit(2) })
