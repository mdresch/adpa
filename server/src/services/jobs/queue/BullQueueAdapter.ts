/**
 * Bull Queue Adapter
 * Phase 5: Add Abstraction Layers and Dependency Injection
 * 
 * Adapter that wraps Bull queue to implement IQueue interface.
 * This allows the queue service to work with any queue implementation
 * while currently using Bull under the hood.
 */

import type Bull from 'bull'
import type { IQueue, IQueueJob, IQueueOptions, QueueProcessor } from './IQueue'
import type { JobData } from '../types'

/**
 * Adapter that wraps Bull.Job to implement IQueueJob
 */
class BullJobAdapter<T = any> implements IQueueJob<T> {
  constructor(private bullJob: Bull.Job<T>) {}

  get id(): string | number {
    return this.bullJob.id
  }

  get data(): T {
    return this.bullJob.data
  }

  async progress(progress: number | object): Promise<void> {
    return this.bullJob.progress(progress)
  }

  async log(log: string): Promise<void> {
    return this.bullJob.log(log)
  }

  async update(data: T): Promise<void> {
    return this.bullJob.update(data)
  }

  async remove(): Promise<void> {
    return this.bullJob.remove()
  }

  async retry(): Promise<void> {
    return this.bullJob.retry()
  }

  async getState(): Promise<string> {
    return this.bullJob.getState()
  }

  async finished(): Promise<any> {
    return this.bullJob.finished()
  }

  async failed(): Promise<any> {
    return this.bullJob.failed()
  }

  toJSON(): any {
    return this.bullJob.toJSON()
  }
}

/**
 * Bull Queue Adapter
 * 
 * Wraps a Bull queue instance to implement the IQueue interface.
 * This provides abstraction while maintaining full Bull functionality.
 */
export class BullQueueAdapter implements IQueue {
  constructor(private bullQueue: Bull.Queue) {}

  /**
   * Get the underlying Bull queue (for advanced use cases)
   */
  getBullQueue(): Bull.Queue {
    return this.bullQueue
  }

  async add<T extends JobData>(
    type: string,
    data: T,
    options?: IQueueOptions
  ): Promise<IQueueJob<T>> {
    // Convert IQueueOptions to Bull.JobOptions
    const bullOptions: Bull.JobOptions = {}
    
    if (options) {
      if (options.removeOnComplete !== undefined) {
        bullOptions.removeOnComplete = options.removeOnComplete
      }
      if (options.removeOnFail !== undefined) {
        bullOptions.removeOnFail = options.removeOnFail
      }
      if (options.attempts !== undefined) {
        bullOptions.attempts = options.attempts
      }
      if (options.backoff) {
        bullOptions.backoff = {
          type: options.backoff.type === 'fixed' ? 'fixed' : 'exponential',
          delay: options.backoff.delay,
        }
      }
      if (options.timeout !== undefined) {
        bullOptions.timeout = options.timeout
      }
      if (options.delay !== undefined) {
        bullOptions.delay = options.delay
      }
      if (options.priority !== undefined) {
        bullOptions.priority = options.priority
      }
      if (options.jobId !== undefined) {
        bullOptions.jobId = options.jobId
      }
    }

    const bullJob = await this.bullQueue.add(type, data, bullOptions)
    return new BullJobAdapter<T>(bullJob)
  }

  process<T extends JobData>(
    type: string,
    concurrency: number,
    handler: QueueProcessor<T>
  ): void {
    this.bullQueue.process(type, concurrency, async (bullJob: Bull.Job<T>) => {
      const adapterJob = new BullJobAdapter<T>(bullJob)
      return handler(adapterJob)
    })
  }

  async getJob<T extends JobData>(jobId: string | number): Promise<IQueueJob<T> | null> {
    const bullJob = await this.bullQueue.getJob(jobId)
    return bullJob ? new BullJobAdapter<T>(bullJob) : null
  }

  async remove(jobId: string | number): Promise<void> {
    const job = await this.bullQueue.getJob(jobId)
    if (job) {
      await job.remove()
    }
  }

  async getJobs<T extends JobData>(
    states: string[],
    start: number = 0,
    end: number = -1
  ): Promise<IQueueJob<T>[]> {
    const bullJobs = await this.bullQueue.getJobs(states as any, start, end)
    return bullJobs.map(job => new BullJobAdapter<T>(job))
  }

  async clean(
    grace: number,
    limit: number,
    status?: 'completed' | 'waiting' | 'active' | 'delayed' | 'failed'
  ): Promise<any[]> {
    return this.bullQueue.clean(grace, limit, status as any)
  }

  getName(): string {
    return this.bullQueue.name
  }

  async close(): Promise<void> {
    return this.bullQueue.close()
  }

  async getStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.bullQueue.getWaitingCount(),
      this.bullQueue.getActiveCount(),
      this.bullQueue.getCompletedCount(),
      this.bullQueue.getFailedCount(),
      this.bullQueue.getDelayedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    }
  }

  async pause(): Promise<void> {
    return this.bullQueue.pause()
  }

  async resume(): Promise<void> {
    return this.bullQueue.resume()
  }

  async isPaused(): Promise<boolean> {
    return this.bullQueue.isPaused()
  }

  // Event emitter methods
  on(event: string, handler: (...args: any[]) => void): void {
    this.bullQueue.on(event as any, handler)
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.bullQueue.off(event as any, handler)
  }

  once(event: string, handler: (...args: any[]) => void): void {
    this.bullQueue.once(event as any, handler)
  }

  emit(event: string, ...args: any[]): boolean {
    return this.bullQueue.emit(event as any, ...args)
  }
}

