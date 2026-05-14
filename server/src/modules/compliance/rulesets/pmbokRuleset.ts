/**
 * PMBOK-Aligned Ruleset for Standards Compliance Validation
 * SC-122: PMBOK Ruleset for Standards Compliance Validation
 * 
 * This ruleset contains compliance rules aligned with PMBOK 7th Edition
 * performance domains and principles. Rules are expressed through
 * configurable mappings without embedding proprietary standards text.
 */

import { 
  ComplianceRule, 
  StandardsCategory, 
  StandardsPack,
  RuleValidationType,
  RuleSeverity 
} from '../types';

/**
 * PMBOK Performance Domains as categories
 */
export const PMBOK_CATEGORIES: Omit<StandardsCategory, 'id' | 'packId'>[] = [
  {
    code: 'STAKEHOLDERS',
    name: 'Stakeholders',
    description: 'Stakeholder engagement, identification, and management practices',
    weight: 0.125,
    sortOrder: 1,
    isRequired: true,
  },
  {
    code: 'TEAM',
    name: 'Team',
    description: 'Team development, management, and collaboration practices',
    weight: 0.125,
    sortOrder: 2,
    isRequired: true,
  },
  {
    code: 'DEV_APPROACH',
    name: 'Development Approach and Life Cycle',
    description: 'Approach selection and life cycle definition',
    weight: 0.125,
    sortOrder: 3,
    isRequired: true,
  },
  {
    code: 'PLANNING',
    name: 'Planning',
    description: 'Planning activities, scope, schedule, and resources',
    weight: 0.125,
    sortOrder: 4,
    isRequired: true,
  },
  {
    code: 'PROJECT_WORK',
    name: 'Project Work',
    description: 'Work execution, quality assurance, and process management',
    weight: 0.125,
    sortOrder: 5,
    isRequired: true,
  },
  {
    code: 'DELIVERY',
    name: 'Delivery',
    description: 'Value delivery, benefits realization, and acceptance',
    weight: 0.125,
    sortOrder: 6,
    isRequired: true,
  },
  {
    code: 'MEASUREMENT',
    name: 'Measurement',
    description: 'Performance measurement, metrics, and reporting',
    weight: 0.125,
    sortOrder: 7,
    isRequired: true,
  },
  {
    code: 'UNCERTAINTY',
    name: 'Uncertainty',
    description: 'Risk and uncertainty management practices',
    weight: 0.125,
    sortOrder: 8,
    isRequired: true,
  },
];

/**
 * PMBOK-aligned compliance rules
 */
export const PMBOK_RULES: Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] = [
  // STAKEHOLDERS Domain Rules
  {
    code: 'PMBOK-STK-001',
    name: 'Stakeholder Identification',
    description: 'Document must identify key stakeholders and their roles',
    rationale: 'Stakeholder identification is fundamental to project success',
    validationType: 'STAKEHOLDER_COVERAGE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'stakeholder-register'],
    validationConfig: {
      keywords: ['stakeholder', 'sponsor', 'customer', 'project manager', 'team', 'management'],
      requiredSections: ['stakeholder', 'sponsor', 'roles'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add comprehensive stakeholder identification section',
      steps: [
        { order: 1, action: 'Identify all individuals or groups affected by the project' },
        { order: 2, action: 'Document stakeholder roles, responsibilities, and authority levels' },
        { order: 3, action: 'Include a stakeholder register or matrix' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Stakeholders Performance Domain',
      edition: '7th Edition'
    }
  },
  {
    code: 'PMBOK-STK-002',
    name: 'Stakeholder Engagement Strategy',
    description: 'Document should include stakeholder engagement approach',
    rationale: 'Effective stakeholder engagement increases project success probability',
    validationType: 'SECTION_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['project-management-plan', 'stakeholder-register', 'communication-plan'],
    validationConfig: {
      keywords: ['engagement', 'communication', 'influence', 'expectation'],
      requiredSections: ['engagement', 'communication plan'],
      thresholds: { pass: 75, warning: 50, fail: 25 }
    },
    remediationGuidance: {
      summary: 'Document stakeholder engagement strategies',
      steps: [
        { order: 1, action: 'Define engagement levels for each stakeholder' },
        { order: 2, action: 'Document communication preferences and frequency' },
        { order: 3, action: 'Include escalation procedures' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Stakeholders Performance Domain',
      edition: '7th Edition'
    }
  },

  // TEAM Domain Rules
  {
    code: 'PMBOK-TM-001',
    name: 'Team Structure Definition',
    description: 'Document must define team structure and roles',
    rationale: 'Clear team structure enables effective collaboration and accountability',
    validationType: 'SECTION_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'resource-plan'],
    validationConfig: {
      keywords: ['team', 'role', 'responsibility', 'resource', 'skill'],
      requiredSections: ['team', 'roles', 'responsibilities', 'resources'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add team structure and roles section',
      steps: [
        { order: 1, action: 'Define team organizational structure' },
        { order: 2, action: 'Document roles and responsibilities using RACI or similar' },
        { order: 3, action: 'Include required skills and competencies' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Team Performance Domain',
      edition: '7th Edition'
    }
  },

  // PLANNING Domain Rules
  {
    code: 'PMBOK-PL-001',
    name: 'Scope Definition',
    description: 'Document must include clear scope statement',
    rationale: 'Clear scope prevents scope creep and ensures project boundaries are understood',
    validationType: 'SECTION_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'scope-statement', 'project-management-plan'],
    validationConfig: {
      keywords: ['scope', 'deliverable', 'in-scope', 'out-of-scope', 'boundary', 'objective'],
      requiredSections: ['scope', 'deliverables', 'objectives'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Add comprehensive scope definition',
      steps: [
        { order: 1, action: 'Define project scope boundaries clearly' },
        { order: 2, action: 'List all deliverables with acceptance criteria' },
        { order: 3, action: 'Document what is explicitly out of scope' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Planning Performance Domain',
      edition: '7th Edition'
    }
  },
  {
    code: 'PMBOK-PL-002',
    name: 'Schedule Information',
    description: 'Document should include schedule or timeline information',
    rationale: 'Schedule information is essential for project planning and tracking',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'schedule-baseline'],
    validationConfig: {
      keywords: ['schedule', 'timeline', 'milestone', 'deadline', 'duration', 'start date', 'end date'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Include schedule and milestone information',
      steps: [
        { order: 1, action: 'Define major milestones with target dates' },
        { order: 2, action: 'Include project start and end dates' },
        { order: 3, action: 'Document key phase durations' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Planning Performance Domain',
      edition: '7th Edition'
    }
  },
  {
    code: 'PMBOK-PL-003',
    name: 'Budget and Cost Information',
    description: 'Document should include budget or cost estimates',
    rationale: 'Cost information is critical for project authorization and tracking',
    validationType: 'METRIC_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'cost-baseline', 'business-case'],
    validationConfig: {
      parameters: { requireMonetary: true },
      thresholds: { pass: 75, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Add budget and cost information',
      steps: [
        { order: 1, action: 'Include estimated project budget' },
        { order: 2, action: 'Document funding sources if applicable' },
        { order: 3, action: 'Add cost breakdown by phase or category' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Planning Performance Domain',
      edition: '7th Edition'
    }
  },

  // UNCERTAINTY Domain Rules
  {
    code: 'PMBOK-UN-001',
    name: 'Risk Identification',
    description: 'Document must include risk identification and assessment',
    rationale: 'Proactive risk management is essential for project success',
    validationType: 'RISK_ASSESSMENT',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'risk-register'],
    validationConfig: {
      keywords: ['risk', 'threat', 'opportunity', 'mitigation', 'probability', 'impact'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add comprehensive risk identification section',
      steps: [
        { order: 1, action: 'Identify potential risks and opportunities' },
        { order: 2, action: 'Assess probability and impact' },
        { order: 3, action: 'Document risk response strategies' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Uncertainty Performance Domain',
      edition: '7th Edition'
    }
  },
  {
    code: 'PMBOK-UN-002',
    name: 'Risk Response Planning',
    description: 'Document should include risk response strategies',
    rationale: 'Defined response strategies enable proactive risk management',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['risk-register', 'project-management-plan'],
    validationConfig: {
      keywords: ['mitigation', 'contingency', 'response', 'avoid', 'transfer', 'accept'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document risk response strategies',
      steps: [
        { order: 1, action: 'Define response strategy for each identified risk' },
        { order: 2, action: 'Assign risk owners' },
        { order: 3, action: 'Document contingency plans' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Uncertainty Performance Domain',
      edition: '7th Edition'
    }
  },

  // MEASUREMENT Domain Rules
  {
    code: 'PMBOK-MS-001',
    name: 'Success Criteria Definition',
    description: 'Document must include measurable success criteria',
    rationale: 'Clear success criteria enable objective project evaluation',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'project-management-plan', 'business-case'],
    validationConfig: {
      keywords: ['success criteria', 'kpi', 'metric', 'measure', 'objective', 'target'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add measurable success criteria',
      steps: [
        { order: 1, action: 'Define SMART objectives' },
        { order: 2, action: 'Include KPIs with target values' },
        { order: 3, action: 'Document measurement methods' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Measurement Performance Domain',
      edition: '7th Edition'
    }
  },

  // DELIVERY Domain Rules
  {
    code: 'PMBOK-DL-001',
    name: 'Deliverables Definition',
    description: 'Document must clearly define project deliverables',
    rationale: 'Clear deliverables ensure stakeholder alignment on outcomes',
    validationType: 'SECTION_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['project-charter', 'scope-statement', 'project-management-plan'],
    validationConfig: {
      keywords: ['deliverable', 'output', 'product', 'result', 'outcome'],
      requiredSections: ['deliverables', 'outputs'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Add comprehensive deliverables section',
      steps: [
        { order: 1, action: 'List all project deliverables' },
        { order: 2, action: 'Include acceptance criteria for each deliverable' },
        { order: 3, action: 'Document delivery timeline' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Delivery Performance Domain',
      edition: '7th Edition'
    }
  },
  {
    code: 'PMBOK-DL-002',
    name: 'Acceptance Criteria',
    description: 'Document should include acceptance criteria for deliverables',
    rationale: 'Clear acceptance criteria prevent disputes and ensure quality',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['scope-statement', 'project-management-plan', 'requirements'],
    validationConfig: {
      keywords: ['acceptance criteria', 'quality criteria', 'verification', 'validation', 'approved'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document acceptance criteria',
      steps: [
        { order: 1, action: 'Define acceptance criteria for each deliverable' },
        { order: 2, action: 'Include verification methods' },
        { order: 3, action: 'Document approval process' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Delivery Performance Domain',
      edition: '7th Edition'
    }
  },

  // PROJECT WORK Domain Rules
  {
    code: 'PMBOK-PW-001',
    name: 'Quality Management',
    description: 'Document should address quality management approach',
    rationale: 'Quality management ensures deliverables meet requirements',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['project-management-plan', 'quality-plan'],
    validationConfig: {
      keywords: ['quality', 'standard', 'review', 'inspection', 'audit', 'control'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Add quality management approach',
      steps: [
        { order: 1, action: 'Define quality standards and criteria' },
        { order: 2, action: 'Document quality assurance activities' },
        { order: 3, action: 'Include quality control measures' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Project Work Performance Domain',
      edition: '7th Edition'
    }
  },

  // DEVELOPMENT APPROACH Domain Rules
  {
    code: 'PMBOK-DA-001',
    name: 'Methodology Selection',
    description: 'Document should specify the development approach or methodology',
    rationale: 'Clear methodology enables consistent project execution',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['project-charter', 'project-management-plan'],
    validationConfig: {
      keywords: ['agile', 'waterfall', 'hybrid', 'methodology', 'approach', 'iterative', 'incremental'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document the development approach',
      steps: [
        { order: 1, action: 'Specify the project methodology or approach' },
        { order: 2, action: 'Justify the approach selection' },
        { order: 3, action: 'Document any tailoring decisions' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'Development Approach and Life Cycle Performance Domain',
      edition: '7th Edition'
    }
  },

  // Structure Rules
  {
    code: 'PMBOK-STR-001',
    name: 'Document Structure',
    description: 'Document must have proper structure with clear headings and sections',
    rationale: 'Well-structured documents are easier to review and maintain',
    validationType: 'STRUCTURE_CHECK',
    severity: 'MINOR',
    weight: 0.6,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['*'],
    validationConfig: {
      parameters: { minH2Sections: 3, requireTables: false, requireLists: false },
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Improve document structure',
      steps: [
        { order: 1, action: 'Add clear section headings' },
        { order: 2, action: 'Organize content in logical hierarchy' },
        { order: 3, action: 'Use tables and lists where appropriate' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'PMBOK',
      section: 'General Documentation Standards',
      edition: '7th Edition'
    }
  },
];

/**
 * Get the PMBOK standards pack definition
 */
export function getPMBOKPackDefinition(): Omit<StandardsPack, 'id' | 'rules' | 'categories' | 'createdAt' | 'updatedAt'> {
  return {
    packType: 'PMBOK',
    name: 'PMBOK Guide Compliance Pack',
    description: 'Standards compliance rules aligned with PMBOK 7th Edition Performance Domains and Principles',
    version: '7.0',
    isActive: true,
  };
}

/**
 * Get all PMBOK categories
 */
export function getPMBOKCategories(): Omit<StandardsCategory, 'id' | 'packId'>[] {
  return PMBOK_CATEGORIES;
}

/**
 * Get all PMBOK rules
 */
export function getPMBOKRules(): Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] {
  return PMBOK_RULES;
}

/**
 * Map rules to their categories
 */
export function getPMBOKRuleCategoryMapping(): Record<string, string> {
  return {
    'PMBOK-STK-001': 'STAKEHOLDERS',
    'PMBOK-STK-002': 'STAKEHOLDERS',
    'PMBOK-TM-001': 'TEAM',
    'PMBOK-PL-001': 'PLANNING',
    'PMBOK-PL-002': 'PLANNING',
    'PMBOK-PL-003': 'PLANNING',
    'PMBOK-UN-001': 'UNCERTAINTY',
    'PMBOK-UN-002': 'UNCERTAINTY',
    'PMBOK-MS-001': 'MEASUREMENT',
    'PMBOK-DL-001': 'DELIVERY',
    'PMBOK-DL-002': 'DELIVERY',
    'PMBOK-PW-001': 'PROJECT_WORK',
    'PMBOK-DA-001': 'DEV_APPROACH',
    'PMBOK-STR-001': 'PLANNING', // General structure falls under planning
  };
}
