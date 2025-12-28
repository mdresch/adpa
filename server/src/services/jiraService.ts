import { logger } from "../utils/logger"
import fetch from 'node-fetch'

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
  description?: string | any // Can be string or ADF (Atlassian Document Format)
  issueType?: string
  projectKey: string
  assignee?: string
  priority?: string
  labels?: string[]
  customFields?: Record<string, any>
  commentOnDescriptionFailure?: boolean
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

  // Use any for options to avoid depending on DOM lib types
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.config.baseUrl}/rest/api/3/${endpoint}`

    const response = await fetch(url as any, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    } as any)

    const status = (response as any).status

    if (!('ok' in response) || !(response as any).ok) {
      const errorText = await (response as any).text()
      const statusText = (response as any).statusText
      let errorMessage = `Jira API error (${status}): ${errorText}`
      let errorDetails: any = {}

      try {
        if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
          const errorJson = JSON.parse(errorText)
          errorDetails = errorJson

          if (errorJson.errors && Object.keys(errorJson.errors).length > 0) {
            const fieldErrors = Object.entries(errorJson.errors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(', ')
            errorMessage = `Jira API error (${status}): ${errorJson.errorMessages?.join(', ') || 'Invalid input'}. Field errors: ${fieldErrors}`
          } else if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
            errorMessage = `Jira API error (${status}): ${errorJson.errorMessages.join(', ')}`
          }
        } else {
          errorMessage = `Jira API error (${status}): ${errorText}`
          errorDetails = { rawError: errorText }
        }
      } catch (parseError) {
        logger.debug('Failed to parse Jira error response:', { errorText, parseError })
        errorDetails = { rawError: errorText, parseError: parseError instanceof Error ? parseError.message : String(parseError) }
      }

      logger.error('Jira API error details:', {
        status,
        statusText,
        errorText: errorText.substring(0, 1000),
        errorDetails,
        endpoint: endpoint,
        method: options.method || 'GET'
      })

      const error = new Error(errorMessage) as any
      error.statusCode = status
      error.errorDetails = errorDetails
      throw error
    }

    // Success path: some Jira endpoints (e.g., edit issue) return 204 (no content)
    if (status === 204) return {}

    // Read body as text first to safely handle empty responses
    const bodyText = await (response as any).text()
    if (!bodyText || bodyText.trim() === '') return {}

    try {
      return JSON.parse(bodyText)
    } catch {
      // Fallback: return raw text if not JSON
      return bodyText
    }
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

  async getIssueTypes(projectKey: string): Promise<any[]> {
    try {
      const project = await this.getProject(projectKey)
      return project.issueTypes || []
    } catch (error) {
      logger.error(`Failed to get issue types for project ${projectKey}:`, error)
      throw error
    }
  }

  async validateIssueType(projectKey: string, issueTypeName: string): Promise<boolean> {
    try {
      const issueTypes = await this.getIssueTypes(projectKey)
      return issueTypes.some((type: any) =>
        type.name?.toLowerCase() === issueTypeName.toLowerCase() ||
        type.name === issueTypeName
      )
    } catch (error) {
      logger.warn(`Failed to validate issue type ${issueTypeName} for project ${projectKey}:`, error)
      return true
    }
  }

  async createIssue(request: CreateJiraIssueRequest): Promise<JiraIssue> {
    // Two-step flow: create minimal issue, then patch fields (ADF description, priority, assignee, labels, customFields)
    let issueTypeId: string | undefined
    let issueTypeName: string = request.issueType || 'Task'

    // 1) Determine issuetype id if possible (createmeta), but don't fail if we can't
    try {
      const createmeta = await this.makeRequest(`issue/createmeta?projectKeys=${request.projectKey}&expand=projects.issuetypes`)
      const project = createmeta?.projects?.[0]
      const availableTypes = project?.issuetypes || []
      const matchingType = availableTypes.find((t: any) => t.name?.toLowerCase() === issueTypeName.toLowerCase() || t.name === issueTypeName)
      if (matchingType) {
        issueTypeId = matchingType.id
        issueTypeName = matchingType.name
      } else if (availableTypes.length > 0) {
        issueTypeId = availableTypes[0].id
        issueTypeName = availableTypes[0].name
        logger.warn(`Issue type "${request.issueType || 'Task'}" not found; using fallback "${issueTypeName}" (ID: ${issueTypeId})`)
      }
    } catch (e) {
      logger.debug('Unable to fetch createmeta for issuetype resolution; proceeding with name only', { message: (e as any)?.message })
    }

    // 2) Create minimal payload
    const minimalPayload: any = {
      fields: {
        project: { key: request.projectKey },
        summary: request.summary,
        issuetype: issueTypeId ? { id: issueTypeId } : { name: issueTypeName }
      }
    }

    // 3) Create issue with minimal fields (highest likelihood of success)
    let created: any
    try {
      created = await this.makeRequest('issue', { method: 'POST', body: JSON.stringify(minimalPayload) })
      logger.info(`✅ Created Jira issue (minimal): ${created.key || created.id}`)
    } catch (err: any) {
      // As a last resort, try common issue types quickly
      const commonTypes = ['Story', 'Bug', 'Epic', 'Task']
      for (const common of commonTypes) {
        if (common.toLowerCase() === issueTypeName.toLowerCase()) continue
        try {
          const fallbackPayload = {
            fields: {
              project: minimalPayload.fields.project,
              summary: minimalPayload.fields.summary,
              issuetype: { name: common }
            }
          }
          created = await this.makeRequest('issue', { method: 'POST', body: JSON.stringify(fallbackPayload) })
          logger.warn(`✅ Created Jira issue using fallback issuetype: ${common}`)
          break
        } catch (e2: any) {
          logger.debug(`Fallback issuetype ${common} failed: ${e2?.message}`)
        }
      }
      if (!created) throw err
    }

    const key = created.key || created.id

    // 4) Build patch fields (description as ADF and optional fields)
    const patchFields: Record<string, any> = {}

    // Description (ensure ADF)
    let descriptionADF: any | undefined
    if (request.description) {
      if (typeof request.description === 'string') {
        const text = request.description.trim()
        descriptionADF = {
          type: 'doc',
          version: 1,
          content: [
            { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }
          ]
        }
      } else if (request.description.type === 'doc' && Array.isArray(request.description.content)) {
        descriptionADF = { ...request.description, version: request.description.version || 1 }
      } else {
        logger.warn('Invalid description format provided; skipping description patch')
      }
    }
    if (descriptionADF) patchFields.description = descriptionADF

    if (request.priority) patchFields.priority = { name: request.priority }

    if (request.assignee) {
      patchFields.assignee = request.assignee.includes('@')
        ? { emailAddress: request.assignee }
        : { accountId: request.assignee }
    }

    if (request.labels && request.labels.length > 0) patchFields.labels = request.labels

    if (request.customFields) Object.assign(patchFields, request.customFields)

    // 5) Patch the issue incrementally if we have any fields to update
    if (Object.keys(patchFields).length > 0) {
      try {
        await this.patchIssueIncrementally(key, request, patchFields)
        logger.info(`Patched Jira issue ${key} (incremental updates)`) 
      } catch (patchErr) {
        logger.warn(`Failed to patch Jira issue ${key}; returning created issue anyway`, { message: (patchErr as any)?.message })
      }
    }

    // 6) Return full issue details
    return await this.getIssue(key)
  }

  private async updateIssueFields(issueKey: string, fields: Record<string, any>): Promise<void> {
    await this.makeRequest(`issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    })
  }

  private async patchIssueIncrementally(issueKey: string, request: CreateJiraIssueRequest, fields: Record<string, any>): Promise<void> {
    // Optionally pull editmeta to discover editable fields
    let editmeta: any | null = null
    let isEditable = (_key: string) => true
    try {
      editmeta = await this.makeRequest(`issue/${issueKey}/editmeta`)
      const fieldsMeta = (editmeta && editmeta.fields) ? editmeta.fields : {}
      const editableKeys = Object.keys(fieldsMeta)
      logger.debug('Jira editmeta fetched for incremental patch', { issueKey, editableCount: editableKeys.length })
      // Detailed logging for description field when present
      if (fieldsMeta['description']) {
        const dm = fieldsMeta['description']
        logger.debug('Description editmeta', {
          issueKey,
          editable: Array.isArray(dm.operations) ? dm.operations.includes('set') : false,
          operations: dm.operations,
          schema: dm.schema
        })
      }
      isEditable = (key: string) => {
        const meta = fieldsMeta[key]
        if (!meta) return false
        const ops = Array.isArray(meta.operations) ? meta.operations : []
        return ops.includes('set')
      }
    } catch (e: any) {
      logger.debug('Could not fetch editmeta; proceeding without it', { message: e?.message })
      // keep isEditable as always-true fallback
    }

    // Resolve assignee to accountId if input looks like email (Jira Cloud prefers accountId)
    const resolveAssignee = async (assignee: any) => {
      if (!assignee) return undefined
      if (assignee.accountId) return assignee
      const input = (request.assignee || '').trim()
      if (!input) return undefined
      // If already looks like an accountId (GUID-like), use as-is
      if (!input.includes('@')) {
        return { accountId: input }
      }
      try {
        const users = await this.makeRequest(`user/search?query=${encodeURIComponent(input)}`)
        if (Array.isArray(users) && users.length > 0 && users[0].accountId) {
          return { accountId: users[0].accountId }
        }
      } catch (e) {
        logger.debug('Assignee resolution failed; will skip assignee patch', { message: (e as any)?.message })
      }
      return undefined
    }

    // Resolve priority by ID if possible
    const resolvePriority = async (priorityField: any) => {
      if (!priorityField) return undefined
      if (priorityField.id) return priorityField
      const name = priorityField.name
      if (!name) return undefined
      try {
        const priorities = await this.makeRequest('priority')
        if (Array.isArray(priorities)) {
          const match = priorities.find((p: any) => p.name?.toLowerCase() === name.toLowerCase())
          if (match?.id) return { id: match.id }
        }
      } catch (e) {
        logger.debug('Priority resolution failed; will try with name', { message: (e as any)?.message })
      }
      return { name }
    }

    // Build ordered patch attempts: description -> assignee -> priority -> labels -> custom fields (one-by-one)
    const orderedPatches: Array<{ name: string; fields: Record<string, any> }> = []

    if (fields.description && isEditable('description')) {
      orderedPatches.push({ name: 'description', fields: { description: fields.description } })
    } else if (fields.description) {
      logger.debug('Skipping description patch (not editable)')
    }

    if (fields.assignee && isEditable('assignee')) {
      const assigneeResolved = await resolveAssignee(fields.assignee)
      if (assigneeResolved) {
        orderedPatches.push({ name: 'assignee', fields: { assignee: assigneeResolved } })
      }
    } else if (fields.assignee) {
      logger.debug('Skipping assignee patch (not editable)')
    }

    if (fields.priority && isEditable('priority')) {
      const priorityResolved = await resolvePriority(fields.priority)
      if (priorityResolved) {
        orderedPatches.push({ name: 'priority', fields: { priority: priorityResolved } })
      }
    } else if (fields.priority) {
      logger.debug('Skipping priority patch (not editable)')
    }

    if (fields.labels && isEditable('labels')) {
      orderedPatches.push({ name: 'labels', fields: { labels: fields.labels } })
    } else if (fields.labels) {
      logger.debug('Skipping labels patch (not editable)')
    }

    // Custom fields last: patch one-by-one to isolate failures
    const customFieldKeys = Object.keys(fields).filter(k => !['description','assignee','priority','labels','project','summary','issuetype'].includes(k))
    for (const key of customFieldKeys) {
      if (isEditable(key)) {
        orderedPatches.push({ name: `custom:${key}`, fields: { [key]: fields[key] } as any })
      } else {
        logger.debug(`Skipping custom field ${key} patch (not editable)`) 
      }
    }

    for (const step of orderedPatches) {
      try {
        await this.updateIssueFields(issueKey, step.fields)
        logger.debug(`Patched ${step.name} successfully`, { issueKey })
      } catch (e: any) {
        const msg = e?.message || 'Unknown'
        logger.warn(`Patch step failed for ${step.name}`, { issueKey, error: msg })

        // If description failed and it's editable, retry using update: set first, then minimal ADF
        if (step.name === 'description' && isEditable('description')) {
          let descPatched = false
          try {
            await this.makeRequest(`issue/${issueKey}`, {
              method: 'PUT',
              body: JSON.stringify({ update: { description: [{ set: step.fields.description }] } })
            })
            logger.info(`Patched description via update.set`, { issueKey })
            descPatched = true
            continue
          } catch (updateErr: any) {
            logger.warn(`Description update.set failed`, { issueKey, error: updateErr?.message || String(updateErr) })
            try {
              const minimalADF = {
                type: 'doc',
                version: 1,
                content: [ { type: 'paragraph', content: [] } ]
              }
              await this.makeRequest(`issue/${issueKey}`, {
                method: 'PUT',
                body: JSON.stringify({ update: { description: [{ set: minimalADF }] } })
              })
              logger.info(`Patched description with minimal ADF via update.set`, { issueKey })
              descPatched = true
              continue
            } catch (fallbackErr: any) {
              logger.warn(`Minimal ADF fallback (update.set) for description failed`, { issueKey, error: fallbackErr?.message || String(fallbackErr) })
            }
          }

          // If still not patched and option set, post as comment instead of description
          if (!descPatched && request.commentOnDescriptionFailure) {
            try {
              const text = typeof request.description === 'string'
                ? request.description
                : (request.description?.content ? this.extractTextFromADF(request.description.content) : '')
              if (text && text.trim().length > 0) {
                await this.addComment(issueKey, `Original description (posted as comment due to field constraints):\n\n${text}`)
                logger.info(`Posted description as comment due to description patch failure`, { issueKey })
              } else {
                logger.debug(`No text content to post as comment after description patch failure`, { issueKey })
              }
            } catch (commentErr: any) {
              logger.warn(`Failed to post description as comment after description patch failure`, { issueKey, error: commentErr?.message || String(commentErr) })
            }
          }
        }
        // continue to next step
      }
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

      const searchPayload = {
        jql: jql,
        maxResults: 1,
        fields: ['id', 'key', 'summary', 'description', 'status', 'assignee', 'created', 'updated']
      }

      logger.debug('Searching Jira issue', { projectKey, title, jql })

      // Use the new /search/jql endpoint directly to avoid 410 warnings
      const result: any = await this.makeRequest('search/jql', {
        method: 'POST',
        body: JSON.stringify(searchPayload)
      })

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

  private async buildIssueFromCreateResult(result: any, fallbackSummary: string): Promise<JiraIssue> {
    const key = result.key || result.id
    try {
      const full = await this.getIssue(key)
      return full
    } catch (_e) {
      return {
        id: result.id || key,
        key: key,
        summary: fallbackSummary,
        description: undefined,
        status: 'Unknown',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        url: `${this.config.baseUrl}/browse/${key}`
      } as JiraIssue
    }
  }

  private extractDescription(description: any): string {
    if (!description) return ""

    if (typeof description === 'string') {
      return description
    }

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
