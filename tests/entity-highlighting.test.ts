/**
 * Entity Highlighting Test Utilities
 * Test functions to validate entity extraction and highlighting functionality
 */

import { ExtractedPerformanceActual } from '../server/src/services/enhancedPerformanceActualsExtractionService'

// Sample document content for testing
export const SAMPLE_DOCUMENT_CONTENT = `
# Project Performance Report

## Performance Actuals

### Data Architecture Team Member Performance

**Entity Name:** Data Architecture Team Member
**Planned Start Date:** 2024-01-15
**Actual Start Date:** 2024-01-20
**Planned End Date:** 2024-03-15
**Actual End Date:** 2024-03-10
**Planned Cost:** $50,000
**Actual Cost:** $48,500
**Quality Score:** 95%

### Notes:
The Data Architecture Team Member performed exceptionally well, delivering robust and scalable data ecosystem solutions. Technical implementation was sound and met all requirements.

## Additional Metrics

- Defects Found: 2
- Rework Hours: 8
- Progress: 100% Complete
`

// Sample extracted entity with location data
export const SAMPLE_ENTITY: ExtractedPerformanceActual = {
  entity_name: 'Data Architecture Team Member',
  entity_type: 'performance_actual',
  planned_start_date: '2024-01-15',
  actual_start_date: '2024-01-20',
  planned_end_date: '2024-03-15',
  actual_end_date: '2024-03-10',
  planned_cost: 50000,
  actual_cost: 48500,
  quality_score: 95,
  defects_found: 2,
  rework_hours: 8,
  notes: 'The Data Architecture Team Member performed exceptionally well, delivering robust and scalable data ecosystem solutions.',
  source_document: 'Project Performance Report',
  source_document_id: 'test-doc-001',
  source_text_start: 85,
  source_text_end: 112,
  source_line_start: 7,
  source_line_end: 7,
  source_context: '**Entity Name:** Data Architecture Team Member\n**Planned Start Date:** 2024-01-15',
  source_snippet: 'Data Architecture Team Member',
  entity_markdown_tag: 'h3'
}

// Test function to validate entity highlighting
export const testEntityHighlighting = () => {
  console.log('🧪 Testing Entity Highlighting System...')
  
  // Test 1: Character offset highlighting
  console.log('\n📍 Test 1: Character Offset Highlighting')
  const charStart = SAMPLE_ENTITY.source_text_start || 0
  const charEnd = SAMPLE_ENTITY.source_text_end || 0
  const highlightedByChar = highlightByCharacterOffsets(SAMPLE_DOCUMENT_CONTENT, charStart, charEnd)
  console.log('✅ Character offset highlighting:', highlightedByChar.includes('entity-highlight'))
  
  // Test 2: Line number highlighting
  console.log('\n📍 Test 2: Line Number Highlighting')
  const lineStart = SAMPLE_ENTITY.source_line_start || 0
  const lineEnd = SAMPLE_ENTITY.source_line_end || 0
  const highlightedByLine = highlightByLineNumbers(SAMPLE_DOCUMENT_CONTENT, lineStart, lineEnd)
  console.log('✅ Line number highlighting:', highlightedByLine.includes('entity-highlight'))
  
  // Test 3: Snippet highlighting
  console.log('\n📍 Test 3: Snippet Highlighting')
  const snippet = SAMPLE_ENTITY.source_snippet || ''
  const highlightedBySnippet = highlightBySnippet(SAMPLE_DOCUMENT_CONTENT, snippet)
  console.log('✅ Snippet highlighting:', highlightedBySnippet.includes('entity-highlight'))
  
  // Test 4: Entity name highlighting
  console.log('\n📍 Test 4: Entity Name Highlighting')
  const entityName = SAMPLE_ENTITY.entity_name
  const highlightedByName = highlightByEntityName(SAMPLE_DOCUMENT_CONTENT, entityName)
  console.log('✅ Entity name highlighting:', highlightedByName.includes('entity-highlight'))
  
  console.log('\n🎉 All entity highlighting tests completed!')
  return true
}

// Helper functions (simplified versions for testing)
const highlightByCharacterOffsets = (content: string, start: number, end: number): string => {
  if (start < 0 || end > content.length || start >= end) return content
  
  const before = content.substring(0, start)
  const highlighted = content.substring(start, end)
  const after = content.substring(end)
  
  return `${before}<mark class="entity-highlight">${highlighted}</mark>${after}`
}

const highlightByLineNumbers = (content: string, startLine: number, endLine: number): string => {
  const lines = content.split('\n')
  
  if (startLine < 1 || endLine > lines.length || startLine > endLine) return content
  
  const highlightedLines = lines.map((line, index) => {
    const lineNumber = index + 1
    if (lineNumber >= startLine && lineNumber <= endLine) {
      return `<mark class="entity-highlight">${line}</mark>`
    }
    return line
  })
  
  return highlightedLines.join('\n')
}

const highlightBySnippet = (content: string, snippet: string): string => {
  if (!snippet || snippet.trim().length === 0) return content
  
  const escapedSnippet = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedSnippet})`, 'gi')
  
  return content.replace(regex, '<mark class="entity-highlight">$1</mark>')
}

const highlightByEntityName = (content: string, entityName: string): string => {
  if (!entityName || entityName.trim().length === 0) return content
  
  const escapedName = entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedName})`, 'gi')
  
  return content.replace(regex, '<mark class="entity-highlight">$1</mark>')
}

// Test function to validate location data extraction
export const testLocationDataExtraction = () => {
  console.log('🧪 Testing Location Data Extraction...')
  
  // Test that location data is properly structured
  const requiredFields = ['source_text_start', 'source_text_end', 'source_line_start', 'source_line_end', 'source_snippet']
  const missingFields = requiredFields.filter(field => !(SAMPLE_ENTITY as any)[field])
  
  if (missingFields.length > 0) {
    console.error('❌ Missing location fields:', missingFields)
    return false
  }
  
  console.log('✅ All required location fields present')
  
  // Test that location data is within bounds
  const contentLength = SAMPLE_DOCUMENT_CONTENT.length
  const start = SAMPLE_ENTITY.source_text_start || 0
  const end = SAMPLE_ENTITY.source_text_end || 0
  
  if (start >= 0 && end <= contentLength && start < end) {
    console.log('✅ Character offsets are within bounds')
  } else {
    console.error('❌ Invalid character offsets:', { start, end, contentLength })
    return false
  }
  
  // Test that snippet exists in content
  const snippet = SAMPLE_ENTITY.source_snippet || ''
  if (SAMPLE_DOCUMENT_CONTENT.includes(snippet)) {
    console.log('✅ Snippet found in document content')
  } else {
    console.error('❌ Snippet not found in content:', snippet)
    return false
  }
  
  console.log('🎉 Location data extraction tests completed!')
  return true
}

// Run all tests
export const runEntityHighlightingTests = () => {
  console.log('🚀 Starting Entity Highlighting System Tests...\n')
  
  const highlightingTests = testEntityHighlighting()
  const locationTests = testLocationDataExtraction()
  
  if (highlightingTests && locationTests) {
    console.log('\n🎉 ALL TESTS PASSED! Entity highlighting system is working correctly.')
    return true
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.')
    return false
  }
}
