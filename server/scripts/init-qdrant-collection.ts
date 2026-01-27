/**
 * Initialize Qdrant Collection
 * Creates the Qdrant collection if it doesn't exist
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { getQdrantConfig } from '../src/modules/contextRetrieval/config/qdrantConfig'
import { logger } from '../src/utils/logger'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

async function initQdrantCollection() {
  try {
    console.log('🚀 Initializing Qdrant collection...')
    console.log('📋 Loading configuration...')

    const config = getQdrantConfig()
    if (!config) {
      console.warn('⚠️  Qdrant not configured. Set QDRANT_URL in environment variables.')
      console.log('💡 Add QDRANT_URL to server/.env.local')
      process.exit(0)
    }

    console.log('✅ Configuration loaded')
    console.log(`   URL: ${config.url.replace(/\/\/.*@/, '//***@')}`) // Mask credentials
    console.log(`   Collection: ${config.collectionName}`)
    console.log(`   Vector Size: ${config.vectorSize}`)
    console.log(`   Distance: ${config.distance}`)
    console.log('')

    console.log('🔌 Connecting to Qdrant...')
    const client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey
    })

    // Check if collection exists
    console.log('🔍 Checking if collection exists...')
    const collections = await client.getCollections()
    const collectionExists = collections.collections.some(
      c => c.name === config.collectionName
    )

    if (collectionExists) {
      console.log(`✅ Collection '${config.collectionName}' already exists`)
      console.log('')

      // Get collection info
      console.log('📊 Fetching collection information...')
      const collectionInfo = await client.getCollection(config.collectionName)
      console.log(`   Points: ${collectionInfo.points_count || 0}`)
      console.log(`   Vectors: ${collectionInfo.vectors_count || 0}`)
      console.log(`   Status: ${collectionInfo.status || 'unknown'}`)
      
      if (collectionInfo.config?.params?.vectors) {
        const vectorsConfig = collectionInfo.config.params.vectors
        if (typeof vectorsConfig === 'object' && 'size' in vectorsConfig) {
          console.log(`   Vector Size: ${vectorsConfig.size}`)
        }
      }
    } else {
      // Create collection
      console.log(`📦 Creating collection '${config.collectionName}'...`)
      console.log(`   Vector Size: ${config.vectorSize}`)
      console.log(`   Distance Metric: ${config.distance}`)

      await client.createCollection(config.collectionName, {
        vectors: {
          size: config.vectorSize,
          distance: config.distance
        }
      })

      console.log(`✅ Collection '${config.collectionName}' created successfully!`)
    }

    console.log('')
    console.log('🎉 Qdrant collection initialization complete!')
    process.exit(0)

  } catch (error: any) {
    console.error('❌ Failed to initialize Qdrant collection')
    console.error(`   Error: ${error.message}`)
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`)
    }
    
    // Also log via logger if available
    try {
      logger.error('Failed to initialize Qdrant collection', {
        error: error.message,
        stack: error.stack
      })
    } catch (logError) {
      // Logger might not be initialized, ignore
    }
    
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initQdrantCollection()
}

export { initQdrantCollection }
