import { FallbackExecutor } from "../FallbackExecutor"
import type {
  FallbackAuditEntry,
  FallbackChain,
  FallbackRunner,
} from "../FallbackExecutor"

describe("Phase 6: AI Fallback & Quality Assurance", () => {
  const buildExecutor = (chain: FallbackChain, runner: FallbackRunner, auditLog: FallbackAuditEntry[] = []) => {
    return {
      executor: new FallbackExecutor({
        getChain: async (taskType) => (taskType === chain.taskType ? chain : null),
        runner,
        auditLogger: {
          record: (entry) => {
            auditLog.push(entry)
          },
        },
      }),
      auditLog,
    }
  }

  /**
   * Scenario 1: Simulate provider failures and verify fallback to Ollama.
   * This verifies that when OpenAI fails, the system automatically tries the next entry (Ollama).
   */
  it("Scenario 1: Fallback to local Ollama when cloud provider fails", async () => {
    const chain: FallbackChain = {
      id: "chain-qa-1",
      taskType: "chat",
      entries: [
        { modelId: "gpt-4o", provider: "openai", timeoutMs: 100, retryAttempts: 1 },
        { modelId: "llama3.2", provider: "ollama", timeoutMs: 100, retryAttempts: 1 },
      ],
    }

    const runner: FallbackRunner = async ({ provider, modelId }) => {
      if (provider === "openai") {
        throw new Error("OpenAI API Connection Failed")
      }

      return {
        success: true,
        provider,
        modelId,
        output: { result: "Success from local model" },
        cost: 0,
      }
    }

    const { executor } = buildExecutor(chain, runner)
    const result = await executor.executeWithFallback("chat", { prompt: "test" })

    expect(result.provider).toBe("ollama")
    expect(result.success).toBe(true)
    expect(result.attempts).toBe(2)
  })

  /**
   * Scenario 2: Industry Benchmarking - Latency comparison
   * Verifies that latency metrics are captured and correctly reported for different providers.
   */
  it("Scenario 2: Performance Benchmarking - Latency tracking", async () => {
    const chain: FallbackChain = {
      id: "chain-qa-2",
      taskType: "benchmark",
      entries: [
        { modelId: "gpt-4o", provider: "openai", timeoutMs: 200, retryAttempts: 1 },
        { modelId: "llama3.2", provider: "ollama", timeoutMs: 100, retryAttempts: 1 },
      ],
    }

    const runner: FallbackRunner = async ({ provider, modelId }) => {
      // Simulate real-world latency
      const simulatedLatency = provider === "openai" ? 150 : 30
      await new Promise(r => setTimeout(r, 10)) // Actual wait for test stability

      return {
        success: true,
        provider,
        modelId,
        output: { text: "ok" },
        latencyMs: simulatedLatency,
        cost: provider === "openai" ? 0.01 : 0,
      }
    }

    const { executor, auditLog } = buildExecutor(chain, runner)
    const result = await executor.executeWithFallback("benchmark", { prompt: "measure" })

    expect(result.latencyMs).toBe(150) // First one succeeded in this test case
    expect(auditLog[0].latencyMs).toBeDefined()
    
    // Test the second provider latency by failing the first
    const failingRunner: FallbackRunner = async ({ provider, modelId }) => {
        if (provider === "openai") throw new Error("fail")
        return {
            success: true,
            provider,
            modelId,
            output: { text: "ok" },
            latencyMs: 30,
            cost: 0
        }
    }
    
    const { executor: executor2, auditLog: auditLog2 } = buildExecutor(chain, failingRunner)
    const result2 = await executor2.executeWithFallback("benchmark", { prompt: "measure" })
    
    expect(result2.provider).toBe("ollama")
    expect(result2.latencyMs).toBe(30)
  })

  /**
   * Scenario 3: Cost Calculation Verification
   * Ensures that cost metadata from ai_models is correctly propagated to audit logs.
   */
  it("Scenario 3: Cost tracking in audit logs", async () => {
    const chain: FallbackChain = {
      id: "chain-qa-3",
      taskType: "cost-test",
      entries: [
        { modelId: "gpt-4o", provider: "openai", timeoutMs: 100, retryAttempts: 1 },
      ],
    }

    const runner: FallbackRunner = async ({ provider, modelId }) => {
      return {
        success: true,
        provider,
        modelId,
        output: { text: "ok" },
        cost: 0.0045, // Simulated cost based on 1.5k tokens
      }
    }

    const { executor, auditLog } = buildExecutor(chain, runner)
    await executor.executeWithFallback("cost-test", { prompt: "expensive" })

    expect(auditLog[0].cost).toBe(0.0045)
  })

  /**
   * Scenario 4: End-to-End Flow Verification
   * Verifies that a complex task (extraction) succeeds even when the primary provider is "down".
   */
  it("Scenario 4: Full Document Extraction succeeds via Fallback", async () => {
    const chain: FallbackChain = {
      id: "chain-qa-4",
      taskType: "extraction",
      entries: [
        { modelId: "gpt-4o", provider: "openai", timeoutMs: 100, retryAttempts: 1 },
        { modelId: "qwen3-coder", provider: "ollama", timeoutMs: 100, retryAttempts: 1 },
      ],
    }

    const runner: FallbackRunner = async ({ provider, modelId, taskType }) => {
      if (provider === "openai") {
        return { success: false, provider, modelId, error: "Rate Limit Exceeded" }
      }

      return {
        success: true,
        provider,
        modelId,
        output: { 
            entities: [{ name: "Project X", type: "PROJECT" }],
            summary: "Extracted via backup provider"
        },
        cost: 0,
      }
    }

    const { executor, auditLog } = buildExecutor(chain, runner)
    const result = await executor.executeWithFallback("extraction", { text: "Document content..." })

    expect(result.success).toBe(true)
    expect(result.provider).toBe("ollama")
    expect(result.output).toHaveProperty("entities")
    expect(auditLog).toHaveLength(2) // 1 failure, 1 success
    expect(auditLog[0].success).toBe(false)
    expect(auditLog[1].success).toBe(true)
  })
})
