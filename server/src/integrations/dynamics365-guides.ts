import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"

/**
 * Microsoft Dynamics 365 Guides Integration
 * 
 * Enables automated generation of step-by-step holographic instructions
 * from ADPA procedure documents and Digital Twin assets.
 * 
 * Architecture:
 * - ADPA L0-L2 data → D365 Guides entities via Dataverse API
 * - Supports HoloLens 2, iOS/Android mobile AR, PC authoring
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface D365GuidesConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  environmentUrl: string  // e.g., https://your-org.crm.dynamics.com
  guidesAppId?: string
}

export interface Guide {
  id?: string
  name: string
  description?: string
  sourceDocumentId?: string
  assetRef?: string
  steps?: GuideStep[]
  status?: 'draft' | 'published' | 'archived'
  createdOn?: string
  modifiedOn?: string
}

export interface GuideStep {
  id?: string
  stepNumber: number
  name: string
  instructionText: string
  extendedDescription?: string
  warningText?: string
  mediaType?: 'none' | 'image' | 'video' | '3d'
  mediaRef?: string
  toolsRequired?: string
  validationChecklist?: string[]
  anchorType?: 'none' | 'qr' | '3d_model' | 'spatial'
  anchorId?: string
  telemetryCheck?: TelemetryCheck
}

export interface TelemetryCheck {
  stateKey: string
  expectedMin?: number
  expectedMax?: number
  expectedValue?: string
  displayFormat?: string
}

export interface GuideAnalytics {
  guideId: string
  totalCompletions: number
  averageCompletionTime: number  // seconds
  stepAnalytics: StepAnalytics[]
}

export interface StepAnalytics {
  stepNumber: number
  averageTime: number  // seconds
  errorCount: number
  skipCount: number
}

export interface SyncStatus {
  documentId: string
  synced: boolean
  guideId?: string
  guideUrl?: string
  lastSyncedAt?: string
  syncStatus: 'synced' | 'stale' | 'conflict' | 'not_synced'
  version?: string
}

// Dataverse entity interfaces (following D365 naming convention)
interface DataverseGuide {
  msmrw_guideid?: string
  msmrw_name: string
  msmrw_description?: string
  adpa_sourcedocumentid?: string
  adpa_assetref?: string
  adpa_syncstatus?: number  // Choice field
  adpa_lastsyncversion?: string
  statecode?: number
  statuscode?: number
  createdon?: string
  modifiedon?: string
}

interface DataverseGuideStep {
  msmrw_guidestepid?: string
  msmrw_stepnumber: number
  msmrw_name: string
  msmrw_instructiontext: string
  msmrw_extendeddescription?: string
  msmrw_warningtext?: string
  msmrw_mediatype?: number
  msmrw_mediaref?: string
  msmrw_toolsrequired?: string
  msmrw_validationchecklist?: string
  msmrw_anchortype?: number
  msmrw_anchorid?: string
  "_msmrw_guideid_value"?: string
}

// =============================================================================
// Dynamics 365 Guides Service
// =============================================================================

export class Dynamics365GuidesService {
  private config: D365GuidesConfig | null = null
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  private client: AxiosInstance | null = null

  /**
   * Initialize the service with configuration
   */
  async initialize(config: D365GuidesConfig): Promise<void> {
    this.config = config
    await this.refreshToken()
    
    this.client = axios.create({
      baseURL: `${config.environmentUrl}/api/data/v9.2`,
      headers: {
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Prefer': 'return=representation'
      }
    })

    // Add auth interceptor
    this.client.interceptors.request.use(async (requestConfig) => {
      await this.ensureValidToken()
      requestConfig.headers.Authorization = `Bearer ${this.accessToken}`
      return requestConfig
    })

    logger.info('Dynamics 365 Guides service initialized', {
      environmentUrl: config.environmentUrl
    })
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.config) {
      throw new Error('Service not initialized')
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
    
    const params = new URLSearchParams()
    params.append('client_id', this.config.clientId)
    params.append('client_secret', this.config.clientSecret)
    params.append('scope', `${this.config.environmentUrl}/.default`)
    params.append('grant_type', 'client_credentials')

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      this.accessToken = response.data.access_token
      // Token typically expires in 1 hour, refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000)
      
      logger.debug('D365 Guides token refreshed', {
        expiresIn: response.data.expires_in
      })
    } catch (error: any) {
      logger.error('Failed to refresh D365 Guides token', {
        error: error.response?.data || error.message
      })
      throw new Error(`Authentication failed: ${error.response?.data?.error_description || error.message}`)
    }
  }

  /**
   * Ensure we have a valid token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.refreshToken()
    }
  }

  /**
   * Test connection to Dynamics 365
   */
  async testConnection(): Promise<{ success: boolean; message: string; guidesCount?: number }> {
    try {
      if (!this.client) {
        throw new Error('Service not initialized')
      }

      const response = await this.client.get('/msmrw_guides?$top=1&$count=true')
      
      return {
        success: true,
        message: 'Connection successful',
        guidesCount: response.data['@odata.count'] || 0
      }
    } catch (error: any) {
      logger.error('D365 Guides connection test failed', { error: error.message })
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message
      }
    }
  }

  // ===========================================================================
  // Guide CRUD Operations
  // ===========================================================================

  /**
   * Create a new guide in Dynamics 365
   */
  async createGuide(guide: Guide): Promise<string> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    const dataverseGuide: DataverseGuide = {
      msmrw_name: guide.name,
      msmrw_description: guide.description,
      adpa_sourcedocumentid: guide.sourceDocumentId,
      adpa_assetref: guide.assetRef,
      adpa_syncstatus: 1  // 1 = Synced
    }

    try {
      const response = await this.client.post('/msmrw_guides', dataverseGuide)
      
      // Extract guide ID from response headers or body
      const guideId = response.data.msmrw_guideid || 
        response.headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1]

      if (!guideId) {
        throw new Error('Failed to get guide ID from response')
      }

      logger.info('Guide created in D365', { guideId, name: guide.name })

      // Create steps if provided
      if (guide.steps && guide.steps.length > 0) {
        for (const step of guide.steps) {
          await this.createGuideStep(guideId, step)
        }
      }

      return guideId
    } catch (error: any) {
      logger.error('Failed to create guide', { 
        error: error.response?.data || error.message,
        guideName: guide.name 
      })
      throw error
    }
  }

  /**
   * Create a step within a guide
   */
  async createGuideStep(guideId: string, step: GuideStep): Promise<string> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    const dataverseStep: DataverseGuideStep = {
      msmrw_stepnumber: step.stepNumber,
      msmrw_name: step.name,
      msmrw_instructiontext: this.truncateInstruction(step.instructionText),
      msmrw_extendeddescription: step.extendedDescription,
      msmrw_warningtext: step.warningText,
      msmrw_toolsrequired: step.toolsRequired,
      msmrw_validationchecklist: step.validationChecklist?.join('\n'),
      msmrw_mediatype: this.mapMediaType(step.mediaType),
      msmrw_mediaref: step.mediaRef,
      msmrw_anchortype: this.mapAnchorType(step.anchorType),
      msmrw_anchorid: step.anchorId,
      "_msmrw_guideid_value": guideId
    }

    // Use deep insert to associate with guide
    const response = await this.client.post('/msmrw_guidesteps', {
      ...dataverseStep,
      "msmrw_GuideId@odata.bind": `/msmrw_guides(${guideId})`
    })

    const stepId = response.data.msmrw_guidestepid ||
      response.headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1]

    logger.debug('Guide step created', { guideId, stepId, stepNumber: step.stepNumber })
    
    return stepId
  }

  /**
   * Update an existing guide
   */
  async updateGuide(guideId: string, guide: Partial<Guide>): Promise<void> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    const updates: Partial<DataverseGuide> = {}
    
    if (guide.name) updates.msmrw_name = guide.name
    if (guide.description !== undefined) updates.msmrw_description = guide.description
    if (guide.sourceDocumentId) updates.adpa_sourcedocumentid = guide.sourceDocumentId
    if (guide.assetRef) updates.adpa_assetref = guide.assetRef

    await this.client.patch(`/msmrw_guides(${guideId})`, updates)
    
    logger.info('Guide updated', { guideId })
  }

  /**
   * Delete a guide
   */
  async deleteGuide(guideId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    await this.client.delete(`/msmrw_guides(${guideId})`)
    logger.info('Guide deleted', { guideId })
  }

  /**
   * Get guide by ID
   */
  async getGuide(guideId: string): Promise<Guide | null> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    try {
      const response = await this.client.get(
        `/msmrw_guides(${guideId})?$expand=msmrw_msmrw_guide_msmrw_guidestep_GuideId`
      )
      
      return this.mapDataverseGuideToGuide(response.data)
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Find guide by source document ID
   */
  async findGuideBySourceDocument(documentId: string): Promise<Guide | null> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    try {
      const response = await this.client.get(
        `/msmrw_guides?$filter=adpa_sourcedocumentid eq '${documentId}'&$top=1`
      )

      if (response.data.value && response.data.value.length > 0) {
        return this.mapDataverseGuideToGuide(response.data.value[0])
      }
      
      return null
    } catch (error: any) {
      logger.error('Failed to find guide by source document', { documentId, error: error.message })
      throw error
    }
  }

  /**
   * List all guides with optional filtering
   */
  async listGuides(options?: {
    search?: string
    status?: 'draft' | 'published' | 'archived'
    limit?: number
    offset?: number
  }): Promise<{ guides: Guide[]; total: number }> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    let filter = ''
    const filters: string[] = []

    if (options?.search) {
      filters.push(`contains(msmrw_name, '${options.search}')`)
    }

    if (options?.status) {
      const statusCode = options.status === 'draft' ? 0 : options.status === 'published' ? 1 : 2
      filters.push(`statecode eq ${statusCode}`)
    }

    if (filters.length > 0) {
      filter = `$filter=${filters.join(' and ')}`
    }

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const response = await this.client.get(
      `/msmrw_guides?${filter}&$top=${limit}&$skip=${offset}&$count=true&$orderby=modifiedon desc`
    )

    return {
      guides: response.data.value.map((g: DataverseGuide) => this.mapDataverseGuideToGuide(g)),
      total: response.data['@odata.count'] || response.data.value.length
    }
  }

  // ===========================================================================
  // Document-to-Guide Transformation
  // ===========================================================================

  /**
   * Transform an ADPA document into a D365 Guide
   */
  transformDocumentToGuide(document: {
    id: string
    title: string
    description?: string
    summary?: string
    asset_ref?: string
    sections: Array<{
      id: string
      title: string
      content: string
      warnings?: string[]
      tools_required?: string[]
      validation?: string[]
      media?: Array<{ type: string; ref: string }>
      anchor_point?: string
      telemetry_check?: TelemetryCheck
    }>
  }): Guide {
    return {
      name: document.title,
      description: document.description || document.summary,
      sourceDocumentId: document.id,
      assetRef: document.asset_ref,
      steps: document.sections.map((section, index) => ({
        stepNumber: index + 1,
        name: section.title,
        instructionText: section.content,
        warningText: section.warnings?.join('; '),
        toolsRequired: section.tools_required?.join(', '),
        validationChecklist: section.validation,
        mediaType: this.inferMediaType(section.media?.[0]?.type),
        mediaRef: section.media?.[0]?.ref,
        anchorType: section.anchor_point ? 'qr' : 'none',
        anchorId: section.anchor_point,
        telemetryCheck: section.telemetry_check
      }))
    }
  }

  /**
   * Sync a document to D365 Guides (create or update)
   */
  async syncFromDocument(document: {
    id: string
    title: string
    description?: string
    summary?: string
    asset_ref?: string
    version?: string
    sections: Array<{
      id: string
      title: string
      content: string
      warnings?: string[]
      tools_required?: string[]
      validation?: string[]
      media?: Array<{ type: string; ref: string }>
      anchor_point?: string
      telemetry_check?: TelemetryCheck
    }>
  }): Promise<{ guideId: string; created: boolean }> {
    // Transform document to guide
    const guide = this.transformDocumentToGuide(document)

    // Check if guide already exists
    const existingGuide = await this.findGuideBySourceDocument(document.id)

    if (existingGuide && existingGuide.id) {
      // Update existing guide
      await this.updateGuide(existingGuide.id, guide)
      await this.syncGuideSteps(existingGuide.id, guide.steps || [])
      
      // Update sync version
      await this.client?.patch(`/msmrw_guides(${existingGuide.id})`, {
        adpa_lastsyncversion: document.version,
        adpa_syncstatus: 1  // Synced
      })

      logger.info('Guide synced (updated)', { 
        guideId: existingGuide.id, 
        documentId: document.id 
      })
      
      return { guideId: existingGuide.id, created: false }
    } else {
      // Create new guide
      const guideId = await this.createGuide(guide)
      
      // Set sync version
      await this.client?.patch(`/msmrw_guides(${guideId})`, {
        adpa_lastsyncversion: document.version,
        adpa_syncstatus: 1
      })

      logger.info('Guide synced (created)', { guideId, documentId: document.id })
      
      return { guideId, created: true }
    }
  }

  /**
   * Sync guide steps (delete and recreate for simplicity)
   */
  private async syncGuideSteps(guideId: string, steps: GuideStep[]): Promise<void> {
    if (!this.client) return

    // Get existing steps
    const response = await this.client.get(
      `/msmrw_guidesteps?$filter=_msmrw_guideid_value eq '${guideId}'`
    )

    // Delete existing steps
    for (const existingStep of response.data.value) {
      await this.client.delete(`/msmrw_guidesteps(${existingStep.msmrw_guidestepid})`)
    }

    // Create new steps
    for (const step of steps) {
      await this.createGuideStep(guideId, step)
    }
  }

  /**
   * Get sync status for a document
   */
  async getSyncStatus(documentId: string): Promise<SyncStatus> {
    const guide = await this.findGuideBySourceDocument(documentId)

    if (!guide) {
      return {
        documentId,
        synced: false,
        syncStatus: 'not_synced'
      }
    }

    const guideUrl = this.config?.guidesAppId 
      ? `${this.config.environmentUrl}/main.aspx?appid=${this.config.guidesAppId}&pagetype=entityrecord&etn=msmrw_guide&id=${guide.id}`
      : undefined

    return {
      documentId,
      synced: true,
      guideId: guide.id,
      guideUrl,
      lastSyncedAt: guide.modifiedOn,
      syncStatus: 'synced',  // Could be enhanced with version comparison
      version: (guide as any).adpa_lastsyncversion
    }
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  /**
   * Get guide usage analytics
   */
  async getGuideAnalytics(guideId: string): Promise<GuideAnalytics | null> {
    if (!this.client) {
      throw new Error('Service not initialized')
    }

    try {
      // Query analytics data from Dataverse
      const response = await this.client.get(
        `/msmrw_guideanalyticses?$filter=_msmrw_guideid_value eq '${guideId}'`
      )

      if (!response.data.value || response.data.value.length === 0) {
        return null
      }

      // Aggregate analytics
      const analytics = response.data.value
      return {
        guideId,
        totalCompletions: analytics.reduce((sum: number, a: any) => sum + (a.msmrw_completioncount || 0), 0),
        averageCompletionTime: analytics.reduce((sum: number, a: any) => sum + (a.msmrw_averagetime || 0), 0) / analytics.length,
        stepAnalytics: []  // Would need additional queries
      }
    } catch (error: any) {
      logger.error('Failed to get guide analytics', { guideId, error: error.message })
      return null
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Truncate instruction text to D365 Guides limit (100 chars)
   */
  private truncateInstruction(text: string): string {
    if (!text) return ''
    if (text.length <= 100) return text
    return text.substring(0, 97) + '...'
  }

  /**
   * Map media type string to Dataverse choice value
   */
  private mapMediaType(type?: string): number {
    switch (type?.toLowerCase()) {
      case 'image': return 1
      case 'video': return 2
      case '3d': return 3
      default: return 0
    }
  }

  /**
   * Map anchor type string to Dataverse choice value
   */
  private mapAnchorType(type?: string): number {
    switch (type?.toLowerCase()) {
      case 'qr': return 1
      case '3d_model': return 2
      case 'spatial': return 3
      default: return 0
    }
  }

  /**
   * Infer media type from file extension or mime type
   */
  private inferMediaType(type?: string): 'none' | 'image' | 'video' | '3d' {
    if (!type) return 'none'
    const lower = type.toLowerCase()
    if (lower.includes('image') || lower.includes('png') || lower.includes('jpg')) return 'image'
    if (lower.includes('video') || lower.includes('mp4')) return 'video'
    if (lower.includes('3d') || lower.includes('glb') || lower.includes('gltf')) return '3d'
    return 'none'
  }

  /**
   * Map Dataverse guide entity to Guide interface
   */
  private mapDataverseGuideToGuide(dv: DataverseGuide & { 
    msmrw_msmrw_guide_msmrw_guidestep_GuideId?: DataverseGuideStep[] 
  }): Guide {
    return {
      id: dv.msmrw_guideid,
      name: dv.msmrw_name,
      description: dv.msmrw_description,
      sourceDocumentId: dv.adpa_sourcedocumentid,
      assetRef: dv.adpa_assetref,
      status: dv.statecode === 0 ? 'draft' : dv.statecode === 1 ? 'published' : 'archived',
      createdOn: dv.createdon,
      modifiedOn: dv.modifiedon,
      steps: dv.msmrw_msmrw_guide_msmrw_guidestep_GuideId?.map(s => ({
        id: s.msmrw_guidestepid,
        stepNumber: s.msmrw_stepnumber,
        name: s.msmrw_name,
        instructionText: s.msmrw_instructiontext,
        extendedDescription: s.msmrw_extendeddescription,
        warningText: s.msmrw_warningtext,
        toolsRequired: s.msmrw_toolsrequired,
        validationChecklist: s.msmrw_validationchecklist?.split('\n').filter(Boolean),
        mediaType: ['none', 'image', 'video', '3d'][s.msmrw_mediatype || 0] as any,
        mediaRef: s.msmrw_mediaref,
        anchorType: ['none', 'qr', '3d_model', 'spatial'][s.msmrw_anchortype || 0] as any,
        anchorId: s.msmrw_anchorid
      }))
    }
  }
}

// Export singleton instance
export const dynamics365GuidesService = new Dynamics365GuidesService()
