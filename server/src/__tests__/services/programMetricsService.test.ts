import * as programMetricsService from "../../services/programMetricsService"

// Mock dependencies
jest.mock("../../database/connection", () => ({
  pool: {
    query: jest.fn()
  }
}))

jest.mock("../../utils/redis", () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}))

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  childLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}))

import { pool } from "../../database/connection"
import { cache } from "../../utils/redis"

const mockPool = pool as jest.Mocked<typeof pool>
const mockCache = cache as jest.Mocked<typeof cache>

describe("programMetricsService", () => {
  const testProgramId = "test-program-123"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getBudgetMetrics", () => {
    it("should aggregate budget correctly for program with projects", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_budget: "12000000", total_spent: "6000000" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getBudgetMetrics(testProgramId)

      expect(result).toEqual({
        total: 12000000,
        spent: 6000000,
        remaining: 6000000,
        percentSpent: 50
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SUM(budget)"),
        [testProgramId]
      )
    })

    it("should handle program with no projects (return zeros)", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_budget: "0", total_spent: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getBudgetMetrics(testProgramId)

      expect(result).toEqual({
        total: 0,
        spent: 0,
        remaining: 0,
        percentSpent: 0
      })
    })

    it("should calculate percentSpent correctly", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_budget: "1000000", total_spent: "750000" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getBudgetMetrics(testProgramId)

      expect(result.percentSpent).toBe(75)
    })
  })

  describe("getScheduleMetrics", () => {
    it("should calculate schedule metrics correctly", async () => {
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-06-30")

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { start_date: startDate, end_date: endDate }
        ],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getScheduleMetrics(testProgramId)

      expect(result.totalDays).toBeGreaterThan(0)
      expect(result.daysElapsed).toBeGreaterThan(0)
      expect(result.percentComplete).toBeGreaterThan(0)
    })

    it("should handle program with no dates", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getScheduleMetrics(testProgramId)

      expect(result).toEqual({
        totalDays: 0,
        daysElapsed: 0,
        percentComplete: 0
      })
    })
  })

  describe("getRiskMetrics", () => {
    it("should count risks by severity correctly", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { severity: "critical", count: "2" },
          { severity: "high", count: "5" },
          { severity: "medium", count: "6" },
          { severity: "low", count: "2" }
        ],
        command: "",
        rowCount: 4,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getRiskMetrics(testProgramId)

      expect(result).toEqual({
        total: 15,
        critical: 2,
        high: 5,
        medium: 6,
        low: 2
      })
    })

    it("should handle program with no risks", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getRiskMetrics(testProgramId)

      expect(result).toEqual({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      })
    })

    it("should map NULL severity to low and use COALESCE in GROUP BY", async () => {
      // Use implementation to assert SQL content and return rows with null severity
      ;(mockPool.query as any).mockImplementationOnce(async (sql: string, params: any[]) => {
        expect(typeof sql).toBe("string")
        expect(sql).toContain("GROUP BY COALESCE(r.severity, 'low')")
        expect(params).toEqual([testProgramId])
        return {
          rows: [
            { severity: null, count: "3" }, // should be counted under 'low'
            { severity: "high", count: "2" }
          ],
          command: "",
          rowCount: 2,
          oid: 0,
          fields: []
        } as any
      })

      const result = await programMetricsService.getRiskMetrics(testProgramId)

      expect(result).toEqual({
        total: 5,
        critical: 0,
        high: 2,
        medium: 0,
        low: 3
      })
    })
  })

  describe("getRAGStatus", () => {
    it("should calculate overall status as red when any project is red", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: "green", count: "2" },
          { status: "amber", count: "1" },
          { status: "red", count: "1" }
        ],
        command: "",
        rowCount: 3,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getRAGStatus(testProgramId)

      expect(result.overall).toBe("red")
      expect(result.breakdown).toEqual({
        green: 2,
        amber: 1,
        red: 1
      })
    })

    it("should calculate overall status as amber when no red but has amber", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: "green", count: "2" },
          { status: "amber", count: "1" }
        ],
        command: "",
        rowCount: 2,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getRAGStatus(testProgramId)

      expect(result.overall).toBe("amber")
      expect(result.breakdown).toEqual({
        green: 2,
        amber: 1,
        red: 0
      })
    })

    it("should calculate overall status as green when all projects are green", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: "green", count: "3" }
        ],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.getRAGStatus(testProgramId)

      expect(result.overall).toBe("green")
      expect(result.breakdown).toEqual({
        green: 3,
        amber: 0,
        red: 0
      })
    })
  })

  describe("calculateMetrics", () => {
    it("should calculate all metrics for a program with projects", async () => {
      // Mock cache miss
      mockCache.get.mockResolvedValueOnce(null)
      mockCache.set.mockResolvedValueOnce(true)

      // Mock all database queries
      // Budget query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_budget: "12000000", total_spent: "6000000" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      // Schedule query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { start_date: new Date("2024-01-01"), end_date: new Date("2024-12-31") }
        ],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      // RAG status query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: "green", count: "2" },
          { status: "amber", count: "1" }
        ],
        command: "",
        rowCount: 2,
        oid: 0,
        fields: []
      } as any)

      // Risks query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { severity: "high", count: "5" },
          { severity: "medium", count: "6" }
        ],
        command: "",
        rowCount: 2,
        oid: 0,
        fields: []
      } as any)

      // Projects query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { total: "3", active: "2", completed: "1" }
        ],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.calculateMetrics(testProgramId)

      expect(result.programId).toBe(testProgramId)
      expect(result.budget).toBeDefined()
      expect(result.schedule).toBeDefined()
      expect(result.status).toBeDefined()
      expect(result.risks).toBeDefined()
      expect(result.projects).toBeDefined()
      expect(result.lastCalculated).toBeDefined()
      expect(result.cached).toBe(false)

      expect(mockCache.set).toHaveBeenCalledWith(
        `program:metrics:${testProgramId}`,
        expect.objectContaining({
          programId: testProgramId
        }),
        300
      )
    })

    it("should return cached metrics when available", async () => {
      const cachedMetrics = {
        programId: testProgramId,
        budget: { total: 10000, spent: 5000, remaining: 5000, percentSpent: 50 },
        schedule: { totalDays: 180, daysElapsed: 90, percentComplete: 50 },
        status: { overall: "green", breakdown: { green: 3, amber: 0, red: 0 } },
        risks: { total: 5, critical: 0, high: 2, medium: 2, low: 1 },
        projects: { total: 3, active: 2, completed: 1 },
        lastCalculated: "2024-10-25T10:00:00Z",
        cached: false
      }

      mockCache.get.mockResolvedValueOnce(cachedMetrics)

      const result = await programMetricsService.calculateMetrics(testProgramId)

      expect(result).toEqual({
        ...cachedMetrics,
        cached: true
      })

      // Should not query database when cache hit
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it("should handle program with no projects", async () => {
      mockCache.get.mockResolvedValueOnce(null)
      mockCache.set.mockResolvedValueOnce(true)

      // Mock all queries to return empty/zero results
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_budget: "0", total_spent: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: []
      } as any)

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: []
      } as any)

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: []
      } as any)

      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: "0", active: "0", completed: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: []
      } as any)

      const result = await programMetricsService.calculateMetrics(testProgramId)

      expect(result.projects.total).toBe(0)
      expect(result.budget.total).toBe(0)
      expect(result.risks.total).toBe(0)
    })
  })

  describe("invalidateCache", () => {
    it("should invalidate cache for a program", async () => {
      mockCache.del.mockResolvedValueOnce(true)

      const result = await programMetricsService.invalidateCache(testProgramId)

      expect(result).toBe(true)
      expect(mockCache.del).toHaveBeenCalledWith(`program:metrics:${testProgramId}`)
    })

    it("should handle cache invalidation errors gracefully", async () => {
      mockCache.del.mockRejectedValueOnce(new Error("Cache error"))

      const result = await programMetricsService.invalidateCache(testProgramId)

      expect(result).toBe(false)
    })
  })
})
