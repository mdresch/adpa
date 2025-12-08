#!/usr/bin/env node

/**
 * Clear AI Extraction Cache Script
 * 
 * This script clears Redis cache entries for AI extraction jobs.
 * Use this when extraction data is corrupted or when you need to force re-extraction.
 * 
 * Usage:
 *   npm run clear-extraction-cache <projectId> [entityTypes...]
 *   npm run clear-extraction-cache <projectId> all
 *   npm run clear-extraction-cache <projectId> phases stakeholders
 * 
 * Examples:
 *   npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 all
 *   npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 phases stakeholders
 */

import Redis from 'ioredis'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env') })

const ENTITY_TYPES = [
  'stakeholders',
  'requirements',
  'risks',
  'milestones',
  'phases',
  'constraints',
  'best_practices',
  'deliverables',
  'scope_items',
  'activities',
  'success_criteria',
  'resources',
  'quality_standards',
  // PMBOK 8 Performance Domain entities
  'work_items'
]

async function clearExtractionCache(projectId: string, entityTypes: string[]) {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Failed to connect to Redis after 3 attempts')
        return null
      }
      return Math.min(times * 50, 2000)
    }
  })

  try {
    console.log(`\n🔍 Scanning for cache keys matching project: ${projectId}`)
    console.log(`📦 Entity types: ${entityTypes.join(', ')}\n`)

    let totalCleared = 0

    for (const entityType of entityTypes) {
      // Cache key pattern (hash + provider in middle):
      // ai:extraction:<projectId>:<contentHash>:<entityType>:<providerKey>
      // Use wildcards around the hash/provider portion.
      const pattern = `ai:extraction:${projectId}:*:${entityType}:*`
      
      console.log(`🔎 Searching pattern: ${pattern}`)
      
      // Get all matching keys
      const keys = await redis.keys(pattern)
      
      if (keys.length === 0) {
        console.log(`   ℹ️  No cache entries found`)
        continue
      }

      console.log(`   🎯 Found ${keys.length} cache entries`)
      
      // Delete all matching keys
      const deleted = await redis.del(...keys)
      totalCleared += deleted
      
      console.log(`   ✅ Cleared ${deleted} cache entries for ${entityType}`)
    }

    console.log(`\n✨ Cache clearing complete!`)
    console.log(`📊 Total entries cleared: ${totalCleared}`)
    console.log(`\n💡 Next extraction will fetch fresh data from AI providers\n`)

  } catch (error) {
    console.error('\n❌ Error clearing cache:', error)
    process.exit(1)
  } finally {
    await redis.quit()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error(`
❌ Invalid usage!

Usage:
  npm run clear-extraction-cache <projectId> <entityTypes|all>

Examples:
  npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 all
  npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 phases stakeholders

Available entity types:
  ${ENTITY_TYPES.join(', ')}
`)
  process.exit(1)
}

const [projectId, ...requestedTypes] = args

// Validate project ID format (basic UUID validation)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(projectId)) {
  console.error(`\n❌ Invalid project ID format: ${projectId}`)
  console.error('   Expected a UUID (e.g., d5396430-afde-466d-8240-9ff98e4cb419)\n')
  process.exit(1)
}

// Determine which entity types to clear
let entityTypesToClear: string[] = []

if (requestedTypes.includes('all')) {
  entityTypesToClear = ENTITY_TYPES
  console.log('\n🌐 Clearing ALL entity types')
} else {
  // Validate requested types
  const invalidTypes = requestedTypes.filter(t => !ENTITY_TYPES.includes(t))
  if (invalidTypes.length > 0) {
    console.error(`\n❌ Invalid entity types: ${invalidTypes.join(', ')}`)
    console.error(`\nAvailable types:\n  ${ENTITY_TYPES.join(', ')}\n`)
    process.exit(1)
  }
  entityTypesToClear = requestedTypes
}

// Run the cache clearing
clearExtractionCache(projectId, entityTypesToClear)
  .catch(err => {
    console.error('\n❌ Fatal error:', err)
    process.exit(1)
  })

