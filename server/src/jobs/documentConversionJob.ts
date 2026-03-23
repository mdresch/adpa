/**
 * Document Conversion Job Worker
 * 
 * Bull queue worker for processing uploaded documents
 * Runs in parallel with multiple workers for high throughput
 * 
 * @module documentConversionJob
 */

import { logger } from '../utils/logger';
import { processUploadedFile, FileProcessingJob } from '../services/documentUploadService';
import { documentUploadQueue } from '../services/queueService';
import type { IQueueJob } from '../services/jobs/queue/IQueue';

// ============================================================================
// WORKER CONFIGURATION
// ============================================================================

const WORKER_CONCURRENCY = parseInt(process.env.UPLOAD_WORKER_CONCURRENCY || '5');
const WORKER_NAME = `document-conversion-worker-${process.pid}`;

logger.info('Starting document conversion worker', {
  workerName: WORKER_NAME,
  concurrency: WORKER_CONCURRENCY,
  pid: process.pid
});

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process document upload jobs
 */
documentUploadQueue.process('file-process', WORKER_CONCURRENCY, async (job: IQueueJob<FileProcessingJob>) => {
  const startTime = Date.now();
  
  logger.info('Processing document upload job', {
    jobId: job.id,
    batchId: job.data.batchId,
    filename: job.data.filename
  });

  try {
    // Process the uploaded file
    const result = await processUploadedFile(job);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('Document upload job completed successfully', {
        jobId: job.id,
        documentId: result.documentId,
        filename: result.filename,
        detectedType: result.detectedType,
        qualityScore: result.qualityScore,
        duration
      });

      return result;
    } else {
      logger.error('Document upload job failed', {
        jobId: job.id,
        filename: result.filename,
        error: result.error,
        duration
      });

      throw new Error(result.error || 'Unknown processing error');
    }

  } catch (error: any) {
    logger.error('Document upload job threw exception', {
      jobId: job.id,
      batchId: job.data.batchId,
      filename: job.data.filename,
      attempt: (job as any).attemptsMade + 1,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

documentUploadQueue.on('completed', (job, result: any) => {
  logger.info('Job completed', {
    jobId: job.id,
    filename: job.data?.filename,
    documentId: result?.documentId,
  });
});

documentUploadQueue.on('failed', (job, error: Error) => {
  logger.error('Job failed permanently', {
    jobId: job.id,
    batchId: job.data?.batchId,
    filename: job.data?.filename,
    error: error.message
  });
});

/**
 * Job is being retried
 */
documentUploadQueue.on('error', (error: Error) => {
  logger.error('Queue error', {
    error: error.message,
    stack: error.stack
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle graceful shutdown
 */
async function gracefulShutdown() {
  logger.info('Graceful shutdown initiated', {
    workerName: WORKER_NAME
  });

  try {
    // Close queue (waits for active jobs to complete)
    await documentUploadQueue.close();

    logger.info('Worker shut down gracefully', {
      workerName: WORKER_NAME
    });

    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', {
      error: error.message
    });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// No queue monitoring or batch job helpers are included for the Rabbit adapter
