/**
 * Custom Jest Matchers for E2E Tests
 * Enhanced assertions for pipeline testing
 */

import { expect } from '@jest/globals'

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDocument(): R
      toHaveValidStages(expectedStages: number): R
      toMeetQualityThreshold(threshold: number): R
      toCompleteWithinTime(maxTimeMs: number): R
      toHaveValidFormat(format: string): R
      toHaveValidMetadata(): R
      toBeValidPipelineResult(): R
    }
  }
}

// Custom matcher for valid document structure
expect.extend({
  toBeValidDocument(received: any) {
    const pass = received && 
      typeof received === 'object' &&
      received.content &&
      typeof received.content === 'string' &&
      received.content.length > 0 &&
      received.metadata &&
      typeof received.metadata === 'object'

    return {
      message: () => pass
        ? `Expected document not to be valid`
        : `Expected document to be valid, but received: ${JSON.stringify(received)}`,
      pass
    }
  }
})

// Custom matcher for valid stage count
expect.extend({
  toHaveValidStages(received: any, expectedStages: number) {
    const pass = received &&
      Array.isArray(received.stages) &&
      received.stages.length === expectedStages &&
      received.stages.every((stage: any) => 
        stage.stage_type && 
        stage.status && 
        stage.processing_time !== undefined
      )

    return {
      message: () => pass
        ? `Expected not to have ${expectedStages} valid stages`
        : `Expected ${expectedStages} valid stages, but got ${received?.stages?.length || 0}`,
      pass
    }
  }
})

// Custom matcher for quality threshold
expect.extend({
  toMeetQualityThreshold(received: any, threshold: number) {
    const pass = received &&
      typeof received.quality_score === 'number' &&
      received.quality_score >= threshold

    return {
      message: () => pass
        ? `Expected quality score not to meet threshold ${threshold}`
        : `Expected quality score to meet threshold ${threshold}, but got ${received?.quality_score}`,
      pass
    }
  }
})

// Custom matcher for completion time
expect.extend({
  toCompleteWithinTime(received: any, maxTimeMs: number) {
    const pass = received &&
      typeof received.processing_time === 'number' &&
      received.processing_time <= maxTimeMs

    return {
      message: () => pass
        ? `Expected not to complete within ${maxTimeMs}ms`
        : `Expected to complete within ${maxTimeMs}ms, but took ${received?.processing_time}ms`,
      pass
    }
  }
})

// Custom matcher for valid format
expect.extend({
  toHaveValidFormat(received: any, format: string) {
    const pass = received &&
      received.generated_formats &&
      Array.isArray(received.generated_formats) &&
      received.generated_formats.some((f: any) => f.format === format && f.content)

    return {
      message: () => pass
        ? `Expected not to have valid ${format} format`
        : `Expected valid ${format} format, but received: ${JSON.stringify(received?.generated_formats)}`,
      pass
    }
  }
})

// Custom matcher for valid metadata
expect.extend({
  toHaveValidMetadata(received: any) {
    const pass = received &&
      received.metadata &&
      typeof received.metadata === 'object' &&
      received.metadata.processing_time !== undefined &&
      received.metadata.stages_count !== undefined &&
      received.metadata.quality_score !== undefined

    return {
      message: () => pass
        ? `Expected not to have valid metadata`
        : `Expected valid metadata, but received: ${JSON.stringify(received?.metadata)}`,
      pass
    }
  }
})

// Custom matcher for valid pipeline result
expect.extend({
  toBeValidPipelineResult(received: any) {
    const pass = received &&
      typeof received === 'object' &&
      received.request_id &&
      received.status &&
      received.status.status &&
      Array.isArray(received.stages) &&
      received.stages.length === 6 &&
      received.final_document &&
      received.quality_report &&
      received.processing_metrics &&
      received.metadata

    return {
      message: () => pass
        ? `Expected not to be a valid pipeline result`
        : `Expected valid pipeline result, but received: ${JSON.stringify({
          hasRequestId: !!received?.request_id,
          hasStatus: !!received?.status,
          stagesCount: received?.stages?.length || 0,
          hasFinalDocument: !!received?.final_document,
          hasQualityReport: !!received?.quality_report,
          hasProcessingMetrics: !!received?.processing_metrics,
          hasMetadata: !!received?.metadata
        })}`,
      pass
    }
  }
})

// Export the extended expect
export { expect }
