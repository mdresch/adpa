import { logger } from "../utils/logger"

export interface JiraConfig {
  baseUrl: string
  email: string
  apiToken: string
  projectKey?: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  description?: string
  status: string
  assignee?: {
    displayName: string
    emailAddress: string
  }
  created: string
  updated: string
  url: string
}

export interface CreateJiraIssueRequest {
  summary: string
  description?: string
  issueType?: string
  projectKey: string
  assignee?: string
  priority?: string
  labels?: string[]
  customFields?: Record<string, any>
}

export interface LinkJiraIssueRequest {
  issueKey: string
  linkType?: string
  url?: string
  title?: string
}

export class JiraService {
  private config: JiraConfig

  constructor(config: JiraConfig) {
    this.config = config
  }

  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}/rest/api/3/${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Jira API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('myself')
      logger.info('Jira connection test successful')
      return true
    } catch (error) {
      logger.error('Jira connection test failed:', error)
      return false
    }
  }

  async getProject(projectKey: string): Promise<any> {
    try {
      return await this.makeRequest(`project/${projectKey}`)
    } catch (error) {
      logger.error(`Failed to get Jira project ${projectKey}:`, error)
      throw error
    }
  }

  async createIssue(request: CreateJiraIssueRequest): Promise<JiraIssue> {
    try {
      const payload = {
        fields: {
          project: {
            key: request.projectKey
          },
          summary: request.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: request.description || ""
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: request.issueType || "Task"
          },
          priority: request.priority ? {
            name: request.priority
          } : undefined,
          assignee: request.assignee ? {
            emailAddress: request.assignee
          } : undefined,
          labels: request.labels || [],
          ...request.customFields
        }
      }

      // Remove undefined fields
      Object.keys(payload.fields).forEach(key => {
        if (payload.fields[key] === undefined) {
          delete payload.fields[key]
        }
      })

      const result = await this.makeRequest('issue', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      const issue = await this.getIssue(result.key)
      logger.info(`Created Jira issue: ${result.key}`)
      return issue
    } catch (error) {
      logger.error('Failed to create Jira issue:', error)
      throw error
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const result = await this.makeRequest(`issue/${issueKey}`)
      
      return {
        id: result.id,
        key: result.key,
        summary: result.fields.summary,
        description: this.extractDescription(result.fields.description),
        status: result.fields.status.name,
        assignee: result.fields.assignee ? {
          displayName: result.fields.assignee.displayName,
          emailAddress: result.fields.assignee.emailAddress
        } : undefined,
        created: result.fields.created,
        updated: result.fields.updated,
        url: `${this.config.baseUrl}/browse/${result.key}`
      }
    } catch (error) {
      logger.error(`Failed to get Jira issue ${issueKey}:`, error)
      throw error
    }
  }

  async findIssueByTitle(projectKey: string, title: string): Promise<JiraIssue | null> {
    try {
      const jql = `project = "${projectKey}" AND summary ~ "${title.replace(/"/g, '\\"')}"`
      const result = await this.makeRequest(`search?jql=${encodeURIComponent(jql)}&maxResults=1`)
      
      if (result.issues && result.issues.length > 0) {
        const issue = result.issues[0]
        return {
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          description: this.extractDescription(issue.fields.description),
          status: issue.fields.status.name,
          assignee: issue.fields.assignee ? {
            displayName: issue.fields.assignee.displayName,
            emailAddress: issue.fields.assignee.emailAddress
          } : undefined,
          created: issue.fields.created,
          updated: issue.fields.updated,
          url: `${this.config.baseUrl}/browse/${issue.key}`
        }
      }
      
      return null
    } catch (error) {
      logger.error(`Failed to find Jira issue by title "${title}":`, error)
      return null
    }
  }

  async addRemoteLink(issueKey: string, url: string, title: string): Promise<void> {
    try {
      const payload = {
        object: {
          url: url,
          title: title,
          icon: {
            url16x16: `${this.config.baseUrl}/favicon.ico`,
            title: "ADPA Document"
          }
        }
      }

      await this.makeRequest(`issue/${issueKey}/remotelink`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      logger.info(`Added remote link to Jira issue ${issueKey}: ${url}`)
    } catch (error) {
      logger.error(`Failed to add remote link to Jira issue ${issueKey}:`, error)
      throw error
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      const payload = {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: comment
                }
              ]
            }
          ]
        }
      }

      await this.makeRequest(`issue/${issueKey}/comment`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      logger.info(`Added comment to Jira issue ${issueKey}`)
    } catch (error) {
      logger.error(`Failed to add comment to Jira issue ${issueKey}:`, error)
      throw error
    }
  }

  private extractDescription(description: any): string {
    if (!description) return ""
    
    if (typeof description === 'string') {
      return description
    }
    
    // Handle Atlassian Document Format (ADF)
    if (description.type === 'doc' && description.content) {
      return this.extractTextFromADF(description.content)
    }
    
    return ""
  }

  private extractTextFromADF(content: any[]): string {
    let text = ""
    
    for (const node of content) {
      if (node.type === 'paragraph' && node.content) {
        for (const textNode of node.content) {
          if (textNode.type === 'text' && textNode.text) {
            text += textNode.text
          }
        }
        text += "\n"
      }
    }
    
    return text.trim()
  }
}