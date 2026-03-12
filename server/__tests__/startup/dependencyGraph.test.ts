import { DependencyGraph, Dependency } from "../../src/startup/dependencyGraph"

describe("DependencyGraph", () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph(false) // Non-fail-fast mode for tests
  })

  describe("Dependency Registration", () => {
    it("should register a dependency", () => {
      const mockDep: Dependency = {
        name: "TestDep",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      graph.register(mockDep)
      const statuses = graph.getStatuses()

      expect(statuses.has("TestDep")).toBe(true)
      expect(statuses.get("TestDep")?.status).toBe("pending")
    })

    it("should track multiple dependencies", () => {
      const dep1: Dependency = {
        name: "Dep1",
        critical: true,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      const dep2: Dependency = {
        name: "Dep2",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      graph.register(dep1)
      graph.register(dep2)

      const statuses = graph.getStatuses()
      expect(statuses.size).toBe(2)
    })
  })

  describe("Dependency Initialization", () => {
    it("should initialize a successful dependency", async () => {
      const mockDep: Dependency = {
        name: "SuccessDep",
        critical: false,
        timeout: 5000,
        init: async () => {
          // Simulate successful init
        },
        validate: async () => true,
      }

      graph.register(mockDep)
      await graph.initialize()

      const status = graph.getStatuses().get("SuccessDep")
      expect(status?.status).toBe("ready")
      expect(status?.error).toBeUndefined()
    })

    it("should handle dependency validation failure", async () => {
      const mockDep: Dependency = {
        name: "FailedValidation",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => false,
      }

      graph.register(mockDep)
      await graph.initialize()

      const status = graph.getStatuses().get("FailedValidation")
      expect(status?.status).toBe("failed")
      expect(status?.error).toBeDefined()
    })

    it("should handle initialization timeout", async () => {
      const mockDep: Dependency = {
        name: "TimeoutDep",
        critical: false,
        timeout: 100, // Very short timeout
        init: async () => {
          // Sleep longer than timeout
          await new Promise((resolve) => setTimeout(resolve, 500))
        },
        validate: async () => true,
      }

      graph.register(mockDep)
      await graph.initialize()

      const status = graph.getStatuses().get("TimeoutDep")
      expect(status?.status).toBe("failed")
      expect(status?.error).toContain("Timeout")
    })

    it("should handle initialization errors", async () => {
      const mockDep: Dependency = {
        name: "ErrorDep",
        critical: false,
        timeout: 5000,
        init: async () => {
          throw new Error("Init failed")
        },
        validate: async () => true,
      }

      graph.register(mockDep)
      await graph.initialize()

      const status = graph.getStatuses().get("ErrorDep")
      expect(status?.status).toBe("failed")
      expect(status?.error).toContain("Init failed")
    })
  })

  describe("Fail-Fast Mode", () => {
    it("should allow non-critical failures in normal mode", async () => {
      const graph = new DependencyGraph(false)

      const criticalDep: Dependency = {
        name: "CriticalDep",
        critical: true,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      const nonCriticalDep: Dependency = {
        name: "NonCriticalDep",
        critical: false,
        timeout: 5000,
        init: async () => {
          throw new Error("Failed")
        },
        validate: async () => true,
      }

      graph.register(criticalDep)
      graph.register(nonCriticalDep)

      await expect(graph.initialize()).resolves.not.toThrow()
    })

    it("should fail on critical dependency failure in fail-fast mode", async () => {
      const graph = new DependencyGraph(true)

      const criticalDep: Dependency = {
        name: "FailingCriticalDep",
        critical: true,
        timeout: 5000,
        init: async () => {
          throw new Error("Critical failure")
        },
        validate: async () => true,
      }

      graph.register(criticalDep)

      await expect(graph.initialize()).rejects.toThrow("Fail-fast mode")
    })

    it("should initialize dependencies in parallel", async () => {
      const initOrder: string[] = []

      const dep1: Dependency = {
        name: "Dep1",
        critical: false,
        timeout: 5000,
        init: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          initOrder.push("Dep1")
        },
        validate: async () => true,
      }

      const dep2: Dependency = {
        name: "Dep2",
        critical: false,
        timeout: 5000,
        init: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          initOrder.push("Dep2")
        },
        validate: async () => true,
      }

      graph.register(dep1)
      graph.register(dep2)

      const startTime = Date.now()
      await graph.initialize()
      const duration = Date.now() - startTime

      // Both should be initialized (order doesn't matter, but total time should be ~50ms, not 60ms)
      expect(initOrder).toContain("Dep1")
      expect(initOrder).toContain("Dep2")
      expect(duration).toBeLessThan(200) // Should be parallel, not sequential
    })
  })

  describe("Health Checks", () => {
    it("should report healthy when all critical deps are ready", async () => {
      const criticalDep: Dependency = {
        name: "CriticalDep",
        critical: true,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      graph.register(criticalDep)
      await graph.initialize()

      expect(graph.isHealthy()).toBe(true)
    })

    it("should report unhealthy when critical dep fails", async () => {
      const criticalDep: Dependency = {
        name: "FailingCriticalDep",
        critical: true,
        timeout: 5000,
        init: async () => {},
        validate: async () => false,
      }

      graph.register(criticalDep)
      await graph.initialize()

      expect(graph.isHealthy()).toBe(false)
    })

    it("should identify critical failures", async () => {
      const criticalDep: Dependency = {
        name: "FailingCritical",
        critical: true,
        timeout: 5000,
        init: async () => {
          throw new Error("Failed")
        },
        validate: async () => true,
      }

      graph.register(criticalDep)
      await graph.initialize()

      const failures = graph.getCriticalFailures()
      expect(failures).toHaveLength(1)
      expect(failures[0].name).toBe("FailingCritical")
    })
  })

  describe("Startup Summary", () => {
    it("should generate a summary", async () => {
      const mockDep: Dependency = {
        name: "TestDep",
        critical: true,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
      }

      graph.register(mockDep)
      await graph.initialize()

      const summary = graph.getSummary()

      expect(summary).toContain("STARTUP DEPENDENCY SUMMARY")
      expect(summary).toContain("TestDep")
      expect(summary).toContain("Ready: 1/1")
    })

    it("should show failed dependencies in summary", async () => {
      const failedDep: Dependency = {
        name: "FailedDep",
        critical: false,
        timeout: 5000,
        init: async () => {
          throw new Error("Init failed")
        },
        validate: async () => true,
      }

      graph.register(failedDep)
      await graph.initialize()

      const summary = graph.getSummary()

      expect(summary).toContain("FailedDep")
      expect(summary).toContain("Failed: 1")
    })
  })

  describe("Shutdown", () => {
    it("should call shutdown on all dependencies", async () => {
      const shutdownCalls: string[] = []

      const dep1: Dependency = {
        name: "Dep1",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
        shutdown: async () => {
          shutdownCalls.push("Dep1")
        },
      }

      const dep2: Dependency = {
        name: "Dep2",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
        shutdown: async () => {
          shutdownCalls.push("Dep2")
        },
      }

      graph.register(dep1)
      graph.register(dep2)

      await graph.shutdown()

      expect(shutdownCalls).toContain("Dep1")
      expect(shutdownCalls).toContain("Dep2")
    })

    it("should handle shutdown errors gracefully", async () => {
      const dep: Dependency = {
        name: "ErrorDep",
        critical: false,
        timeout: 5000,
        init: async () => {},
        validate: async () => true,
        shutdown: async () => {
          throw new Error("Shutdown failed")
        },
      }

      graph.register(dep)

      // Should not throw
      await expect(graph.shutdown()).resolves.not.toThrow()
    })
  })
})
