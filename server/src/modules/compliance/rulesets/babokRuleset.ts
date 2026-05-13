/**
 * BABOK-Aligned Ruleset for Standards Compliance Validation
 * SC-123: BABOK Ruleset for Standards Compliance Validation
 * 
 * This ruleset contains compliance rules aligned with BABOK v3
 * knowledge areas and tasks. Rules are expressed through
 * configurable mappings without embedding proprietary standards text.
 */

import { 
  ComplianceRule, 
  StandardsCategory, 
  StandardsPack 
} from '../types';

/**
 * BABOK Knowledge Areas as categories
 */
export const BABOK_CATEGORIES: Omit<StandardsCategory, 'id' | 'packId'>[] = [
  {
    code: 'BA_PLANNING',
    name: 'Business Analysis Planning and Monitoring',
    description: 'Planning the business analysis approach and managing BA work',
    weight: 0.167,
    sortOrder: 1,
    isRequired: true,
  },
  {
    code: 'ELICITATION',
    name: 'Elicitation and Collaboration',
    description: 'Gathering information from stakeholders through various techniques',
    weight: 0.167,
    sortOrder: 2,
    isRequired: true,
  },
  {
    code: 'REQ_LIFECYCLE',
    name: 'Requirements Life Cycle Management',
    description: 'Managing requirements throughout the project lifecycle',
    weight: 0.167,
    sortOrder: 3,
    isRequired: true,
  },
  {
    code: 'STRATEGY',
    name: 'Strategy Analysis',
    description: 'Defining the business need and strategic direction',
    weight: 0.167,
    sortOrder: 4,
    isRequired: true,
  },
  {
    code: 'REQ_ANALYSIS',
    name: 'Requirements Analysis and Design Definition',
    description: 'Analyzing and defining solution requirements and designs',
    weight: 0.167,
    sortOrder: 5,
    isRequired: true,
  },
  {
    code: 'SOLUTION_EVAL',
    name: 'Solution Evaluation',
    description: 'Assessing solution performance and value delivery',
    weight: 0.165,
    sortOrder: 6,
    isRequired: true,
  },
];

/**
 * BABOK-aligned compliance rules
 */
export const BABOK_RULES: Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] = [
  // Business Analysis Planning Rules
  {
    code: 'BABOK-BAP-001',
    name: 'Business Analysis Approach',
    description: 'Document must define the business analysis approach',
    rationale: 'A defined approach ensures consistent and effective business analysis',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['business-case', 'requirements-document', 'ba-plan'],
    validationConfig: {
      keywords: ['business analysis', 'approach', 'methodology', 'technique', 'deliverable'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Define the business analysis approach',
      steps: [
        { order: 1, action: 'Document the BA methodology or approach' },
        { order: 2, action: 'Specify BA techniques to be used' },
        { order: 3, action: 'List expected BA deliverables' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Business Analysis Planning and Monitoring',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-BAP-002',
    name: 'Stakeholder Analysis',
    description: 'Document must include stakeholder analysis for BA activities',
    rationale: 'Understanding stakeholders is critical for effective requirements gathering',
    validationType: 'STAKEHOLDER_COVERAGE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['business-case', 'requirements-document', 'stakeholder-analysis'],
    validationConfig: {
      keywords: ['stakeholder', 'user', 'customer', 'sponsor', 'subject matter expert', 'sme'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add comprehensive stakeholder analysis',
      steps: [
        { order: 1, action: 'Identify all stakeholder groups' },
        { order: 2, action: 'Document stakeholder interests and concerns' },
        { order: 3, action: 'Define communication and engagement approach' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Business Analysis Planning and Monitoring',
      edition: 'v3'
    }
  },

  // Elicitation and Collaboration Rules
  {
    code: 'BABOK-ELC-001',
    name: 'Requirements Elicitation',
    description: 'Document must show evidence of requirements elicitation',
    rationale: 'Elicitation is fundamental to gathering accurate requirements',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['requirements-document', 'user-stories', 'use-cases'],
    validationConfig: {
      keywords: ['requirement', 'interview', 'workshop', 'survey', 'observation', 'elicitation'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Document requirements elicitation activities',
      steps: [
        { order: 1, action: 'Document elicitation techniques used' },
        { order: 2, action: 'List sources of requirements' },
        { order: 3, action: 'Include traceability to stakeholders' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Elicitation and Collaboration',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-ELC-002',
    name: 'Collaboration Documentation',
    description: 'Document should show evidence of stakeholder collaboration',
    rationale: 'Collaboration ensures requirements reflect stakeholder needs',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['requirements-document', 'meeting-notes'],
    validationConfig: {
      keywords: ['collaborate', 'feedback', 'review', 'approval', 'consensus'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document collaboration activities',
      steps: [
        { order: 1, action: 'Include review and feedback sessions' },
        { order: 2, action: 'Document stakeholder sign-offs' },
        { order: 3, action: 'Track requirement changes from collaboration' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Elicitation and Collaboration',
      edition: 'v3'
    }
  },

  // Requirements Life Cycle Management Rules
  {
    code: 'BABOK-RLM-001',
    name: 'Requirements Traceability',
    description: 'Document must include requirements traceability',
    rationale: 'Traceability ensures requirements are linked to objectives and solutions',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['requirements-document', 'traceability-matrix'],
    validationConfig: {
      keywords: ['traceability', 'trace', 'link', 'dependency', 'relationship', 'requirement id'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Add requirements traceability',
      steps: [
        { order: 1, action: 'Assign unique IDs to requirements' },
        { order: 2, action: 'Create traceability matrix' },
        { order: 3, action: 'Link requirements to objectives and test cases' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Requirements Life Cycle Management',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-RLM-002',
    name: 'Requirements Prioritization',
    description: 'Document should include requirement prioritization',
    rationale: 'Prioritization helps focus on high-value requirements',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['requirements-document', 'backlog'],
    validationConfig: {
      keywords: ['priority', 'high priority', 'must have', 'should have', 'could have', 'moscow'],
      thresholds: { pass: 75, warning: 55, fail: 35 }
    },
    remediationGuidance: {
      summary: 'Add requirements prioritization',
      steps: [
        { order: 1, action: 'Apply prioritization scheme (MoSCoW, etc.)' },
        { order: 2, action: 'Document priority rationale' },
        { order: 3, action: 'Include stakeholder input on priorities' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Requirements Life Cycle Management',
      edition: 'v3'
    }
  },

  // Strategy Analysis Rules
  {
    code: 'BABOK-STR-001',
    name: 'Business Need Definition',
    description: 'Document must clearly define the business need',
    rationale: 'Clear business need ensures solution addresses real problems',
    validationType: 'SECTION_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['business-case', 'requirements-document', 'vision-document'],
    validationConfig: {
      keywords: ['business need', 'problem statement', 'opportunity', 'objective', 'goal'],
      requiredSections: ['business need', 'problem', 'objective'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Define the business need clearly',
      steps: [
        { order: 1, action: 'Document the business problem or opportunity' },
        { order: 2, action: 'Describe the desired future state' },
        { order: 3, action: 'Include measurable business objectives' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Strategy Analysis',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-STR-002',
    name: 'Current State Analysis',
    description: 'Document should include current state assessment',
    rationale: 'Understanding current state is essential for gap analysis',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['business-case', 'as-is-analysis'],
    validationConfig: {
      keywords: ['current state', 'as-is', 'existing', 'baseline', 'today'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document the current state',
      steps: [
        { order: 1, action: 'Describe current processes and systems' },
        { order: 2, action: 'Identify current pain points' },
        { order: 3, action: 'Document current capabilities' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Strategy Analysis',
      edition: 'v3'
    }
  },

  // Requirements Analysis Rules
  {
    code: 'BABOK-REQ-001',
    name: 'Functional Requirements',
    description: 'Document must include functional requirements',
    rationale: 'Functional requirements define what the solution must do',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['requirements-document', 'functional-spec'],
    validationConfig: {
      keywords: ['functional requirement', 'function', 'capability', 'feature', 'shall', 'must'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Document functional requirements',
      steps: [
        { order: 1, action: 'List all functional requirements' },
        { order: 2, action: 'Use clear, testable statements' },
        { order: 3, action: 'Include acceptance criteria' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Requirements Analysis and Design Definition',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-REQ-002',
    name: 'Non-Functional Requirements',
    description: 'Document should include non-functional requirements',
    rationale: 'Non-functional requirements ensure solution quality',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['requirements-document', 'non-functional-spec'],
    validationConfig: {
      keywords: ['non-functional', 'performance', 'security', 'scalability', 'usability', 'reliability'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Document non-functional requirements',
      steps: [
        { order: 1, action: 'Include performance requirements' },
        { order: 2, action: 'Document security requirements' },
        { order: 3, action: 'Add usability and accessibility requirements' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Requirements Analysis and Design Definition',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-REQ-003',
    name: 'Use Cases or User Stories',
    description: 'Document should include use cases or user stories',
    rationale: 'Use cases/user stories provide user-centric requirements view',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['requirements-document', 'user-stories', 'use-cases'],
    validationConfig: {
      keywords: ['use case', 'user story', 'as a', 'i want', 'so that', 'scenario', 'actor'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Add use cases or user stories',
      steps: [
        { order: 1, action: 'Document user stories in standard format' },
        { order: 2, action: 'Include acceptance criteria' },
        { order: 3, action: 'Add alternative flows and exceptions' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Requirements Analysis and Design Definition',
      edition: 'v3'
    }
  },

  // Solution Evaluation Rules
  {
    code: 'BABOK-SOL-001',
    name: 'Solution Criteria',
    description: 'Document must include solution evaluation criteria',
    rationale: 'Evaluation criteria enable objective solution assessment',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['business-case', 'solution-assessment'],
    validationConfig: {
      keywords: ['criteria', 'evaluation', 'assessment', 'measure', 'benefit', 'value'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Define solution evaluation criteria',
      steps: [
        { order: 1, action: 'Define measurable success criteria' },
        { order: 2, action: 'Include ROI or benefit analysis' },
        { order: 3, action: 'Document evaluation approach' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Solution Evaluation',
      edition: 'v3'
    }
  },
  {
    code: 'BABOK-SOL-002',
    name: 'Constraints and Assumptions',
    description: 'Document should include constraints and assumptions',
    rationale: 'Documenting constraints prevents unrealistic expectations',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['business-case', 'requirements-document'],
    validationConfig: {
      keywords: ['constraint', 'assumption', 'limitation', 'dependency', 'restriction'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document constraints and assumptions',
      steps: [
        { order: 1, action: 'List project constraints' },
        { order: 2, action: 'Document assumptions and dependencies' },
        { order: 3, action: 'Include risk if assumptions prove false' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'BABOK',
      section: 'Solution Evaluation',
      edition: 'v3'
    }
  },
];

/**
 * Get the BABOK standards pack definition
 */
export function getBABOKPackDefinition(): Omit<StandardsPack, 'id' | 'rules' | 'categories' | 'createdAt' | 'updatedAt'> {
  return {
    packType: 'BABOK',
    name: 'BABOK Guide Compliance Pack',
    description: 'Standards compliance rules aligned with BABOK v3 Knowledge Areas',
    version: '3.0',
    isActive: true,
  };
}

/**
 * Get all BABOK categories
 */
export function getBABOKCategories(): Omit<StandardsCategory, 'id' | 'packId'>[] {
  return BABOK_CATEGORIES;
}

/**
 * Get all BABOK rules
 */
export function getBABOKRules(): Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] {
  return BABOK_RULES;
}

/**
 * Map rules to their categories
 */
export function getBABOKRuleCategoryMapping(): Record<string, string> {
  return {
    'BABOK-BAP-001': 'BA_PLANNING',
    'BABOK-BAP-002': 'BA_PLANNING',
    'BABOK-ELC-001': 'ELICITATION',
    'BABOK-ELC-002': 'ELICITATION',
    'BABOK-RLM-001': 'REQ_LIFECYCLE',
    'BABOK-RLM-002': 'REQ_LIFECYCLE',
    'BABOK-STR-001': 'STRATEGY',
    'BABOK-STR-002': 'STRATEGY',
    'BABOK-REQ-001': 'REQ_ANALYSIS',
    'BABOK-REQ-002': 'REQ_ANALYSIS',
    'BABOK-REQ-003': 'REQ_ANALYSIS',
    'BABOK-SOL-001': 'SOLUTION_EVAL',
    'BABOK-SOL-002': 'SOLUTION_EVAL',
  };
}
