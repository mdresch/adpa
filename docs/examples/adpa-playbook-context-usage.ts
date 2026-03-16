/**
 * Example Usage of ADPA Playbook Context
 * Demonstrates how to retrieve and use semantic context from the ADPA Playbook project
 */

import { 
  getAdpaPlaybookContext, 
  getAdpaPlaybookEntities,
  ADPA_PLAYBOOK_REQUIREMENTS,
  ADPA_PLAYBOOK_RISKS,
  ADPA_PLAYBOOK_STAKEHOLDERS 
} from '../adpa-playbook-context-retrieval'

// Example 1: Get comprehensive project context
async function demonstrateFullContext() {
  console.log('=== ADPA Playbook Project Full Context ===\n')
  
  const context = await getAdpaPlaybookContext()
  console.log(context)
  
  return context
}

// Example 2: Get specific entity types
async function demonstrateSpecificEntities() {
  console.log('\n=== Specific Entity Types ===\n')
  
  // Get only requirements from the playbook project
  const requirements = await getAdpaPlaybookEntities(['Requirement'])
  console.log('REQUIREMENTS:')
  console.log(requirements)
  
  // Get only risks
  const risks = await getAdpaPlaybookEntities(['Risk'])
  console.log('\nRISKS:')
  console.log(risks)
  
  // Get stakeholders
  const stakeholders = await getAdpaPlaybookEntities(['Stakeholder'])
  console.log('\nSTAKEHOLDERS:')
  console.log(stakeholders)
}

// Example 3: Use context for document generation
async function generateContextualDocument() {
  console.log('\n=== Contextual Document Generation ===\n')
  
  // Get project context
  const projectContext = await getAdpaPlaybookContext()
  
  // Get specific requirements
  const requirements = await ADPA_PLAYBOOK_REQUIREMENTS()
  
  // Generate a contextual document
  const contextualDoc = `
# Project Status Report

## Project Context
${projectContext}

## Key Requirements Status
${requirements}

## Recommendations
Based on the ADPA Playbook Development project context and requirements, the following recommendations are made:

1. **Operational Consistency**: The playbook should standardize workflows across all ADPA projects
2. **Governance Alignment**: Ensure formalized decision rights and cadence
3. **Scalability**: Design for future enhancement integration (PMMA)
4. **Stakeholder Engagement**: Maintain the 17+ identified stakeholders with appropriate engagement strategies

## Next Steps
- Complete playbook development by June 2026
- Conduct pilot testing with project teams
- Achieve 90% positive feedback target
- Implement governance framework across all projects
`
  
  console.log(contextualDoc)
  return contextualDoc
}

// Example 4: Cross-project analysis
async function crossProjectAnalysis() {
  console.log('\n=== Cross-Project Analysis ===\n')
  
  // Get ADPA Playbook context
  const playbookContext = await getAdpaPlaybookContext()
  
  // This could be extended to compare with other projects
  const analysis = `
# Cross-Project Analysis: ADPA Playbook Development

## Project Summary
${playbookContext}

## Integration Opportunities
1. **GKG Semantic Layer**: Leverage the Governance Knowledge Graph for cross-project insights
2. **Standardized Templates**: Use playbook templates across all ADPA projects
3. **Shared Stakeholders**: Identify common stakeholders across projects for coordinated engagement
4. **Risk Patterns**: Analyze risk patterns across projects for proactive mitigation

## Recommendations for Other Projects
- Adopt the playbook development methodology
- Implement similar stakeholder engagement strategies
- Use the PMBOK 7th Edition framework as demonstrated
- Leverage the GKG for semantic context management
`
  
  console.log(analysis)
  return analysis
}

// Main execution function
async function main() {
  try {
    await demonstrateFullContext()
    await demonstrateSpecificEntities()
    await generateContextualDocument()
    await crossProjectAnalysis()
    
    console.log('\n=== Context Retrieval Complete ===')
  } catch (error) {
    console.error('Error in context retrieval demonstration:', error)
  }
}

// Export for use in other modules
export {
  demonstrateFullContext,
  demonstrateSpecificEntities,
  generateContextualDocument,
  crossProjectAnalysis
}

// Run if executed directly
if (require.main === module) {
  main()
}
