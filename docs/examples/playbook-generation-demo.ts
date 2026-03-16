/**
 * ADPA Playbook Generation Demo
 * Demonstrates how to generate standardized playbooks using the ADPA template system
 */

import { PlaybookTemplateGenerator, PLAYBOOK_TEMPLATE_CONFIGS } from '../server/src/modules/documentTemplates/playbookTemplate'

// Demo: Generate different types of ADPA Playbooks
async function demonstratePlaybookGeneration() {
  console.log('=== ADPA Playbook Generation Demo ===\n')

  // 1. Generate Program Playbook for Executive Audience
  console.log('1. ADPA Program Playbook - Executive Edition')
  const executivePlaybook = PlaybookTemplateGenerator.generatePlaybookTemplate(
    PLAYBOOK_TEMPLATE_CONFIGS.programExecutive
  )
  
  console.log(`   Template ID: ${executivePlaybook.id}`)
  console.log(`   Name: ${executivePlaybook.name}`)
  console.log(`   Sections: ${executivePlaybook.content.sections.length}`)
  console.log(`   GKG Context: ${executivePlaybook.gkg_context_strategy ? 'Enabled' : 'Disabled'}\n`)

  // 2. Generate Framework Playbook for Technical Audience
  console.log('2. ADPAF Framework Playbook - Technical Edition')
  const technicalPlaybook = PlaybookTemplateGenerator.generatePlaybookTemplate(
    PLAYBOOK_TEMPLATE_CONFIGS.frameworkTechnical
  )
  
  console.log(`   Template ID: ${technicalPlaybook.id}`)
  console.log(`   Name: ${technicalPlaybook.name}`)
  console.log(`   Complexity: Comprehensive`)
  console.log(`   GKG Units: ${technicalPlaybook.gkg_context_strategy?.maxUnits || 0}\n`)

  // 3. Generate Operational Playbook
  console.log('3. ADPA Operational Playbook - Standard Edition')
  const operationalPlaybook = PlaybookTemplateGenerator.generatePlaybookTemplate(
    PLAYBOOK_TEMPLATE_CONFIGS.operationalStandard
  )
  
  console.log(`   Template ID: ${operationalPlaybook.id}`)
  console.log(`   Name: ${operationalPlaybook.name}`)
  console.log(`   Target: Operational Teams\n`)

  // 4. Show standardized Go-to-Market paragraphs
  console.log('4. Standardized Go-to-Market Paragraphs:')
  const goToMarket = executivePlaybook.content.goToMarketParagraphs
  
  Object.entries(goToMarket).forEach(([key, paragraph]) => {
    console.log(`   ${key}:`)
    console.log(`   ${paragraph.substring(0, 100)}...\n`)
  })

  // 5. Show Table of Contents structure
  console.log('5. Standardized Table of Contents Structure:')
  const toc = executivePlaybook.content.tableOfContents
  
  console.log(`   Auto-generate: ${toc.autoGenerate}`)
  console.log(`   Max depth: ${toc.maxDepth}`)
  console.log(`   Sections: ${toc.sections.length}`)
  
  toc.sections.slice(0, 3).forEach((section: any) => {
    console.log(`   - ${section.title} (Level ${section.level})`)
    if (section.subSections && section.subSections.length > 0) {
      section.subSections.slice(0, 2).forEach((sub: any) => {
        console.log(`     - ${sub.title} (Level ${sub.level})`)
      })
    }
  })

  return {
    executivePlaybook,
    technicalPlaybook,
    operationalPlaybook
  }
}

// Demo: Show how templates integrate with GKG context
function demonstrateGkgIntegration() {
  console.log('\n=== GKG Integration Demo ===\n')

  const config = PLAYBOOK_TEMPLATE_CONFIGS.frameworkTechnical
  const template = PlaybookTemplateGenerator.generatePlaybookTemplate(config)

  console.log('GKG Context Strategy:')
  console.log(`  Profile: ${template.gkg_context_strategy?.profile}`)
  console.log(`  Scope: ${template.gkg_context_strategy?.scope}`)
  console.log(`  Max Units: ${template.gkg_context_strategy?.maxUnits}`)
  console.log(`  Max Documents: ${template.gkg_context_strategy?.maxDocuments}`)
  console.log(`  Traceable Only: ${template.gkg_context_strategy?.traceableOnly}`)
  console.log(`  Document Filter: ${template.gkg_context_strategy?.documentStatusFilter}`)

  console.log('\nTemplate Variables:')
  template.variables.forEach((variable: any) => {
    console.log(`  - ${variable.name} (${variable.type})${variable.required ? ' *required*' : ''}`)
    if (variable.description) {
      console.log(`    ${variable.description}`)
    }
  })

  return template
}

// Demo: Show template content structure
function demonstrateTemplateStructure() {
  console.log('\n=== Template Structure Demo ===\n')

  const config = {
    playbookType: 'program' as const,
    targetAudience: 'executive' as const,
    complexity: 'standard' as const,
    includeGkgContext: true
  }

  const template = PlaybookTemplateGenerator.generatePlaybookTemplate(config)

  console.log('Template Content Structure:')
  console.log(`  Sections: ${template.content.sections.length}`)
  console.log(`  Go-to-Market Paragraphs: ${Object.keys(template.content.goToMarketParagraphs).length}`)
  console.log(`  Template Length: ${template.content.template.length} characters`)

  console.log('\nStandard Sections:')
  template.content.sections.forEach((section: string, index: number) => {
    console.log(`  ${index + 1}. ${section}`)
  })

  console.log('\nHandlebars Template Preview:')
  const templatePreview = template.content.template.substring(0, 500)
  console.log(templatePreview + '...')

  return template
}

// Main execution
async function main() {
  try {
    const playbooks = await demonstratePlaybookGeneration()
    const gkgTemplate = demonstrateGkgIntegration()
    const structureTemplate = demonstrateTemplateStructure()

    console.log('\n=== Summary ===')
    console.log('✅ Generated 3 standardized playbook templates')
    console.log('✅ Demonstrated GKG semantic layer integration')
    console.log('✅ Showed standardized go-to-market paragraphs')
    console.log('✅ Displayed table of contents structure')
    console.log('✅ Illustrated template variable system')
    
    console.log('\n=== Next Steps ===')
    console.log('1. Save templates to database using documentTemplateService')
    console.log('2. Integrate with documentGeneratorService for PDF/DOCX output')
    console.log('3. Connect to GKG for real-time context injection')
    console.log('4. Create API endpoints for playbook generation')
    console.log('5. Build frontend interface for template selection')

  } catch (error) {
    console.error('Demo failed:', error)
  }
}

// Export for use in other modules
export {
  demonstratePlaybookGeneration,
  demonstrateGkgIntegration,
  demonstrateTemplateStructure
}

// Run if executed directly
if (require.main === module) {
  main()
}
