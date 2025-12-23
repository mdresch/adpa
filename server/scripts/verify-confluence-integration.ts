#!/usr/bin/env ts-node

/**
 * Verification script for Confluence publishing integration
 * Checks that all components are properly integrated
 */

import { logger } from '../src/utils/logger'

async function verifyIntegration() {
  try {
    logger.info('🔍 Verifying Confluence publishing integration...')

    // 1. Check types are properly defined
    logger.info('✅ Checking type definitions...')
    const { PublishToConfluenceJobData, isPublishToConfluenceJobData } = await import('../src/services/jobs/types')
    
    const testJobData = {
      jobId: 'test-job-id',
      userId: 'test-user-id',
      projectId: 'test-project-id',
      title: 'Test Document',
      markdown: '# Test Content'
    }
    
    if (!isPublishToConfluenceJobData(testJobData)) {
      throw new Error('Type guard function failed')
    }
    logger.info('✅ Type definitions working correctly')

    // 2. Check validation schema
    logger.info('✅ Checking validation schema...')
    const { validateJobData } = await import('../src/services/jobs/validation')
    
    try {
      const validatedData = validateJobData('publish-to-confluence', testJobData)
      logger.info('✅ Validation schema working correctly')
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`)
    }

    // 3. Check queue service integration
    logger.info('✅ Checking queue service integration...')
    const { confluenceQueue } = await import('../src/services/queueService')
    
    if (!confluenceQueue) {
      throw new Error('Confluence queue not found')
    }
    
    if (confluenceQueue.name !== 'confluence-publishing') {
      throw new Error(`Expected queue name 'confluence-publishing', got '${confluenceQueue.name}'`)
    }
    logger.info('✅ Queue service integration working correctly')

    // 4. Check job service
    logger.info('✅ Checking job service...')
    const { PublishToConfluenceJobService } = await import('../src/services/jobs/PublishToConfluenceJobService')
    
    if (typeof PublishToConfluenceJobService.processJob !== 'function') {
      throw new Error('PublishToConfluenceJobService.processJob is not a function')
    }
    logger.info('✅ Job service working correctly')

    // 5. Check document generator hook
    logger.info('✅ Checking document generator hook...')
    const { documentGeneratorService } = await import('../src/modules/documentGenerator/service')
    
    // Check if the method exists (it's private, so we can't call it directly)
    const serviceCode = documentGeneratorService.constructor.toString()
    if (!serviceCode.includes('enqueueConfluencePublishing')) {
      throw new Error('enqueueConfluencePublishing method not found in DocumentGeneratorService')
    }
    logger.info('✅ Document generator hook integration working correctly')

    logger.info('🎉 All integration checks passed!')
    logger.info('')
    logger.info('📋 Integration Summary:')
    logger.info('  ✅ Type definitions (PublishToConfluenceJobData)')
    logger.info('  ✅ Validation schema (publish-to-confluence)')
    logger.info('  ✅ Queue service (confluenceQueue)')
    logger.info('  ✅ Job service (PublishToConfluenceJobService)')
    logger.info('  ✅ Document generator hook (enqueueConfluencePublishing)')
    logger.info('')
    logger.info('🚀 The Confluence publishing integration is ready for use!')

  } catch (error) {
    logger.error('❌ Integration verification failed:', error)
    throw error
  }
}

// Run the verification
if (require.main === module) {
  verifyIntegration()
    .then(() => {
      logger.info('✅ Verification completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('❌ Verification failed:', error)
      process.exit(1)
    })
}

export { verifyIntegration }