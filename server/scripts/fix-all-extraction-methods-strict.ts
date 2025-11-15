/**
 * Script to update all extraction methods to use strict validation
 * This ensures entities without valid source_document_id are rejected
 */

import * as fs from 'fs'
import * as path from 'path'

const filePath = path.join(__dirname, '../src/services/projectDataExtractionService.ts')
let content = fs.readFileSync(filePath, 'utf-8')

// Pattern to replace: forEach with resolveSourceDocumentIdStrict that doesn't check return value
const patterns = [
  {
    // Resources
    search: /\/\/ Resolve source_document_id for each resource \(with fallback\)\s+resources\.forEach\(\(resource: any\) => \{\s+this\.resolveSourceDocumentIdStrict\(\s+resource,\s+documentMap,\s+documents,\s+'RESOURCES',\s+resource\.name \|\| 'Unnamed Resource'\s+\)\s+\}\)\s+logger\.info\(`\[EXTRACTION-RESOURCES\] Extracted \$\{resources\.length\} resources`\)\s+return resources/gs,
    replace: `// Resolve source_document_id for each resource (STRICT: reject if missing)
      const validResources: Resource[] = []
      let rejectedCount = 0
      
      resources.forEach((resource: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          resource,
          documentMap,
          documents,
          'RESOURCES',
          resource.name || 'Unnamed Resource'
        )
        
        if (isValid) {
          validResources.push(resource)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(\`[EXTRACTION-RESOURCES] REJECTED \${rejectedCount} resources without valid source_document_id (out of \${resources.length} total)\`)
      }
      
      logger.info(\`[EXTRACTION-RESOURCES] Extracted \${validResources.length} resources with valid source_document_id (\${rejectedCount} rejected)\`)

      return validResources`
  }
]

console.log('This script is a reference. Manual updates are recommended for precision.')
console.log('All methods need to check the return value of resolveSourceDocumentIdStrict and filter accordingly.')

