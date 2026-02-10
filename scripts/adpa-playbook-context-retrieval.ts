/**
 * ADPA Playbook Context Retrieval
 * Extracts semantic context from the ADPA Playbook Development project (840ee5df-aa50-4412-b513-5472fbe3ea9e)
 * using the GKG semantic layer
 */

import { getContextForStrategy } from './server/src/services/gkg/gkgContextService'

// ADPA Playbook Project Context Strategy
const ADPA_PLAYBOOK_CONTEXT_STRATEGY = {
  profile: 'governance_full' as const,
  scope: 'same_project' as const,
  maxUnits: 100,
  maxDocuments: 20,
  traceableOnly: true,
  documentStatusFilter: 'approved_published_only' as const,
}

/**
 * Retrieve comprehensive context from ADPA Playbook project
 */
export async function getAdpaPlaybookContext(): Promise<string> {
  const projectId = '840ee5df-aa50-4412-b513-5472fbe3ea9e'
  
  try {
    const context = await getContextForStrategy(projectId, ADPA_PLAYBOOK_CONTEXT_STRATEGY)
    
    if (context.unitsCount === 0) {
      return `
# ADPA Playbook Development Project Context

**Project ID**: 840ee5df-aa50-4412-b513-5472fbe3ea9e  
**Status**: No semantic units found in GKG

## Available Document Types (from file system):
- Ideation Template (01-ideation-template.md)
- Business Case (02-business-case.md) 
- Stakeholder Register (03-stakeholder-register.md)
- User Stories (04-user-stories.md)
- User Personas (05-user-personas.md)
- Communications Management Plan (06-communications-management-plan.md)
- Integration Management Plan (07-integration-management-plan.md)

## Key Project Information:
- **Framework**: PMBOK® Guide – Seventh Edition
- **Program Manager**: Menno Drescher
- **Budget**: $150,000
- **Timeline**: 6 months (Jan-Jun 2026)
- **Objective**: Develop ADPA Program Playbook and ADPAF Framework Playbook

## Next Steps:
1. Ensure GKG sync is completed for this project
2. Verify Neo4j configuration and connectivity
3. Run document extraction to populate semantic units
`
    }

    return `
# ADPA Playbook Development Project Context

**Project ID**: 840ee5df-aa50-4412-b513-5472fbe3ea9e  
**Semantic Units**: ${context.unitsCount}  
**Documents**: ${context.documentsCount}  
**Entity Types**: ${context.entityTypes.join(', ')}

${context.markdown}

---

## Project Overview
The ADPA Playbook Development project aims to create two comprehensive playbooks:
1. **ADPA Program Playbook**: Strategic and operational guide
2. **ADPAF Framework Playbook**: Technical and methodological guide

## Key Stakeholders
- **Program Manager**: Menno Drescher
- **Steering Committee**: Strategic oversight
- **Technical Architect**: Technical guidance
- **PMO Lead**: Operational alignment
- **Project Teams**: End-users and implementers

## Success Metrics
- 95% compliance across all projects
- 90% positive feedback from pilot testing
- $1.2M NPV over 5 years
- 180% ROI

`
  } catch (error) {
    console.error('Failed to retrieve ADPA Playbook context:', error)
    return `
# ADPA Playbook Development Project Context

**Project ID**: 840ee5df-aa50-4412-b513-5472fbe3ea9e

## Error Retrieving Context
Unable to access GKG semantic layer. Please check:
1. Neo4j configuration and connectivity
2. GKG sync status for this project
3. Authentication and permissions

## Manual Context Available
The project contains comprehensive documentation including:
- Project charter and ideation materials
- Business case with financial analysis
- Stakeholder register with 17+ stakeholders
- User stories and personas
- Communications and integration management plans

Please ensure the GKG sync has been run to access semantic context.
`
  }
}

/**
 * Get specific entity types from ADPA Playbook project
 */
export async function getAdpaPlaybookEntities(entityTypes: string[]): Promise<string> {
  const projectId = '840ee5df-aa50-4412-b513-5472fbe3ea9e'
  
  const strategy = {
    ...ADPA_PLAYBOOK_CONTEXT_STRATEGY,
    entityTypes,
    profile: 'custom' as const,
  }
  
  try {
    const context = await getContextForStrategy(projectId, strategy)
    return context.markdown
  } catch (error) {
    console.error(`Failed to retrieve ${entityTypes.join(', ')} from ADPA Playbook:`, error)
    return `No ${entityTypes.join(', ')} found in ADPA Playbook project context.`
  }
}

// Usage examples:
export const ADPA_PLAYBOOK_REQUIREMENTS = () => getAdpaPlaybookEntities(['Requirement'])
export const ADPA_PLAYBOOK_RISKS = () => getAdpaPlaybookEntities(['Risk'])
export const ADPA_PLAYBOOK_STAKEHOLDERS = () => getAdpaPlaybookEntities(['Stakeholder'])
export const ADPA_PLAYBOOK_MILESTONES = () => getAdpaPlaybookEntities(['Milestone'])
