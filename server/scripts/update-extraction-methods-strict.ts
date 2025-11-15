/**
 * Script to update all extraction methods to use strict source_document_id validation
 * This ensures entities without valid source_document_id are rejected
 * 
 * Run this script to update all remaining extraction methods:
 *   npx tsx server/scripts/update-extraction-methods-strict.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const filePath = path.join(__dirname, '../src/services/projectDataExtractionService.ts')
let content = fs.readFileSync(filePath, 'utf-8')

// Pattern to find and replace: resolveSourceDocumentIdWithFallback calls
const patterns = [
  // Phases
  {
    search: /\/\/ Resolve source_document_id for each phase \(with fallback\)\s+phases\.forEach\(\(phase: any\) => \{\s+this\.resolveSourceDocumentIdWithFallback\(\s+phase,\s+documentMap,\s+documents,\s+'PHASES',\s+phase\.name \|\| 'Unnamed Phase'\s+\)\s+\}\)\s+logger\.info\(`\[EXTRACTION-PHASES\] Extracted \$\{phases\.length\} phases`\)\s+return phases/gs,
    replace: `// Resolve source_document_id for each phase (STRICT: reject if missing)
      const validPhases: Phase[] = []
      let rejectedCount = 0
      
      phases.forEach((phase: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          phase,
          documentMap,
          documents,
          'PHASES',
          phase.name || 'Unnamed Phase'
        )
        
        if (isValid) {
          validPhases.push(phase)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(\`[EXTRACTION-PHASES] REJECTED \${rejectedCount} phases without valid source_document_id (out of \${phases.length} total)\`)
      }
      
      logger.info(\`[EXTRACTION-PHASES] Extracted \${validPhases.length} phases with valid source_document_id (\${rejectedCount} rejected)\`)
      
      return validPhases`
  },
  // Add more patterns for other entity types...
]

console.log('Updating extraction methods to use strict validation...')
console.log('This script will be used as a reference. Manual updates are recommended for precision.')

