#!/usr/bin/env node
const Redis = require('ioredis')
require('dotenv').config()

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redis = new Redis(redisUrl)

async function inspectFailed() {
  console.log('🔍 Fetching failed Bull jobs from Redis')

  try {
    const stream = redis.scanStream({ match: 'bull:*:failed', count: 1000 })
    const failedKeys = []
    for await (const keys of stream) {
      for (const k of keys) failedKeys.push(k)
    }

    if (failedKeys.length === 0) {
      console.log('No failed sets found')
      return
    }

    for (const fk of failedKeys) {
      console.log(`\nFailed set: ${fk}`)
      const parts = fk.split(':')
      const queue = parts[1]
      const jobIds = await redis.zrange(fk, 0, -1)
      console.log(`  Found ${jobIds.length} job ids (showing up to 20)`)

      for (const id of jobIds.slice(0, 20)) {
        const jobKey = `bull:${queue}:${id}`
        const t = await redis.type(jobKey)
        let payload = null
        if (t === 'hash') {
          const h = await redis.hgetall(jobKey)
          payload = h
        } else if (t === 'string') {
          const s = await redis.get(jobKey)
          payload = s
        } else {
          // Some jobs use numeric keys or different shapes - try fallback keys
          const alt = await redis.get(jobKey) || await redis.hgetall(jobKey)
          payload = alt
        }

        // Extract common fields
        let dataField = null
        let failedReason = null
        if (payload) {
          if (typeof payload === 'object') {
            dataField = payload.data || payload.payload || payload['data:'] || null
            failedReason = payload.failedReason || payload.failed || (payload.stacktrace ? payload.stacktrace[0] : null)
          } else if (typeof payload === 'string') {
            try {
              const parsed = JSON.parse(payload)
              dataField = parsed.data || parsed.payload || parsed
              failedReason = parsed.failedReason || parsed.failedReason || null
            } catch (e) {
              dataField = payload.substring(0, 400)
            }
          }
        }

        console.log(`  - JobID: ${id}`)
        console.log(`    keyType: ${t}`)
        if (failedReason) console.log(`    failedReason: ${String(failedReason).substring(0, 300)}`)
        if (dataField) {
          let preview = typeof dataField === 'string' ? dataField : JSON.stringify(dataField)
          console.log(`    dataPreview: ${preview.substring(0, 400)}`)
        }
      }
    }
  } catch (err) {
    console.error('Error inspecting failed jobs:', err)
  } finally {
    redis.disconnect()
  }
}

inspectFailed()
