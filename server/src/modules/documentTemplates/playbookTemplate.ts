/**
 * ADPA Playbook Template Generator
 * Standardized template for generating ADPA Playbooks from project data
 * Integrates with GKG semantic layer for context-aware generation
 */

import { DocumentTemplate, GkgContextStrategy, TemplateVariable } from './types'

export interface PlaybookTemplateConfig {
  playbookType: 'program' | 'framework' | 'operational'
  targetAudience: 'executive' | 'technical' | 'operational'
  complexity: 'basic' | 'standard' | 'comprehensive'
  includeGkgContext: boolean
}

export class PlaybookTemplateGenerator {
  
  /**
   * Generate standardized ADPA Playbook template
   */
  static generatePlaybookTemplate(config: PlaybookTemplateConfig): DocumentTemplate {
    const baseTemplate: DocumentTemplate = {
      id: `adpa-playbook-${config.playbookType}-${Date.now()}`,
      name: this.getTemplateName(config),
      description: this.getTemplateDescription(config),
      framework: 'Custom' as const,
      category: 'Playbook',
      content: this.getTemplateContent(config),
      variables: this.getTemplateVariables(config),
      is_public: true,
      created_by: 'system',
      usage_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }

    // Add GKG context strategy if enabled
    if (config.includeGkgContext) {
      baseTemplate.gkg_context_strategy = this.getGkgContextStrategy(config)
    }

    return baseTemplate
  }

  private static getTemplateName(config: PlaybookTemplateConfig): string {
    const typeMap = {
      'program': 'ADPA Program Playbook',
      'framework': 'ADPAF Framework Playbook', 
      'operational': 'ADPA Operational Playbook'
    }
    
    const audienceMap = {
      'executive': 'Executive Edition',
      'technical': 'Technical Edition',
      'operational': 'Operational Edition'
    }

    return `${typeMap[config.playbookType]} - ${audienceMap[config.targetAudience]}`
  }

  private static getTemplateDescription(config: PlaybookTemplateConfig): string {
    return `Comprehensive ${config.playbookType} playbook for ADPA with ${config.targetAudience}-focused content and ${config.complexity} detail level.`
  }

  private static getTemplateContent(config: PlaybookTemplateConfig): Record<string, any> {
    return {
      // Standard Go-to-Market Paragraphs
      sections: this.getStandardSections(config),
      tableOfContents: this.getTableOfContentsStructure(config),
      goToMarketParagraphs: this.getGoToMarketParagraphs(config),
      
      // Template structure with Handlebars placeholders
      template: this.getHandlebarsTemplate(config),
      
      // Metadata
      metadata: {
        playbookType: config.playbookType,
        targetAudience: config.targetAudience,
        complexity: config.complexity,
        version: '1.0',
        lastUpdated: new Date().toISOString()
      }
    }
  }

  private static getStandardSections(config: PlaybookTemplateConfig): string[] {
    const baseSections = [
      'Executive Summary',
      'Introduction & Purpose',
      'Scope & Objectives',
      'Governance Framework',
      'Operational Workflows',
      'Integration Guidelines',
      'Quality Assurance',
      'Risk Management',
      'Success Metrics',
      'Appendices'
    ]

    // Add sections based on playbook type
    if (config.playbookType === 'program') {
      baseSections.splice(5, 0, 'Program Management', 'Stakeholder Engagement')
    } else if (config.playbookType === 'framework') {
      baseSections.splice(4, 0, 'Technical Architecture', 'Semantic Processing', 'Knowledge Graph Integration')
    } else if (config.playbookType === 'operational') {
      baseSections.splice(4, 0, 'Standard Operating Procedures', 'Escalation Protocols', 'Performance Monitoring')
    }

    return baseSections
  }

  private static getTableOfContentsStructure(config: PlaybookTemplateConfig): Record<string, any> {
    return {
      autoGenerate: true,
      maxDepth: config.complexity === 'comprehensive' ? 4 : 3,
      includePageNumbers: true,
      sections: this.getStandardSections(config).map((section, index) => ({
        title: section,
        level: 1,
        order: index + 1,
        subSections: this.getSubSections(section, config)
      }))
    }
  }

  private static getSubSections(section: string, config: PlaybookTemplateConfig): any[] {
    const subSectionMap: Record<string, any[]> = {
      'Executive Summary': [
        { title: 'Problem Statement', level: 2 },
        { title: 'Proposed Solution', level: 2 },
        { title: 'Expected Benefits', level: 2 },
        { title: 'Success Metrics', level: 2 }
      ],
      'Governance Framework': [
        { title: 'Decision Rights', level: 2 },
        { title: 'Roles & Responsibilities', level: 2 },
        { title: 'Governance Cadence', level: 2 },
        { title: 'Compliance Requirements', level: 2 }
      ],
      'Technical Architecture': [
        { title: 'System Components', level: 2 },
        { title: 'Data Flow Architecture', level: 2 },
        { title: 'Integration Points', level: 2 },
        { title: 'Security Considerations', level: 2 }
      ]
    }

    return subSectionMap[section] || []
  }

  private static getGoToMarketParagraphs(config: PlaybookTemplateConfig): Record<string, string> {
    return {
      // Standardized paragraphs that can be customized
      executiveSummary: `
The Advanced Document Processing & Analytics (ADPA) {{playbookType}} playbook provides 
standardized guidance for {{targetObjective}}. This comprehensive guide ensures 
operational consistency, governance alignment, and scalability across all ADPA initiatives.
      `.trim(),

      valueProposition: `
By implementing this {{playbookType}} playbook, organizations can achieve 
{{expectedBenefits}} through standardized workflows, clear governance frameworks, 
and integrated quality assurance processes. The playbook enables {{targetAudience}} 
to efficiently manage ADPA implementation with measurable outcomes.
      `.trim(),

      implementationApproach: `
This playbook follows a phased implementation approach designed to minimize disruption 
while maximizing value delivery. Each phase includes clear success criteria, 
governance checkpoints, and quality assurance measures to ensure successful adoption.
      `.trim(),

      riskMitigation: `
Comprehensive risk management strategies are embedded throughout this playbook, 
including proactive identification, mitigation planning, and continuous monitoring. 
The approach ensures {{riskMitigationLevel}} risk management across all implementation phases.
      `.trim(),

      successMetrics: `
Success is measured through a balanced set of metrics covering operational efficiency, 
governance compliance, stakeholder satisfaction, and business value delivery. 
The playbook establishes clear KPIs and monitoring mechanisms for {{successMeasurement}}.
      `.trim()
    }
  }

  private static getHandlebarsTemplate(config: PlaybookTemplateConfig): string {
    return `
# {{title}}

**Project ID**: {{projectId}}  
**Playbook Type**: {{playbookType}}  
**Target Audience**: {{targetAudience}}  
**Version**: {{version}}  
**Prepared By**: {{preparedBy}}  
**Date**: {{currentDate}}

---

## Executive Summary

{{#if gkgContext}}
{{gkgContext}}
{{/if}}

{{goToMarketParagraphs.executiveSummary}}

---

## Table of Contents

{{#generateTableOfContents tableOfContents}}
{{/generateTableOfContents}}

---

{{#each sections}}
## {{this}}

{{#if (eq this "Introduction & Purpose")}}
### Purpose and Scope

The purpose of this {{../playbookType}} playbook is to provide standardized guidance for 
{{../targetObjective}}. This document serves as the authoritative reference for 
{{../targetAudience}} involved in ADPA implementation and operations.

### Key Objectives

{{#each objectives}}
- {{this}}
{{/each}}
{{/if}}

{{#if (eq this "Governance Framework")}}
### Governance Structure

{{#if gkgStakeholders}}
#### Key Stakeholders
{{#each gkgStakeholders}}
- **{{name}}**: {{role}} - {{responsibility}}
{{/each}}
{{/if}}

### Decision Rights Matrix

| Decision Area | Decision Maker | Consult | Inform | Timeline |
|---------------|----------------|---------|--------|----------|
| Strategic Direction | Steering Committee | Technical Lead | PMO | Monthly |
| Technical Architecture | Technical Architect | Development Team | Security | As Needed |
| Operational Changes | Program Manager | Operations Team | Stakeholders | Weekly |
{{/if}}

{{#if (eq this "Operational Workflows")}}
### Standardized Workflows

#### Document Processing Workflow
1. **Ingestion**: Automated document capture and validation
2. **Extraction**: Semantic unit extraction using AI/ML
3. **Analysis**: Knowledge graph integration and context building
4. **Generation**: Document creation and quality assurance
5. **Distribution**: Controlled dissemination and version management

#### Quality Assurance Process
{{#if qualityMetrics}}
- **Accuracy Target**: {{qualityMetrics.accuracy}}%
- **Completeness Target**: {{qualityMetrics.completeness}}%
- **Timeliness Target**: {{qualityMetrics.timeliness}} hours
{{/if}}
{{/if}}

{{#if (eq this "Integration Guidelines")}}
### System Integration

#### GKG Integration
- **Semantic Layer**: Governance Knowledge Graph for context management
- **Entity Mapping**: Standardized semantic unit classification
- **Relationship Management**: Automated traceability and dependency tracking

#### External System Integration
{{#each integrations}}
- **{{name}}**: {{description}} ({{status}})
{{/each}}
{{/if}}

{{#if (eq this "Risk Management")}}
### Risk Register

{{#if gkgRisks}}
#### Identified Risks
{{#each gkgRisks}}
- **{{title}}**: {{description}} ({{impact}}/{{probability}})
  - *Mitigation*: {{mitigation}}
  - *Owner*: {{owner}}
{{/each}}
{{/if}}

### Risk Response Strategies
| Risk Category | Response Strategy | Owner | Timeline |
|---------------|-------------------|-------|----------|
| Technical | Enhance monitoring and validation | Technical Lead | Ongoing |
| Operational | Standardize procedures and training | Operations Manager | 30 days |
| Governance | Strengthen oversight and reporting | Program Manager | 60 days |
{{/if}}

{{#if (eq this "Success Metrics")}}
### Performance Indicators

#### Operational Metrics
{{#if operationalMetrics}}
{{#each operationalMetrics}}
- **{{name}}**: {{target}} ({{current}})
{{/each}}
{{/if}}

#### Governance Metrics
- **Compliance Rate**: {{governanceMetrics.compliance}}%
- **Stakeholder Satisfaction**: {{governanceMetrics.satisfaction}}/5
- **Decision Timeliness**: {{governanceMetrics.decisionTimeliness}} days

#### Business Value Metrics
- **ROI**: {{businessMetrics.roi}}%
- **Cost Savings**: {{businessMetrics.costSavings}}
- **Efficiency Gain**: {{businessMetrics.efficiencyGain}}%
{{/if}}

---

## Appendices

### A. Template Library
{{#each templates}}
- **{{name}}**: {{description}}
{{/each}}

### B. Governance References
{{#each references}}
- **{{title}}**: {{source}} ({{year}})
{{/each}}

### C. Contact Information
{{#each contacts}}
- **{{role}}**: {{name}} ({{email}})
{{/each}}

---

*Document Version: {{version}}*  
*Last Updated: {{lastUpdated}}*  
*Prepared by: {{preparedBy}}*
    `.trim()
  }

  private static getTemplateVariables(config: PlaybookTemplateConfig): any[] {
    const baseVariables = [
      { name: 'title', type: 'text', required: true, description: 'Playbook title' },
      { name: 'projectId', type: 'text', required: true, description: 'Project UUID' },
      { name: 'playbookType', type: 'select', required: true, options: ['program', 'framework', 'operational'], description: 'Type of playbook' },
      { name: 'targetAudience', type: 'select', required: true, options: ['executive', 'technical', 'operational'], description: 'Target audience' },
      { name: 'preparedBy', type: 'text', required: true, description: 'Prepared by' },
      { name: 'currentDate', type: 'date', required: true, description: 'Current date' },
      { name: 'version', type: 'text', required: false, default: '1.0', description: 'Document version' },
      { name: 'lastUpdated', type: 'date', required: true, description: 'Last updated date' }
    ]

    // Add complexity-specific variables
    if (config.complexity === 'comprehensive') {
      baseVariables.push(
        { name: 'targetObjective', type: 'text', required: true, description: 'Primary objective' },
        { name: 'expectedBenefits', type: 'text', required: true, description: 'Expected benefits' },
        { name: 'riskMitigationLevel', type: 'select', required: true, options: ['basic', 'advanced', 'comprehensive'], description: 'Risk mitigation level' },
        { name: 'successMeasurement', type: 'text', required: true, description: 'Success measurement approach' }
      )
    }

    return baseVariables
  }

  private static getGkgContextStrategy(config: PlaybookTemplateConfig): GkgContextStrategy {
    return {
      profile: 'governance_full',
      scope: 'same_project',
      maxUnits: config.complexity === 'comprehensive' ? 200 : 100,
      maxDocuments: config.complexity === 'comprehensive' ? 20 : 10,
      traceableOnly: true,
      documentStatusFilter: 'approved_published_only'
    }
  }
}

// Export predefined template configurations
export const PLAYBOOK_TEMPLATE_CONFIGS = {
  // Program Playbook Templates
  programExecutive: {
    playbookType: 'program' as const,
    targetAudience: 'executive' as const,
    complexity: 'basic' as const,
    includeGkgContext: true
  },
  
  programTechnical: {
    playbookType: 'program' as const,
    targetAudience: 'technical' as const,
    complexity: 'standard' as const,
    includeGkgContext: true
  },

  // Framework Playbook Templates  
  frameworkTechnical: {
    playbookType: 'framework' as const,
    targetAudience: 'technical' as const,
    complexity: 'comprehensive' as const,
    includeGkgContext: true
  },

  // Operational Playbook Templates
  operationalStandard: {
    playbookType: 'operational' as const,
    targetAudience: 'operational' as const,
    complexity: 'standard' as const,
    includeGkgContext: true
  }
} as const
