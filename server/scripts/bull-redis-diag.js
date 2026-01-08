#!/usr/bin/env node
const Redis = require('ioredis')
require('dotenv').config()

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redis = new Redis(redisUrl)

async function typeLen(key) {
  try {
    const t = await redis.type(key)
    if (t === 'list') return { type: t, len: await redis.llen(key) }
    if (t === 'set') return { type: t, len: await redis.scard(key) }
    if (t === 'zset') return { type: t, len: await redis.zcard(key) }
    if (t === 'hash') return { type: t, len: await redis.hlen(key) }
    return { type: t, len: null }
  } catch (err) {
    return { type: 'error', err: String(err) }
  }
}

async function run() {
  console.log('🔍 Redis Bull Diagnostic')
  console.log('Using REDIS_URL=', redisUrl)

  try {
    const stream = redis.scanStream({ match: 'bull:*', count: 1000 })
    const keys = []
    for await (const resultKeys of stream) {
      for (const k of resultKeys) keys.push(k)
    }

    if (keys.length === 0) {
      console.log('No keys found matching bull:*')
      process.exit(0)
    }

    // Group by queue name
    const queues = {}
    for (const k of keys) {
      const parts = k.split(':')
      // bull:<queue>:<rest>
      const q = parts[1] || '<unknown>'
      queues[q] = queues[q] || []
      queues[q].push(k)
    }

    for (const [q, qKeys] of Object.entries(queues)) {
      console.log(`\nQueue: ${q} — ${qKeys.length} keys`)
      // For common Bull keys, attempt to fetch counts
      const interesting = [
        `bull:${q}:wait`,
        `bull:${q}:active`,
        `bull:${q}:delayed`,
        `bull:${q}:failed`,
        `bull:${q}:completed`,
        `bull:${q}:paused`,
        `bull:${q}:meta`,
      ]

      for (const key of interesting) {
        if (qKeys.includes(key)) {
          const info = await typeLen(key)
          if (info.type === 'list') {
            console.log(`  ${key} (list) length=${info.len}`)
            // show first 10 items for lists
            try {
              const items = await redis.lrange(key, 0, 9)
              console.log(`    sample: ${items.slice(0,3).map(i => i && i.substring ? i.substring(0,120) : String(i)).join('\n    ')}`)
            } catch (e) {}
          } else if (info.type === 'zset') {
            console.log(`  ${key} (zset) length=${info.len}`)
          } else if (info.type === 'set') {
            console.log(`  ${key} (set) size=${info.len}`)
          } else if (info.type === 'hash') {
            console.log(`  ${key} (hash) fields=${info.len}`)
          } else {
            console.log(`  ${key} type=${info.type} ${info.err ? ' err='+info.err : ''}`)
          }
        }
      }

      // Fallback: list up to 5 keys for this queue
      console.log('  Other keys:')
      qKeys.slice(0, 10).forEach(k => console.log('   -', k))
    }

    // Example: inspect waiting list for project-data-extraction
    const sampleKey = 'bull:project-data-extraction:wait'
    if (keys.includes(sampleKey)) {
      const items = await redis.lrange(sampleKey, 0, 9)
      console.log('\nSample waiting items for project-data-extraction:')
      items.forEach((it, idx) => console.log(`  [${idx}] ${it.substring(0,200)}`))
    }

  } catch (err) {
    console.error('Diagnostic failed:', err)
  } finally {
    redis.disconnect()
  }
}

run()
