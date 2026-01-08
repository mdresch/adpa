// Minimal module declarations for RabbitMQ client libraries used by the queue adapters.
declare module 'amqp-connection-manager' {
  import type { ConfirmChannel, Options } from 'amqplib'

  export interface ChannelWrapper {
    addSetup(setup: (channel: ConfirmChannel) => Promise<void> | void): Promise<void>
    sendToQueue(queue: string, content: any, options?: Options.Publish): Promise<void>
    ack(message: any): void
    cancel(consumerTag: string): Promise<void>
    close(): Promise<void>
  }

  export interface AmqpConnectionManager {
    createChannel(options: {
      json?: boolean
      setup?: (channel: ConfirmChannel) => Promise<void> | void
    }): ChannelWrapper
    on(event: string, handler: (...args: any[]) => void): this
    close(): Promise<void>
  }

  export function connect(
    urls: string | string[],
    options?: {
      heartbeatIntervalInSeconds?: number
      reconnectTimeInSeconds?: number
    }
  ): AmqpConnectionManager
}

declare module 'amqplib' {
  export interface ConsumeMessage {
    content: Buffer
    properties: {
      headers?: Record<string, any>
      priority?: number
    }
  }

  export interface ConfirmChannel {
    assertQueue(queue: string, options?: any): Promise<any>
    consume(
      queue: string,
      onMessage: (msg: ConsumeMessage | null) => any,
      options?: any
    ): Promise<{ consumerTag: string }>
    prefetch(count: number): Promise<void>
    ack(message: ConsumeMessage): void
    cancel(consumerTag: string): Promise<void>
    checkQueue(queue: string): Promise<{ messageCount: number }>
    sendToQueue(queue: string, content: any, options?: Options.Publish): boolean
  }

  export namespace Options {
    interface Publish {
      headers?: any
      persistent?: boolean
      priority?: number
    }
  }
}
