/**
 * Document Conversion Job Worker
 * 
 * Bull queue worker for processing uploaded documents
 * Runs in parallel with multiple workers for high throughput
 * 
 * @module documentConversionJob
 */

import { Job } from 'bull';
import { logger } from '../utils/logger';
import { 
  documentUploadQueue, 
  processUploadedFile,
  FileProcessingJob 
} from '../services/documentUploadService';

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
documentUploadQueue.process(WORKER_CONCURRENCY, async (job: Job<FileProcessingJob>) => {
  const startTime = Date.now();
  
  logger.info('Processing document upload job', {
    jobId: job.id,
    batchId: job.data.batchId,
    filename: job.data.filename,
    attempt: job.attemptsMade + 1
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
      attempt: job.attemptsMade + 1,
      error: error.message,
      stack: error.stack
    });

    // Re-throw to trigger Bull retry logic
    throw error;
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Job completed successfully
 */
documentUploadQueue.on('completed', (job: Job, result: any) => {
  logger.info('Job completed', {
    jobId: job.id,
    filename: job.data.filename,
    documentId: result.documentId,
    processingTime: Date.now() - job.timestamp
  });
});

/**
 * Job failed after all retries
 */
documentUploadQueue.on('failed', (job: Job, error: Error) => {
  logger.error('Job failed permanently', {
    jobId: job.id,
    batchId: job.data.batchId,
    filename: job.data.filename,
    attempts: job.attemptsMade,
    error: error.message
  });
});

/**
 * Job is being retried
 */
documentUploadQueue.on('retrying', (job: Job) => {
  logger.warn('Job retrying', {
    jobId: job.id,
    filename: job.data.filename,
    attempt: job.attemptsMade + 1,
    maxAttempts: 3
  });
});

/**
 * Queue is stalled (jobs not progressing)
 */
documentUploadQueue.on('stalled', (job: Job) => {
  logger.warn('Job stalled', {
    jobId: job.id,
    filename: job.data.filename
  });
});

/**
 * Worker error
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

// ============================================================================
// QUEUE MONITORING
// ============================================================================

/**
 * Log queue stats periodically
 */
setInterval(async () => {
  try {
    const counts = await documentUploadQueue.getJobCounts();
    
    logger.info('Queue statistics', {
      workerName: WORKER_NAME,
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed
    });

  } catch (error: any) {
    logger.error('Failed to get queue stats', {
      error: error.message
    });
  }
}, 60000); // Every minute

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const counts = await documentUploadQueue.getJobCounts();
  const waiting = await documentUploadQueue.getWaiting();
  const active = await documentUploadQueue.getActive();
  const completed = await documentUploadQueue.getCompleted();
  const failed = await documentUploadQueue.getFailed();

  return {
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    totalJobs: waiting.length + active.length + completed.length + failed.length
  };
}

/**
 * Get all jobs for a batch
 */
export async function getBatchJobs(batchId: string): Promise<Job<FileProcessingJob>[]> {
  const jobs = await documentUploadQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
  return jobs.filter(job => job.data.batchId === batchId);
}

/**
 * Cancel all jobs for a batch
 */
export async function cancelBatchJobs(batchId: string): Promise<number> {
  const jobs = await getBatchJobs(batchId);
  let cancelledCount = 0;

  for (const job of jobs) {
    const state = await job.getState();
    if (state === 'waiting' || state === 'active' || state === 'delayed') {
      await job.remove();
      cancelledCount++;
    }
  }

  logger.info('Batch jobs cancelled', { batchId, cancelledCount });
  return cancelledCount;
}

/**
 * Add batch conversion jobs (stub - jobs are added in documentUploadService)
 */
export async function addBatchConversionJobs(
  documents: any[],
  batchId: string,
  projectId: string,
  userId: string
): Promise<void> {
  // Jobs are already added by documentUploadService.createUploadBatch
  // This is a stub for compatibility
  logger.info('Batch conversion jobs already queued', { batchId, count: documents.length });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { documentUploadQueue, WORKER_CONCURRENCY, WORKER_NAME };
