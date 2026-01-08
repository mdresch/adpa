import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RabbitQueueAdapter } from '../../../../services/jobs/queue/RabbitQueueAdapter'

let mockConnection: any
let mockConfirmChannel: any
let mockChannelWrapper: any
let consumeHandler: ((msg: any) => Promise<void> | void) | undefined

const tick = () => new Promise<void>((resolve) => setImmediate(resolve))

const connectMock = jest.fn(() => mockConnection)

jest.mock('amqp-connection-manager', () => ({
  connect: (...args: any[]) => connectMock(...args),
}))

beforeEach(() => {
  consumeHandler = undefined
  mockConfirmChannel = {
    assertQueue: jest.fn().mockResolvedValue(undefined),
    prefetch: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn(async (_queue: string, onMessage: any) => {
      consumeHandler = onMessage
      return { consumerTag: 'ctag' }
    }),
    sendToQueue: jest.fn(),
    checkQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
    ack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
  }

  mockChannelWrapper = {
    addSetup: jest.fn(async (fn: any) => {
      return await fn(mockConfirmChannel)
    }),
    sendToQueue: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  }

  mockConnection = {
    createChannel: jest.fn(({ setup }: any) => {
      if (setup) {
        void setup(mockConfirmChannel)
      }
      return mockChannelWrapper
    }),
    on: jest.fn(),
    close: jest.fn(),
  }

  connectMock.mockClear()
})

describe('RabbitQueueAdapter', () => {
  const queueName = 'test-queue'

  it('publishes jobs with payload and headers when added', async () => {
    const adapter = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName,
      prefetch: 2,
      defaultAttempts: 3,
      defaultBackoffMs: 2000,
    })

    const job = await adapter.add('work', { foo: 'bar' }, { priority: 5 })

    expect(job.id).toBeDefined()
    expect(mockChannelWrapper.sendToQueue).toHaveBeenCalledWith(
      queueName,
      expect.objectContaining({ type: 'work', data: { foo: 'bar' } }),
      expect.objectContaining({ headers: expect.any(Object), priority: 5 })
    )
  })

  it('processes messages, invokes handler, and emits completed', async () => {
    const adapter = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName,
      prefetch: 2,
      defaultAttempts: 2,
      defaultBackoffMs: 2000,
    })

    const handler = jest.fn(async () => {})
    const completed = jest.fn()
    adapter.on('completed', completed)

    adapter.process('process', 2, handler)
    await tick()

    expect(typeof consumeHandler).toBe('function')

    const message = {
      content: Buffer.from(JSON.stringify({ jobId: 'job-1', type: 'process', data: { foo: 'bar' } })),
      properties: { headers: { jobType: 'process', attemptsUsed: 0, maxAttempts: 2 } },
    }

    await consumeHandler!(message)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]?.data).toEqual({ foo: 'bar' })
    expect(mockConfirmChannel.ack).toHaveBeenCalledWith(message)
    expect(completed).toHaveBeenCalledTimes(1)
  })

  it('requeues failed jobs with backoff and emits failed', async () => {
    const adapter = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName,
      prefetch: 2,
      defaultAttempts: 2,
      defaultBackoffMs: 2000,
    })

    const handler = jest.fn(async () => {
      throw new Error('boom')
    })
    const failed = jest.fn()
    adapter.on('failed', failed)

    adapter.process('process', 2, handler)
    await tick()

    const message = {
      content: Buffer.from(JSON.stringify({ jobId: 'job-2', type: 'process', data: { foo: 'baz' } })),
      properties: { headers: { jobType: 'process', attemptsUsed: 0, maxAttempts: 2, backoffDelay: 2000, backoffType: 'exponential' } },
    }

    await consumeHandler!(message)

    expect(mockChannelWrapper.sendToQueue).toHaveBeenCalledWith(
      `${queueName}.delay.2000`,
      expect.objectContaining({ jobId: 'job-2' }),
      expect.objectContaining({ headers: expect.objectContaining({ attemptsUsed: 1, backoffDelay: 2000 }) })
    )
    expect(mockConfirmChannel.ack).toHaveBeenCalledWith(message)
    expect(failed).toHaveBeenCalledTimes(1)
  })

  it('sends jobs to DLQ after max attempts', async () => {
    const adapter = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName,
      prefetch: 2,
      defaultAttempts: 1,
      defaultBackoffMs: 2000,
    })

    const handler = jest.fn(async () => {
      throw new Error('hard-fail')
    })
    const failed = jest.fn()
    adapter.on('failed', failed)

    adapter.process('process', 1, handler)
    await tick()

    const message = {
      content: Buffer.from(JSON.stringify({ jobId: 'job-dlq', type: 'process', data: { foo: 'dlq' } })),
      properties: { headers: { jobType: 'process', attemptsUsed: 0, maxAttempts: 1, backoffDelay: 1000, backoffType: 'fixed' } },
    }

    await consumeHandler!(message)

    expect(mockChannelWrapper.sendToQueue).toHaveBeenCalledWith(
      `${queueName}.dlq`,
      expect.objectContaining({ jobId: 'job-dlq', data: { foo: 'dlq' }, type: 'process' }),
      expect.objectContaining({ headers: expect.objectContaining({ attemptsUsed: 1 }) })
    )
    expect(mockConfirmChannel.ack).toHaveBeenCalledWith(message)
    expect(failed).toHaveBeenCalledTimes(1)
  })

  it('reports queue stats using checkQueue results', async () => {
    mockConfirmChannel.checkQueue.mockResolvedValue({ messageCount: 7 })

    const adapter = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName,
      prefetch: 1,
      defaultAttempts: 1,
      defaultBackoffMs: 1000,
    })

    const stats = await adapter.getStats()

    expect(mockConfirmChannel.checkQueue).toHaveBeenCalledWith(queueName)
    expect(stats.waiting).toBe(7)
    expect(stats.active).toBe(0)
    expect(stats.failed).toBe(0)
  })

  it('reports DLQ stats independently across multiple queues', async () => {
    mockConfirmChannel.checkQueue
      .mockResolvedValueOnce({ messageCount: 4 })
      .mockResolvedValueOnce({ messageCount: 2 })

    const dlqA = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName: 'queue-a.dlq',
      prefetch: 1,
      defaultAttempts: 1,
      defaultBackoffMs: 500,
    })

    const dlqB = new RabbitQueueAdapter({
      connection: mockConnection,
      queueName: 'queue-b.dlq',
      prefetch: 1,
      defaultAttempts: 1,
      defaultBackoffMs: 500,
    })

    const statsA = await dlqA.getStats()
    const statsB = await dlqB.getStats()

    expect(mockConfirmChannel.checkQueue).toHaveBeenNthCalledWith(1, 'queue-a.dlq')
    expect(mockConfirmChannel.checkQueue).toHaveBeenNthCalledWith(2, 'queue-b.dlq')
    expect(statsA.waiting).toBe(4)
    expect(statsB.waiting).toBe(2)
  })
})
