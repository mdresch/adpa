import { JiraLinkageService } from "../../services/jiraLinkageService"
import { pool } from "../../database/connection"

// Mock the database connection
jest.mock("../../database/connection", () => ({
  pool: {
    query: jest.fn()
  }
}))

const mockPool = pool as jest.Mocked<typeof pool>

describe("JiraLinkageService", () => {
  let service: JiraLinkageService

  beforeEach(() => {
    service = new JiraLinkageService()
    jest.clearAllMocks()
  })

  describe("isJiraLinkageEnabled", () => {
    it("should return false when no setting exists", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.isJiraLinkageEnabled()

      expect(result).toBe(false)
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'jira_linkage_enabled' LIMIT 1"
      )
    })

    it("should return true when setting is enabled", async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ setting_value: 'true' }] 
      } as any)

      const result = await service.isJiraLinkageEnabled()

      expect(result).toBe(true)
    })

    it("should return false when setting is disabled", async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ setting_value: 'false' }] 
      } as any)

      const result = await service.isJiraLinkageEnabled()

      expect(result).toBe(false)
    })

    it("should handle database errors gracefully", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Database error"))

      const result = await service.isJiraLinkageEnabled()

      expect(result).toBe(false)
    })
  })

  describe("setJiraLinkageEnabled", () => {
    it("should enable Jira linkage", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      await service.setJiraLinkageEnabled(true, "test-user")

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO system_settings"),
        ["true", "test-user"]
      )
    })

    it("should disable Jira linkage", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      await service.setJiraLinkageEnabled(false, "test-user")

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO system_settings"),
        ["false", "test-user"]
      )
    })
  })

  describe("getDefaultJiraIntegration", () => {
    it("should return null when no default integration is set", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.getDefaultJiraIntegration()

      expect(result).toBeNull()
    })

    it("should return integration ID when set", async () => {
      const integrationId = "test-integration-id"
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ setting_value: integrationId }] 
      } as any)

      const result = await service.getDefaultJiraIntegration()

      expect(result).toBe(integrationId)
    })
  })

  describe("getJiraLinkageConfig", () => {
    it("should return default config when no settings exist", async () => {
      // Mock isJiraLinkageEnabled
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
      // Mock getDefaultJiraIntegration
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
      // Mock additional settings query
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const config = await service.getJiraLinkageConfig()

      expect(config).toEqual({
        enabled: false,
        autoCreateIssues: false,
        linkConfluencePages: false,
        defaultIssueType: 'Task',
        defaultPriority: 'Medium'
      })
    })

    it("should return configured settings", async () => {
      const integrationId = "test-integration-id"
      
      // Mock isJiraLinkageEnabled
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ setting_value: 'true' }] 
      } as any)
      // Mock getDefaultJiraIntegration
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ setting_value: integrationId }] 
      } as any)
      // Mock additional settings query
      mockPool.query.mockResolvedValueOnce({ 
        rows: [
          { setting_key: 'jira_auto_create_issues', setting_value: 'true' },
          { setting_key: 'jira_link_confluence_pages', setting_value: 'true' },
          { setting_key: 'jira_default_issue_type', setting_value: 'Story' },
          { setting_key: 'jira_default_priority', setting_value: 'High' }
        ]
      } as any)

      const config = await service.getJiraLinkageConfig()

      expect(config).toEqual({
        enabled: true,
        integrationId: integrationId,
        autoCreateIssues: true,
        linkConfluencePages: true,
        defaultIssueType: 'Story',
        defaultPriority: 'High'
      })
    })
  })

  describe("getAvailableJiraIntegrations", () => {
    it("should return empty array when no integrations exist", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

      const integrations = await service.getAvailableJiraIntegrations()

      expect(integrations).toEqual([])
    })

    it("should return available Jira integrations", async () => {
      const mockIntegrations = [
        { 
          id: "integration-1", 
          name: "Company Jira", 
          configuration: { defaultProjectKey: "PROJ" } 
        },
        { 
          id: "integration-2", 
          name: "Team Jira", 
          configuration: {} 
        }
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockIntegrations } as any)

      const integrations = await service.getAvailableJiraIntegrations()

      expect(integrations).toEqual([
        { id: "integration-1", name: "Company Jira", projectKey: "PROJ" },
        { id: "integration-2", name: "Team Jira", projectKey: undefined }
      ])
    })
  })
})