/**
 * Microsoft Clarity Tracking Examples
 * Demonstrates how to use the Clarity tracking utilities in ADPA components
 */

'use client'

import { useEffect } from 'react'
import { 
  trackDocumentUpload, 
  trackEntityExtraction, 
  trackEntityHighlighting,
  trackTemplateGeneration,
  trackAIProviderUsage,
  trackFeatureUsage,
  trackPageEngagement,
  trackQualityAudit,
  trackError
} from '@/lib/analytics/clarity'

// Example 1: Document Upload Component
export function DocumentUploadComponent() {
  const handleDocumentUpload = async (file: File) => {
    try {
      // Track upload start
      trackDocumentUpload('started', file.type)
      
      // Simulate upload process
      const result = await uploadDocument(file)
      
      // Track successful upload
      trackDocumentUpload('success', file.type)
      
    } catch (error) {
      // Track failed upload
      trackDocumentUpload('failed', file.type)
      trackError('document_upload', 'upload_failed', false)
    }
  }
  
  return (
    <div>
      <h3>Document Upload</h3>
      <input type="file" onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])} />
    </div>
  )
}

// Example 2: Entity Extraction Component
export function EntityExtractionComponent({ documentId }: { documentId: string }) {
  useEffect(() => {
    const extractEntities = async () => {
      try {
        // Track extraction start
        trackEntityExtraction('activities', 0)
        
        // Simulate entity extraction
        const entities = await extractEntitiesFromDocument(documentId)
        
        // Track successful extraction with count
        trackEntityExtraction('activities', entities.length)
        
      } catch (error) {
        trackError('entity_extraction', 'extraction_failed', false)
      }
    }
    
    if (documentId) {
      extractEntities()
    }
  }, [documentId])
  
  return <div>Entity extraction in progress...</div>
}

// Example 3: Entity Highlighting Component
export function EntityHighlightingComponent({ entity }: { entity: any }) {
  const handleViewSourceDocument = () => {
    // Track when user views source document
    trackEntityHighlighting('viewed')
    
    // Navigate to document viewer
    window.location.href = `/projects/${entity.project_id}/documents/${entity.source_document_id}/view`
  }
  
  const handleEntityClick = () => {
    // Track entity interaction
    trackEntityHighlighting('clicked')
    trackFeatureUsage('entity_details', 'viewed', {
      entity_type: entity.type,
      entity_id: entity.id
    })
  }
  
  return (
    <div>
      <h3>{entity.name}</h3>
      <button onClick={handleViewSourceDocument}>View Source Document</button>
      <button onClick={handleEntityClick}>View Details</button>
    </div>
  )
}

// Example 4: Template Generation Component
export function TemplateGenerationComponent() {
  const handleGenerateTemplate = async (templateType: string) => {
    try {
      const startTime = Date.now()
      
      // Track template generation start
      trackTemplateGeneration(templateType, 'started')
      
      // Simulate AI template generation
      const result = await generateTemplate(templateType)
      
      const duration = Date.now() - startTime
      
      // Track successful generation
      trackTemplateGeneration(templateType, 'success', result.tokenCount)
      
      // Track AI provider usage
      trackAIProviderUsage(result.provider, result.model, result.tokenCount)
      
    } catch (error) {
      trackTemplateGeneration(templateType, 'failed')
      trackError('template_generation', 'generation_failed', false)
    }
  }
  
  return (
    <div>
      <button onClick={() => handleGenerateTemplate('user_personas')}>Generate User Personas</button>
      <button onClick={() => handleGenerateTemplate('business_case')}>Generate Business Case</button>
    </div>
  )
}

// Example 5: Page Engagement Tracking
export function PageEngagementTracker({ pageName }: { pageName: string }) {
  useEffect(() => {
    const startTime = Date.now()
    let interactionCount = 0
    
    const handleInteraction = () => {
      interactionCount++
    }
    
    // Track user interactions
    document.addEventListener('click', handleInteraction)
    document.addEventListener('scroll', handleInteraction)
    
    return () => {
      // Calculate engagement when page unloads
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      trackPageEngagement(pageName, timeSpent, interactionCount)
      
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('scroll', handleInteraction)
    }
  }, [pageName])
  
  return null
}

// Example 6: Quality Audit Component
export function QualityAuditComponent({ documentId }: { documentId: string }) {
  const handleQualityAudit = async () => {
    try {
      // Track audit start
      trackQualityAudit(documentId, null, null)
      
      // Simulate quality audit
      const auditResult = await performQualityAudit(documentId)
      
      // Track audit results
      trackQualityAudit(documentId, auditResult.score, auditResult.grade)
      
    } catch (error) {
      trackQualityAudit(documentId, null, null)
      trackError('quality_audit', 'audit_failed', false)
    }
  }
  
  return (
    <div>
      <button onClick={handleQualityAudit}>Run Quality Audit</button>
    </div>
  )
}

// Example 7: Custom Feature Tracking
export function CustomFeatureComponent() {
  const handleCustomAction = (action: string, metadata?: Record<string, string>) => {
    // Track custom feature usage
    trackFeatureUsage('custom_feature', action, metadata)
  }
  
  return (
    <div>
      <button onClick={() => handleCustomAction('button_click', { button_id: 'primary' })}>
        Primary Action
      </button>
      <button onClick={() => handleCustomAction('button_click', { button_id: 'secondary' })}>
        Secondary Action
      </button>
    </div>
  )
}

// Mock functions for demonstration
async function uploadDocument(file: File): Promise<{ success: boolean }> {
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
}

async function extractEntitiesFromDocument(documentId: string): Promise<Array<{ id: string }>> {
  return new Promise(resolve => setTimeout(() => resolve(Array.from({ length: 15 }, (_, i) => ({ id: `entity-${i}` }))), 1500))
}

async function generateTemplate(templateType: string): Promise<{ 
  provider: string; 
  model: string; 
  tokenCount: number 
}> {
  return new Promise(resolve => setTimeout(() => resolve({
    provider: 'openai',
    model: 'gpt-4',
    tokenCount: 2500
  }), 2000))
}

async function performQualityAudit(documentId: string): Promise<{ 
  score: number; 
  grade: string 
}> {
  return new Promise(resolve => setTimeout(() => resolve({
    score: 85,
    grade: 'A'
  }), 3000))
}

// Example 8: Global Error Tracking
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError('javascript_error', event.message, false)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError('unhandled_promise_rejection', event.reason, false)
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  return <>{children}</>
}

// Example 9: Performance Tracking
export function PerformanceTracker() {
  useEffect(() => {
    // Track page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart
        
        import('@/lib/analytics/clarity').then(({ trackPerformance }) => {
          trackPerformance('page_load_time', loadTime, 'ms')
        })
      })
    }
  }, [])
  
  return null
}

// Example usage in a page component
export function ExamplePage() {
  return (
    <ErrorBoundary>
      <PerformanceTracker />
      <PageEngagementTracker pageName="/example" />
      
      <div>
        <h1>ADPA Analytics Examples</h1>
        
        <DocumentUploadComponent />
        <EntityExtractionComponent documentId="doc-123" />
        <EntityHighlightingComponent entity={{ 
          id: 'entity-1', 
          name: 'Sample Entity', 
          type: 'activity',
          project_id: 'proj-123',
          source_document_id: 'doc-123'
        }} />
        <TemplateGenerationComponent />
        <QualityAuditComponent documentId="doc-123" />
        <CustomFeatureComponent />
      </div>
    </ErrorBoundary>
  )
}
