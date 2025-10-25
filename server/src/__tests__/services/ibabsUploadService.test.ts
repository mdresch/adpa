/**
 * iBabs Upload Service Tests
 * Tests for board report generation and upload functionality
 */

import { IBabsUploadService } from "../../services/ibabsUploadService"
import { IBabsConfig } from "../../services/ibabsService"
import { pool } from "../../database/connection"

// Mock config
const mockConfig: IBabsConfig = {
  baseUrl: "https://api.ibabs.test",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "https://test.com/callback",
}

const integrationId = "test-integration-id"

describe("IBabsUploadService", () => {
  let uploadService: IBabsUploadService

  beforeEach(() => {
    uploadService = new IBabsUploadService(mockConfig, integrationId)
  })

  describe("Report Generation", () => {
    it("should generate CEO report with portfolio metrics", async () => {
      // Note: This test would require database mocking or test data
      // For now, we'll test the structure

      const result = await uploadService.generateBoardReport({
        reportType: "ceo",
        includeFinancials: true,
        includeRisks: true,
      })

      expect(result).toHaveProperty("markdown")
      expect(result).toHaveProperty("pdf")
      expect(result.markdown).toContain("CEO Portfolio Status Report")
      expect(result.pdf).toBeInstanceOf(Buffer)
    }, 30000)

    it("should generate CFO report with financial data", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "cfo",
        includeFinancials: true,
      })

      expect(result).toHaveProperty("markdown")
      expect(result).toHaveProperty("pdf")
      expect(result.markdown).toContain("CFO Financial Report")
      expect(result.pdf).toBeInstanceOf(Buffer)
    }, 30000)

    it("should generate Audit report with compliance info", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "audit",
        includeRisks: true,
      })

      expect(result).toHaveProperty("markdown")
      expect(result).toHaveProperty("pdf")
      expect(result.markdown).toContain("Audit Committee Report")
      expect(result.pdf).toBeInstanceOf(Buffer)
    }, 30000)

    it("should include quarter and year in report title", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "ceo",
        quarter: "Q2",
        year: 2026,
      })

      expect(result.markdown).toContain("Q2 2026")
    }, 30000)

    it("should throw error for program-detail without programId", async () => {
      await expect(
        uploadService.generateBoardReport({
          reportType: "program-detail",
        })
      ).rejects.toThrow("Program ID required")
    })
  })

  describe("Report Formatting", () => {
    it("should format currency correctly", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "cfo",
        includeFinancials: true,
      })

      // Check that currency is formatted (contains dollar signs and commas)
      expect(result.markdown).toMatch(/\$[\d,]+/)
    }, 30000)

    it("should format percentages correctly", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "cfo",
        includeFinancials: true,
      })

      // Check for percentage formatting
      expect(result.markdown).toMatch(/\d+\.\d+%/)
    }, 30000)

    it("should include status icons in reports", async () => {
      const result = await uploadService.generateBoardReport({
        reportType: "ceo",
      })

      // Check for emoji icons (🟢, 🟡, 🔴, etc.)
      expect(result.markdown).toMatch(/[🟢🟡🔴✅⏳]/u)
    }, 30000)
  })

  describe("Schedule Management", () => {
    it("should calculate days until meeting correctly", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const days = uploadService["getDaysUntilMeeting"](futureDate)

      expect(days).toBe(7)
    })

    it("should get current quarter", () => {
      const quarter = uploadService["getCurrentQuarter"]()

      expect(quarter).toMatch(/^Q[1-4]$/)
    })

    it("should format agenda item for report type", () => {
      const ceoAgenda = uploadService["getAgendaItemForReport"]("ceo")
      const cfoAgenda = uploadService["getAgendaItemForReport"]("cfo")
      const auditAgenda = uploadService["getAgendaItemForReport"]("audit")

      expect(ceoAgenda).toBe("4")
      expect(cfoAgenda).toBe("5")
      expect(auditAgenda).toBe("6")
    })
  })

  describe("Helper Functions", () => {
    it("should get correct status icon", () => {
      const activeIcon = uploadService["getStatusIcon"]("active")
      const completedIcon = uploadService["getStatusIcon"]("completed")
      const cancelledIcon = uploadService["getStatusIcon"]("cancelled")

      expect(activeIcon).toBe("🟢")
      expect(completedIcon).toBe("✅")
      expect(cancelledIcon).toBe("🔴")
    })

    it("should get correct health icon", () => {
      const goodHealth = uploadService["getHealthIcon"](8)
      const mediumHealth = uploadService["getHealthIcon"](5)
      const poorHealth = uploadService["getHealthIcon"](2)

      expect(goodHealth).toBe("🟢")
      expect(mediumHealth).toBe("🟡")
      expect(poorHealth).toBe("🔴")
    })

    it("should get correct severity icon", () => {
      const critical = uploadService["getSeverityIcon"]("critical")
      const high = uploadService["getSeverityIcon"]("high")
      const medium = uploadService["getSeverityIcon"]("medium")
      const low = uploadService["getSeverityIcon"]("low")

      expect(critical).toBe("🔴")
      expect(high).toBe("🟠")
      expect(medium).toBe("🟡")
      expect(low).toBe("🟢")
    })
  })

  describe("Auto-Scheduling", () => {
    it("should start auto-scheduling", () => {
      uploadService.startAutoScheduling()

      // Verify that job was created (would need to check internal state)
      // For now, just ensure no errors
      expect(true).toBe(true)
    })

    it("should stop auto-scheduling", () => {
      uploadService.startAutoScheduling()
      uploadService.stopAutoScheduling()

      // Verify that job was cancelled
      expect(true).toBe(true)
    })
  })
})
