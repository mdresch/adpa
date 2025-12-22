import { JiraService } from "../src/services/jiraService"
import { jiraLinkageService } from "../src/services/jiraLinkageService"

async function testJiraIntegration() {
  console.log("🧪 Testing Jira Integration...")
  
  // Test 1: Check if Jira linkage is enabled
  console.log("\n1. Checking Jira linkage configuration...")
  try {
    const config = await jiraLinkageService.getJiraLinkageConfig()
    console.log("✅ Jira linkage config:", config)
  } catch (error) {
    console.log("❌ Failed to get config:", error)
  }
  
  // Test 2: Check available Jira integrations
  console.log("\n2. Checking available Jira integrations...")
  try {
    const integrations = await jiraLinkageService.getAvailableJiraIntegrations()
    console.log("✅ Available Jira integrations:", integrations)
  } catch (error) {
    console.log("❌ Failed to get integrations:", error)
  }
  
  // Test 3: Test Jira service (if credentials are available)
  console.log("\n3. Testing Jira service...")
  const testConfig = {
    baseUrl: process.env.JIRA_BASE_URL || "https://your-domain.atlassian.net",
    email: process.env.JIRA_EMAIL || "test@example.com",
    apiToken: process.env.JIRA_API_TOKEN || "test-token"
  }
  
  if (process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN) {
    try {
      const jiraService = new JiraService(testConfig)
      const connected = await jiraService.testConnection()
      console.log(`✅ Jira connection test: ${connected ? 'SUCCESS' : 'FAILED'}`)
      
      if (connected && process.env.JIRA_PROJECT_KEY) {
        try {
          const project = await jiraService.getProject(process.env.JIRA_PROJECT_KEY)
          console.log(`✅ Project access test: ${project.name} (${project.key})`)
        } catch (projectError) {
          console.log("❌ Project access failed:", projectError)
        }
      }
    } catch (error) {
      console.log("❌ Jira service test failed:", error)
    }
  } else {
    console.log("⚠️  Skipping Jira service test - no credentials provided")
    console.log("   Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to test")
  }
  
  console.log("\n🎉 Jira integration test completed!")
}

// Run the test
testJiraIntegration().catch(console.error)