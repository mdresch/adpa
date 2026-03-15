import { EventEmitter } from 'events'
import { IQueue, IQueueJob, IQueueOptions, QueueProcessor } from '../../src/services/jobs/queue/IQueue'
import { JobData } from '../../src/services/jobs/types'

class MockQueueJob<T = any> implements IQueueJob<T> {
  constructor(
    public id: string,
    public data: T,
    private queueName: string
  ) {}

  async progress(_progress: number | object): Promise<void> {}
  async log(_log: string): Promise<void> {}
  async update(_data: T): Promise<void> {}
  async remove(): Promise<void> {}
  async retry(): Promise<void> {}
  async getState(): Promise<string> { return 'completed' }
  async finished(): Promise<any> { return undefined }
  async failed(): Promise<any> { return undefined }
  toJSON(): any {
    return { id: this.id, data: this.data, queue: this.queueName }
  }
}

export class MockQueue extends EventEmitter implements IQueue {
  public jobs: IQueueJob[] = []
  public handlers: Map<string, { handler: QueueProcessor, concurrency: number }> = new Map()
  public queueName: string
  public isSync: boolean = true

  constructor(name: string) {
    super()
    this.queueName = name
  }

  async add<T extends JobData>(type: string, data: T, options?: IQueueOptions): Promise<IQueueJob<T>> {
    const jobId = options?.jobId || `mock-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const job = new MockQueueJob(jobId, data, this.queueName)
    this.jobs.push(job)

    if (this.isSync) {
      const handlerInfo = this.handlers.get(type)
      if (handlerInfo) {
        // Run handler asynchronously but don't await it to simulate background processing
        // yet allowing tests to wait for it if they use events
        this.emit('active', job)
        handlerInfo.handler(job)
          .then(result => this.emit('completed', job, result))
          .catch(err => this.emit('failed', job, err))
      }
    }

    return job as IQueueJob<T>
  }

  process<T extends JobData>(type: string, concurrency: number, handler: QueueProcessor<T>): void {
    this.handlers.set(type, { handler, concurrency })
  }

  async getJob<T extends JobData>(jobId: string | number): Promise<IQueueJob<T> | null> {
    return (this.jobs.find(j => j.id === jobId) as IQueueJob<T>) || null
  }

  async remove(jobId: string | number): Promise<void> {
    this.jobs = this.jobs.filter(j => j.id !== jobId)
  }

  async getJobs<T extends JobData>(states: string[], start?: number, end?: number): Promise<IQueueJob<T>[]> {
    return this.jobs as IQueueJob<T>[]
  }

  async clean(grace: number, limit: number, status?: any): Promise<any[]> {
    return []
  }

  getName(): string {
    return this.queueName
  }

  async close(): Promise<void> {}

  async getStats(): Promise<any> {
    return { waiting: 0, active: 0, completed: this.jobs.length, failed: 0, delayed: 0 }
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async isPaused(): Promise<boolean> { return false }

  reset() {
    this.jobs = []
  }
}
