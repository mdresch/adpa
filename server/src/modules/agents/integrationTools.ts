/**
 * Integration Tools for Agents
 * Exposes GitHub, Confluence, and SharePoint capabilities as tools.
 */

import { globalToolRegistry, BaseTool } from './ToolRegistry'
import { pool } from '../../database/connection'
import { GitHubService } from '../../services/githubService'
import { ConfluenceService } from '../../services/confluenceService'
import { SharePointService } from '../../services/sharepointService'
import { JiraService } from '../../services/jiraService'
import { logger } from '../../utils/logger'

/**
 * Helper to get an active integration of a specific type
 */
async function getIntegration(type: string) {
  const res = await pool.query(
    `SELECT * FROM integrations WHERE type = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1`,
    [type]
  )
  if (res.rows.length === 0) return null
  
  const row = res.rows[0]
  const config = row.configuration || {}
  let credentials: any = {}
  
  if (row.credentials_encrypted) {
    try {
      // SECURITY WARNING: Despite the column name "credentials_encrypted", credentials are
      // currently only BASE64-ENCODED, not encrypted. Base64 provides zero confidentiality.
      // TODO: Replace with proper at-rest encryption (e.g. AES-256-GCM via Node crypto,
      // or a KMS-backed secret manager such as AWS Secrets Manager / Azure Key Vault).
      credentials = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString())
    } catch (e) {
      logger.error(`Failed to parse credentials for integration ${row.id}`, e)
    }
  }
  
  return { id: row.id, config, credentials }
}

/**
 * GitHub: List Issues Tool
 */
class GitHubListIssuesTool extends BaseTool {
  name = 'github_list_issues'
  description = 'List issues in the connected GitHub repository'
  parameters = {
    type: 'object',
    properties: {
      state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' }
    }
  }

  async execute(args: any) {
    const integ = await getIntegration('github')
    if (!integ) throw new Error('No active GitHub integration found')
    
    const service = new GitHubService({
      owner: integ.config.owner,
      repo: integ.config.repo,
      apiToken: integ.credentials.api_token,
      defaultBranch: integ.config.default_branch
    })
    
    return service.listIssues(args.state as any)
  }
}

/**
 * GitHub: Create Issue Tool
 */
class GitHubCreateIssueTool extends BaseTool {
  name = 'github_create_issue'
  description = 'Create a new issue in the connected GitHub repository'
  parameters = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
      labels: { type: 'array', items: { type: 'string' } }
    },
    required: ['title', 'body']
  }

  async execute(args: any) {
    const integ = await getIntegration('github')
    if (!integ) throw new Error('No active GitHub integration found')
    
    const service = new GitHubService({
      owner: integ.config.owner,
      repo: integ.config.repo,
      apiToken: integ.credentials.api_token,
      defaultBranch: integ.config.default_branch
    })
    
    return service.createIssue(args.title, args.body, args.labels)
  }
}

/**
 * Confluence: Search Content Tool
 */
class ConfluenceSearchTool extends BaseTool {
  name = 'confluence_search'
  description = 'Search for pages and content in Confluence'
  parameters = {
    type: 'object',
    properties: {
      query: { type: 'string' },
      spaceKey: { type: 'string' }
    },
    required: ['query']
  }

  async execute(args: any) {
    const integ = await getIntegration('confluence')
    if (!integ) throw new Error('No active Confluence integration found')
    
    const service = new ConfluenceService({
      baseUrl: integ.config.base_url,
      username: integ.credentials.username,
      apiToken: integ.credentials.api_token
    })
    
    return service.searchContent(args.query, args.spaceKey)
  }
}

/**
 * Confluence: Get Page Tool
 */
class ConfluenceGetPageTool extends BaseTool {
  name = 'confluence_get_page'
  description = 'Get the content of a specific Confluence page'
  parameters = {
    type: 'object',
    properties: {
      pageId: { type: 'string' }
    },
    required: ['pageId']
  }

  async execute(args: any) {
    const integ = await getIntegration('confluence')
    if (!integ) throw new Error('No active Confluence integration found')
    
    const service = new ConfluenceService({
      baseUrl: integ.config.base_url,
      username: integ.credentials.username,
      apiToken: integ.credentials.api_token
    })
    
    const page = await service.getPage(args.pageId)
    if (page.body?.storage?.value) {
      return {
        ...page,
        markdown: service.convertStorageToMarkdown(page.body.storage.value)
      }
    }
    return page
  }
}

/**
 * SharePoint: Search Files Tool
 */
class SharePointSearchTool extends BaseTool {
  name = 'sharepoint_search'
  description = 'Search for files in SharePoint and OneDrive'
  parameters = {
    type: 'object',
    properties: {
      query: { type: 'string' },
      siteId: { type: 'string' }
    },
    required: ['query']
  }

  async execute(args: any) {
    const integ = await getIntegration('sharepoint')
    if (!integ) throw new Error('No active SharePoint integration found')
    
    const service = new SharePointService()
    await service.initialize({
      tenantId: integ.config.tenant_id,
      clientId: integ.config.client_id,
      clientSecret: integ.credentials.client_secret,
      syncEnabled: false,
      autoSync: false
    })
    
    return service.searchFiles(args.query, args.siteId)
  }
}

/**
 * Jira: Find Issue Tool
 */
class JiraFindIssueTool extends BaseTool {
  name = 'jira_find_issue'
  description = 'Find a Jira issue by its title/summary'
  parameters = {
    type: 'object',
    properties: {
      projectKey: { type: 'string' },
      title: { type: 'string' }
    },
    required: ['projectKey', 'title']
  }

  async execute(args: any) {
    const integ = await getIntegration('jira')
    if (!integ) throw new Error('No active Jira integration found')
    
    const service = new JiraService({
      baseUrl: integ.config.base_url,
      email: integ.config.email,
      apiToken: integ.credentials.api_token
    })
    
    return service.findIssueByTitle(args.projectKey as string, args.title as string)
  }
}

/**
 * Jira: Create Issue Tool
 */
class JiraCreateIssueTool extends BaseTool {
  name = 'jira_create_issue'
  description = 'Create a new Jira issue'
  parameters = {
    type: 'object',
    properties: {
      projectKey: { type: 'string' },
      summary: { type: 'string' },
      description: { type: 'string' },
      issueType: { type: 'string', default: 'Task' }
    },
    required: ['projectKey', 'summary']
  }

  async execute(args: any) {
    const integ = await getIntegration('jira')
    if (!integ) throw new Error('No active Jira integration found')
    
    const service = new JiraService({
      baseUrl: integ.config.base_url,
      email: integ.config.email,
      apiToken: integ.credentials.api_token
    })
    
    return service.createIssue({
      projectKey: args.projectKey as string,
      summary: args.summary as string,
      description: args.description as string,
      issueType: args.issueType as string
    })
  }
}

// Register all tools
globalToolRegistry.registerTool(new GitHubListIssuesTool())
globalToolRegistry.registerTool(new GitHubCreateIssueTool())
globalToolRegistry.registerTool(new ConfluenceSearchTool())
globalToolRegistry.registerTool(new ConfluenceGetPageTool())
globalToolRegistry.registerTool(new SharePointSearchTool())
globalToolRegistry.registerTool(new JiraFindIssueTool())
globalToolRegistry.registerTool(new JiraCreateIssueTool())
