const { createClient } = require('redis')

async function main() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.error('REDIS_URL not set in environment')
    process.exit(1)
  }

  const client = createClient({ url: redisUrl })
  client.on('error', (err) => console.error('Redis client error', err))

  try {
    const start = Date.now()
    await client.connect()
    const pong = await client.ping()
    const latency = Date.now() - start
    console.log('PING response:', pong, 'latency_ms:', latency)
    await client.quit()
  } catch (err) {
    console.error('Ping failed:', err && err.message ? err.message : err)
    process.exitCode = 2
  }
}

main()
.catch(err => {
  console.error('Unexpected error:', err)
  process.exit(3)
})
