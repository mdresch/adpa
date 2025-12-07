/**
 * Queue Abstraction Interface
 * Phase 5: Add Abstraction Layers and Dependency Injection
 * 
 * This interface abstracts queue operations, allowing for different queue
 * implementations (Bull, BullMQ, custom, etc.) and easier testing.
 */

import type Bull from 'bull'
import type { JobType, JobData, JobOptions } from '../types'

/**
 * Queue Job interface (abstracted from Bull.Job)
 */
export interface IQueueJob<T = any> {
  id: string | number
  data: T
  progress(progress: number | object): Promise<void>
  log(log: string): Promise<void>
  update(data: T): Promise<void>
  remove(): Promise<void>
  retry(): Promise<void>
  getState(): Promise<string>
  finished(): Promise<any>
  failed(): Promise<any>
  toJSON(): any
}

/**
 * Queue Options interface
 */
export interface IQueueOptions {
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
  attempts?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
  timeout?: number
  delay?: number
  priority?: number
  jobId?: string
}

/**
 * Queue Processor Handler
 */
export type QueueProcessor<T = any> = (job: IQueueJob<T>) => Promise<any>

/**
 * Queue Abstraction Interface
 * 
 * Provides a clean interface for queue operations, decoupling
 * the queue service from the specific queue implementation (Bull).
 */
export interface IQueue {
  /**
   * Add a job to the queue
   * @param type Job type/name
   * @param data Job data
   * @param options Job options (priority, delay, attempts, etc.)
   * @returns Promise resolving to job ID
   */
  add<T extends JobData>(
    type: string,
    data: T,
    options?: IQueueOptions
  ): Promise<IQueueJob<T>>

  /**
   * Register a processor for a specific job type
   * @param type Job type/name
   * @param concurrency Number of concurrent jobs to process
   * @param handler Processor function
   */
  process<T extends JobData>(
    type: string,
    concurrency: number,
    handler: QueueProcessor<T>
  ): void

  /**
   * Get a job by ID
   * @param jobId Job ID
   * @returns Promise resolving to job or null if not found
   */
  getJob<T extends JobData>(jobId: string | number): Promise<IQueueJob<T> | null>

  /**
   * Remove a job from the queue
   * @param jobId Job ID
   */
  remove(jobId: string | number): Promise<void>

  /**
   * Get jobs by state
   * @param states Array of job states ('waiting', 'active', 'completed', 'failed', 'delayed')
   * @param start Start index for pagination
   * @param end End index for pagination
   * @returns Promise resolving to array of jobs
   */
  getJobs<T extends JobData>(
    states: string[],
    start?: number,
    end?: number
  ): Promise<IQueueJob<T>[]>

  /**
   * Clean jobs from the queue
   * @param grace Grace period in milliseconds
   * @param limit Maximum number of jobs to clean
   * @param status Job status to clean
   */
  clean(
    grace: number,
    limit: number,
    status?: 'completed' | 'waiting' | 'active' | 'delayed' | 'failed'
  ): Promise<any[]>

  /**
   * Get queue name
   */
  getName(): string

  /**
   * Close the queue (cleanup connections)
   */
  close(): Promise<void>

  /**
   * Get queue statistics
   */
  getStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }>

  /**
   * Pause the queue (stop processing new jobs)
   */
  pause(): Promise<void>

  /**
   * Resume the queue (start processing jobs)
   */
  resume(): Promise<void>

  /**
   * Check if queue is paused
   */
  isPaused(): Promise<boolean>

  /**
   * Event emitter methods (for compatibility with Bull)
   */
  on(event: string, handler: (...args: any[]) => void): void
  off(event: string, handler: (...args: any[]) => void): void
  once(event: string, handler: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): boolean
}

