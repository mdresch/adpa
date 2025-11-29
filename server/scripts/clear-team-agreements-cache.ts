/**
 * Script to clear team_agreements cache for a specific project
 * Run with: npx tsx scripts/clear-team-agreements-cache.ts <projectId>
 */
import Redis from 'ioredis'
import * as dotenv from 'dotenv'

dotenv.config()

const projectId = process.argv[2] || '16b0af9e-46cf-45e0-be4e-b396e0eb80b7'

async function clearCache() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  console.log(`Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':***@')}`)
  
  const redis = new Redis(redisUrl)
  
  try {
    // Find all team_agreements cache keys for this project
    const pattern = `ai:extraction:${projectId}*team_agreements*`
    console.log(`Searching for keys matching: ${pattern}`)
    
    const keys = await redis.keys(pattern)
    console.log(`Found ${keys.length} team_agreements cache keys`)
    
    if (keys.length > 0) {
      for (const key of keys) {
        console.log(`  Deleting: ${key}`)
        await redis.del(key)
      }
      console.log(`✅ Deleted ${keys.length} cache entries`)
    } else {
      // Try broader pattern
      const broaderPattern = `ai:extraction:${projectId}*`
      const allKeys = await redis.keys(broaderPattern)
      console.log(`\nAll extraction cache keys for project (${allKeys.length}):`)
      for (const key of allKeys) {
        if (key.includes('team_agreements')) {
          console.log(`  [TEAM] ${key}`)
          await redis.del(key)
          console.log(`  ✅ Deleted`)
        } else {
          console.log(`  ${key.substring(0, 80)}...`)
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await redis.quit()
    console.log('\nRedis connection closed')
  }
}

clearCache()

