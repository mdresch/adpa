/**
 * Qdrant Configuration Helper
 * Reads Qdrant configuration from environment variables
 */

import type { QdrantConfig } from '../engines/qdrantSearchEngine'
import { logger } from '../../../utils/logger'

/**
 * Get Qdrant configuration from environment variables
 * Returns null if Qdrant is not configured
 */
export function getQdrantConfig(): QdrantConfig | null {
  const url = process.env.QDRANT_URL
  const apiKey = process.env.QDRANT_API_KEY
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'adpa_documents'
  const vectorSize = parseInt(process.env.QDRANT_VECTOR_SIZE || '1536', 10)
  const distance = (process.env.QDRANT_DISTANCE || 'Cosine') as 'Cosine' | 'Euclidean' | 'Dot'

  // Qdrant is optional - return null if URL is not configured
  if (!url) {
    logger.debug('Qdrant not configured (QDRANT_URL not set)')
    return null
  }

  // Validate vector size
  if (isNaN(vectorSize) || vectorSize <= 0) {
    logger.warn('Invalid QDRANT_VECTOR_SIZE, using default 1536')
    return null
  }

  // Validate distance metric
  if (!['Cosine', 'Euclidean', 'Dot'].includes(distance)) {
    logger.warn('Invalid QDRANT_DISTANCE, using default Cosine')
    return null
  }

  const config: QdrantConfig = {
    url,
    apiKey: apiKey || undefined,
    collectionName,
    vectorSize,
    distance
  }

  logger.info('Qdrant configuration loaded', {
    url: config.url.replace(/\/\/.*@/, '//***@'), // Mask credentials in URL
    collectionName: config.collectionName,
    vectorSize: config.vectorSize,
    distance: config.distance,
    hasApiKey: !!config.apiKey
  })

  return config
}
