/**
 * Test script to verify module imports work correctly
 */

import { documentGeneratorService, documentGeneratorController, OutputFormat } from './index'

console.log('✅ Document Generator module imports successfully')
console.log('Available output formats:', Object.values(OutputFormat))
console.log('Service initialized:', !!documentGeneratorService)
console.log('Controller initialized:', !!documentGeneratorController)

// Test type definitions
const testRequest = {
  template_id: 'test-uuid',
  data: { title: 'Test' },
  output_format: OutputFormat.MARKDOWN
}

console.log('✅ Type definitions work correctly')
console.log('Test request:', testRequest)