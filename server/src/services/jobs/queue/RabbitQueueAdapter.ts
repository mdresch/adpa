import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { connect, AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager'
import type { ConfirmChannel, ConsumeMessage, Options } from 'amqplib'
import type { IQueue, IQueueJob, IQueueOptions, QueueProcessor } from './IQueue'

interface RabbitQueueAdapterOptions {
  connection: AmqpConnectionManager
  queueName: string
  prefetch?: number
  defaultAttempts?: number
  defaultBackoffMs?: number
}

interface InternalMessage<T = any> {
  jobId: string
  type: string
  data: T
}

class RabbitQueueJob<T = any> implements IQueueJob<T> {
  constructor(
    private readonly message: ConsumeMessage,
    private readonly channel: ChannelWrapper,
    private readonly queueName: string,
    private readonly payload: InternalMessage<T>,
  ) {}

  get id(): string | number {
    return this.payload.jobId
  }

  get data(): T {
    return this.payload.data
  }

  async progress(_progress: number | object): Promise<void> {
    // RabbitMQ does not track per-message progress; no-op
  }

  async log(_log: string): Promise<void> {
    // No-op placeholder for compatibility
  }

  async update(_data: T): Promise<void> {
    // No-op; would require republishing a message
  }

  async remove(): Promise<void> {
    if (this.message) {
      await this.channel.ack(this.message)
    }
  }

  async retry(): Promise<void> {
    // Retry handled by adapter on failure path; no-op here
  }

  async getState(): Promise<string> {
    // RabbitMQ does not expose states; return best-effort indicator
    return 'active'
  }

  async finished(): Promise<any> {
    return undefined
  }

  async failed(): Promise<any> {
    return undefined
  }

  toJSON(): any {
    return {
      id: this.id,
      data: this.data,
      queue: this.queueName,
    }
  }
}

export class RabbitQueueAdapter extends EventEmitter implements IQueue {
  private readonly queueName: string
  private readonly connection: AmqpConnectionManager
  private readonly channel: ChannelWrapper
  private readonly handlers: Map<string, QueueProcessor> = new Map()
  private consumerStarted = false
  private consumerTag: string | null = null
  private readonly prefetch: number
  private readonly defaultAttempts: number
  private readonly defaultBackoffMs: number

  constructor(options: RabbitQueueAdapterOptions) {
    super()
    this.queueName = options.queueName
    this.connection = options.connection
    this.prefetch = options.prefetch ?? 4
    this.defaultAttempts = options.defaultAttempts ?? 3
    this.defaultBackoffMs = options.defaultBackoffMs ?? 2000

    this.channel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertQueue(this.queueName, {
          durable: true,
        })
        await channel.assertQueue(this.getDlqName(), {
          durable: true,
        })
        await channel.prefetch(this.prefetch)
      },
    })
  }

  private getDlqName(): string {
    return `${this.queueName}.dlq`
  }

  private getDelayQueueName(delayMs: number): string {
    return `${this.queueName}.delay.${delayMs}`
  }

  private async ensureDelayQueue(delayMs: number): Promise<void> {
    const dlqName = this.getDlqName()
    await this.channel.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertQueue(dlqName, { durable: true })
      await channel.assertQueue(this.getDelayQueueName(delayMs), {
        durable: true,
        arguments: {
          'x-message-ttl': delayMs,
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.queueName,
        },
      })
    })
  }

  private buildMessage<T>(type: string, data: T, options?: IQueueOptions): { payload: InternalMessage<T>; headers: Record<string, any>; priority?: number; delay?: number } {
    const jobId = options?.jobId || uuidv4()
    const maxAttempts = options?.attempts ?? this.defaultAttempts
    const backoffDelay = options?.backoff?.delay ?? options?.delay ?? this.defaultBackoffMs
    const backoffType = options?.backoff?.type ?? 'exponential'

    return {
      payload: {
        jobId,
        type,
        data,
      },
      headers: {
        jobType: type,
        jobId,
        attemptsUsed: 0,
        maxAttempts,
        backoffDelay,
        backoffType,
      },
      priority: options?.priority,
      delay: options?.delay,
    }
  }

  async add<T>(type: string, data: T, options?: IQueueOptions): Promise<IQueueJob<T>> {
    const message = this.buildMessage(type, data, options)
    await this.publish(message.payload, message.headers, message.delay ?? 0, message.priority)
    return new RabbitQueueJob({} as any, this.channel, this.queueName, message.payload)
  }

  private async publish<T>(payload: InternalMessage<T>, headers: Record<string, any>, delayMs: number, priority?: number) {
    if (delayMs > 0) {
      await this.ensureDelayQueue(delayMs)
      await this.channel.sendToQueue(this.getDelayQueueName(delayMs), payload, {
        persistent: true,
        headers,
        priority,
      } as Options.Publish)
      return
    }

    await this.channel.sendToQueue(this.queueName, payload, {
      persistent: true,
      headers,
      priority,
    } as Options.Publish)
  }

  process<T>(type: string, concurrency: number, handler: QueueProcessor<T>): void {
    this.handlers.set(type, handler)
    if (!this.consumerStarted) {
      this.consumerStarted = true
      // Pre-fetch is already configured; concurrency hint can increase prefetch
      const effectivePrefetch = Math.max(this.prefetch, concurrency)
      this.channel.addSetup(async (channel: ConfirmChannel) => {
        await channel.prefetch(effectivePrefetch)
        const consume = await channel.consume(this.queueName, async (msg) => {
          if (!msg) return
          const headers = msg.properties.headers || {}
          const payload = this.safeParse<InternalMessage>(msg.content)
          const jobType = headers.jobType || payload?.type
          const attemptsUsed = (headers.attemptsUsed ?? 0) as number
          const maxAttempts = (headers.maxAttempts ?? this.defaultAttempts) as number
          const backoffDelay = (headers.backoffDelay ?? this.defaultBackoffMs) as number
          const backoffType = headers.backoffType ?? 'exponential'

          if (!payload || !jobType) {
            channel.ack(msg)
            return
          }

          const queueJob = new RabbitQueueJob(msg, this.channel, this.queueName, payload)
          this.emit('active', queueJob)

          const runHandler = this.handlers.get(jobType)
          if (!runHandler) {
            channel.ack(msg)
            return
          }

          try {
            await runHandler(queueJob as any)
            channel.ack(msg)
            this.emit('completed', queueJob)
          } catch (err) {
            const nextAttempt = attemptsUsed + 1
            if (nextAttempt >= maxAttempts) {
              // Send to DLQ
              await this.channel.sendToQueue(this.getDlqName(), payload, {
                persistent: true,
                headers: {
                  ...headers,
                  attemptsUsed: nextAttempt,
                },
              } as Options.Publish)
              channel.ack(msg)
              this.emit('failed', queueJob, err)
              return
            }

            // Calculate next delay
            const nextDelay = backoffType === 'exponential'
              ? backoffDelay * Math.pow(2, attemptsUsed)
              : backoffDelay

            await this.ensureDelayQueue(nextDelay)
            await this.channel.sendToQueue(this.getDelayQueueName(nextDelay), payload, {
              persistent: true,
              headers: {
                ...headers,
                attemptsUsed: nextAttempt,
                backoffDelay: nextDelay,
              },
            } as Options.Publish)
            channel.ack(msg)
            this.emit('failed', queueJob, err)
          }
        })
        this.consumerTag = consume.consumerTag
      })
    }
  }

  private safeParse<T>(buffer?: Buffer): T | null {
    if (!buffer) return null
    try {
      return JSON.parse(buffer.toString()) as T
    } catch (_err) {
      return null
    }
  }

  async getJob<T>(_jobId: string | number): Promise<IQueueJob<T> | null> {
    // RabbitMQ does not support random access to jobs; not implemented
    return null
  }

  async remove(_jobId: string | number): Promise<void> {
    // Not supported; jobs are not addressable once queued
  }

  async getJobs<T>(_states: string[], _start: number = 0, _end: number = -1): Promise<IQueueJob<T>[]> {
    // Not efficiently supported; return empty list
    return []
  }

  async clean(_grace: number, _limit: number, _status?: 'completed' | 'waiting' | 'active' | 'delayed' | 'failed'): Promise<any[]> {
    // Not supported for RabbitMQ; return empty list
    return []
  }

  getName(): string {
    return this.queueName
  }

  async close(): Promise<void> {
    try {
      if (this.consumerTag) {
        await this.channel.cancel(this.consumerTag)
      }
    } catch (_err) {}
    await this.channel.close()
  }

  async getStats(): Promise<{ waiting: number; active: number; completed: number; failed: number; delayed: number }> {
    try {
      const info = await this.channel.addSetup((ch: ConfirmChannel) => ch.checkQueue(this.queueName)) as any
      const waiting = info?.messageCount ?? 0
      return {
        waiting,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      }
    } catch (_err) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    }
  }

  async pause(): Promise<void> {
    if (this.consumerTag) {
      await this.channel.cancel(this.consumerTag)
      this.consumerTag = null
      this.consumerStarted = false
    }
  }

  async resume(): Promise<void> {
    if (!this.consumerStarted) {
      // Restart consume with existing handlers
      for (const [jobType, handler] of this.handlers.entries()) {
        this.process(jobType, this.prefetch, handler)
      }
    }
  }

  async isPaused(): Promise<boolean> {
    return !this.consumerStarted || !this.consumerTag
  }
}

export function createRabbitConnection(url: string): AmqpConnectionManager {
  return connect([url], {
    heartbeatIntervalInSeconds: 15,
    reconnectTimeInSeconds: 5,
  })
}
