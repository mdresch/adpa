import * as fs from 'fs'
import * as path from 'path'

const filePath = path.join(__dirname, '../src/services/projectDataExtractionService.ts')
let content = fs.readFileSync(filePath, 'utf-8')

const saveMethods = [
  'saveRequirements',
  'saveRisks',
  'saveMilestones',
  'saveConstraints',
  'saveSuccessCriteria',
  'saveBestPractices',
  'savePhases',
  'saveResources',
  'saveQualityStandards',
  'saveDeliverables',
  'saveScopeItems',
  'saveActivities'
]

const entityParamNames: Record<string, string> = {
  saveRequirements: 'requirements',
  saveRisks: 'risks',
  saveMilestones: 'milestones',
  saveConstraints: 'constraints',
  saveSuccessCriteria: 'success_criteria',
  saveBestPractices: 'best_practices',
  savePhases: 'phases',
  saveResources: 'resources',
  saveQualityStandards: 'quality_standards',
  saveDeliverables: 'deliverables',
  saveScopeItems: 'scope_items',
  saveActivities: 'activities'
}

saveMethods.forEach(method => {
  const paramName = entityParamNames[method]
  
  // Find the method and add empty check after the opening brace
  const pattern = new RegExp(
    `(private async ${method}\\([^)]+\\): Promise<void> \\{)\\s+(const values: any\\[\\] = \\[\\])`,
    'g'
  )
  
  content = content.replace(
    pattern,
    `$1
    if (${paramName}.length === 0) {
      logger.info('[EXTRACTION] No ${paramName} to save, skipping')
      return
    }

    $2`
  )
})

fs.writeFileSync(filePath, content, 'utf-8')
console.log('✅ Added empty checks to all save methods')

