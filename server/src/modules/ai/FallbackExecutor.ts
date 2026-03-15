export interface FallbackChainEntry {
  modelId: string
  provider: string
  timeoutMs?: number
  retryAttempts?: number
  priority?: number
}

export interface FallbackChain {
  id: string
  taskType: string
  entries: FallbackChainEntry[]
}

export interface FallbackRunnerResult {
  success: boolean
  provider: string
  modelId: string
  output?: unknown
  cost?: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  latencyMs?: number
}

export type FallbackRunner = (params: {
  provider: string
  modelId: string
  taskType: string
  request: unknown
  timeoutMs: number
  attempt: number
}) => Promise<FallbackRunnerResult>

export interface FallbackAuditEntry {
  taskType: string
  provider: string
  modelId: string
  attempt: number
  success: boolean
  latencyMs: number
  cost?: number
  error?: string
  timestamp: string
}

export interface FallbackAuditLogger {
  record: (entry: FallbackAuditEntry) => void | Promise<void>
}

export interface FallbackExecutorOptions {
  getChain: (taskType: string) => Promise<FallbackChain | null>
  runner: FallbackRunner
  auditLogger?: FallbackAuditLogger
  defaultTimeoutMs?: number
}

export interface FallbackRunResult {
  success: true
  provider: string
  modelId: string
  output?: unknown
  cost?: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  latencyMs: number
  attempts: number
}

export class FallbackExecutor {
  private readonly getChain: FallbackExecutorOptions["getChain"]
  private readonly runner: FallbackExecutorOptions["runner"]
  private readonly auditLogger?: FallbackAuditLogger
  private readonly defaultTimeoutMs: number

  constructor(options: FallbackExecutorOptions) {
    this.getChain = options.getChain
    this.runner = options.runner
    this.auditLogger = options.auditLogger
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000
  }

  async executeWithFallback(taskType: string, request: unknown): Promise<FallbackRunResult> {
    const chain = await this.getChain(taskType)
    if (!chain || chain.entries.length === 0) {
      throw new Error(`No fallback chain configured for task type: ${taskType}`)
    }

    const entries = this.sortEntries(chain.entries)
    let totalAttempts = 0
    let lastError: string | undefined

    for (const entry of entries) {
      const retries = entry.retryAttempts ?? 1
      const timeoutMs = entry.timeoutMs ?? this.defaultTimeoutMs

      for (let attempt = 1; attempt <= retries; attempt += 1) {
        totalAttempts += 1
        const startedAt = Date.now()

        try {
          const result = await this.withTimeout(
            this.runner({
              provider: entry.provider,
              modelId: entry.modelId,
              taskType,
              request,
              timeoutMs,
              attempt,
            }),
            timeoutMs
          )

          const latencyMs = result.latencyMs ?? Date.now() - startedAt
          await this.recordAudit({
            taskType,
            provider: entry.provider,
            modelId: entry.modelId,
            attempt,
            success: result.success,
            latencyMs,
            cost: result.cost,
            timestamp: new Date().toISOString(),
          })

          if (result.success) {
            return {
              success: true,
              provider: entry.provider,
              modelId: entry.modelId,
              output: result.output,
              cost: result.cost,
              usage: result.usage,
              latencyMs,
              attempts: totalAttempts,
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
          await this.recordAudit({
            taskType,
            provider: entry.provider,
            modelId: entry.modelId,
            attempt,
            success: false,
            latencyMs: Date.now() - startedAt,
            error: lastError,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    throw new Error(lastError || `All fallback entries failed for task type: ${taskType}`)
  }

  private sortEntries(entries: FallbackChainEntry[]): FallbackChainEntry[] {
    const withPriority = entries.some((entry) => typeof entry.priority === "number")
    if (!withPriority) {
      return entries
    }
    return [...entries].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  }

  private async recordAudit(entry: FallbackAuditEntry): Promise<void> {
    if (!this.auditLogger) {
      return
    }
    await this.auditLogger.record(entry)
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      promise
        .then((value) => {
          clearTimeout(timer)
          resolve(value)
        })
        .catch((error) => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }
}
