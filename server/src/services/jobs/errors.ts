/**
 * Queue Job Error Classes
 * Phase 3: Type Safety and Validation
 * 
 * Custom error classes for better error handling and type safety
 */

/**
 * Base error class for all job-related errors
 */
export class JobError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly jobId?: string,
    public readonly jobType?: string
  ) {
    super(message)
    this.name = 'JobError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Job validation error
 * Thrown when job data fails validation
 */
export class JobValidationError extends JobError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    jobId?: string,
    jobType?: string
  ) {
    super(message, 'JOB_VALIDATION_ERROR', jobId, jobType)
    this.name = 'JobValidationError'
  }
}

/**
 * Job not found error
 * Thrown when a job with the given ID doesn't exist
 */
export class JobNotFoundError extends JobError {
  constructor(public readonly jobId: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', jobId)
    this.name = 'JobNotFoundError'
  }
}

/**
 * Job type error
 * Thrown when an unknown or invalid job type is provided
 */
export class JobTypeError extends JobError {
  constructor(
    public readonly jobType: string,
    message?: string
  ) {
    super(
      message || `Unknown or invalid job type: ${jobType}`,
      'JOB_TYPE_ERROR',
      undefined,
      jobType
    )
    this.name = 'JobTypeError'
  }
}

/**
 * Job queue error
 * Thrown when a job cannot be added to the queue
 */
export class JobQueueError extends JobError {
  constructor(
    message: string,
    public readonly queueName?: string,
    jobId?: string,
    jobType?: string
  ) {
    super(message, 'JOB_QUEUE_ERROR', jobId, jobType)
    this.name = 'JobQueueError'
  }
}

/**
 * Job database error
 * Thrown when a database operation fails for a job
 */
export class JobDatabaseError extends JobError {
  constructor(
    message: string,
    public readonly operation?: string,
    jobId?: string,
    jobType?: string
  ) {
    super(message, 'JOB_DATABASE_ERROR', jobId, jobType)
    this.name = 'JobDatabaseError'
  }
}

/**
 * Job processing error
 * Thrown when a job fails during processing
 */
export class JobProcessingError extends JobError {
  constructor(
    message: string,
    public readonly stage?: string,
    jobId?: string,
    jobType?: string
  ) {
    super(message, 'JOB_PROCESSING_ERROR', jobId, jobType)
    this.name = 'JobProcessingError'
  }
}

/**
 * Stuck jobs error
 * Thrown when stuck jobs prevent new job creation
 */
export class StuckJobsError extends JobError {
  constructor(
    public readonly stuckCount: number,
    message?: string
  ) {
    super(
      message || `Cannot add new jobs: ${stuckCount} stuck job(s) detected`,
      'STUCK_JOBS_ERROR'
    )
    this.name = 'StuckJobsError'
  }
}

/**
 * Helper function to check if an error is a JobError
 */
export function isJobError(error: unknown): error is JobError {
  return error instanceof JobError
}

/**
 * Helper function to get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isJobError(error)) {
    return error.code
  }
  if (error instanceof Error) {
    return 'UNKNOWN_ERROR'
  }
  return 'UNKNOWN_ERROR'
}

