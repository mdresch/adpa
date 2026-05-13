/**
 * DMBOK-Aligned Ruleset for Standards Compliance Validation
 * SC-124: DMBOK Ruleset for Standards Compliance Validation
 * 
 * This ruleset contains compliance rules aligned with DMBOK 2nd Edition
 * knowledge areas. Rules are expressed through configurable mappings
 * without embedding proprietary standards text.
 */

import { 
  ComplianceRule, 
  StandardsCategory, 
  StandardsPack 
} from '../types';

/**
 * DMBOK Knowledge Areas as categories
 */
export const DMBOK_CATEGORIES: Omit<StandardsCategory, 'id' | 'packId'>[] = [
  {
    code: 'DATA_GOVERNANCE',
    name: 'Data Governance',
    description: 'Planning, oversight, and control over data management',
    weight: 0.12,
    sortOrder: 1,
    isRequired: true,
  },
  {
    code: 'DATA_ARCHITECTURE',
    name: 'Data Architecture',
    description: 'Defining the data structure needed to support the business strategy',
    weight: 0.10,
    sortOrder: 2,
    isRequired: true,
  },
  {
    code: 'DATA_MODELING',
    name: 'Data Modeling and Design',
    description: 'Analyzing, designing, building, and implementing data models',
    weight: 0.10,
    sortOrder: 3,
    isRequired: true,
  },
  {
    code: 'DATA_STORAGE',
    name: 'Data Storage and Operations',
    description: 'Managing database operations and data storage',
    weight: 0.09,
    sortOrder: 4,
    isRequired: true,
  },
  {
    code: 'DATA_SECURITY',
    name: 'Data Security',
    description: 'Ensuring privacy, confidentiality, and appropriate access',
    weight: 0.12,
    sortOrder: 5,
    isRequired: true,
  },
  {
    code: 'DATA_INTEGRATION',
    name: 'Data Integration and Interoperability',
    description: 'Managing data movement and consolidation',
    weight: 0.09,
    sortOrder: 6,
    isRequired: true,
  },
  {
    code: 'DATA_QUALITY',
    name: 'Data Quality',
    description: 'Defining, monitoring, and improving data quality',
    weight: 0.12,
    sortOrder: 7,
    isRequired: true,
  },
  {
    code: 'METADATA',
    name: 'Metadata Management',
    description: 'Collecting, categorizing, and maintaining metadata',
    weight: 0.08,
    sortOrder: 8,
    isRequired: true,
  },
  {
    code: 'MASTER_DATA',
    name: 'Reference and Master Data',
    description: 'Managing shared data to reduce redundancy and ensure consistency',
    weight: 0.09,
    sortOrder: 9,
    isRequired: true,
  },
  {
    code: 'DW_BI',
    name: 'Data Warehousing and Business Intelligence',
    description: 'Managing analytical data processing and reporting',
    weight: 0.09,
    sortOrder: 10,
    isRequired: true,
  },
];

/**
 * DMBOK-aligned compliance rules
 */
export const DMBOK_RULES: Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] = [
  // Data Governance Rules
  {
    code: 'DMBOK-GOV-001',
    name: 'Data Governance Framework',
    description: 'Document must define data governance framework or approach',
    rationale: 'A governance framework ensures consistent data management practices',
    validationType: 'SECTION_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-governance-plan', 'data-strategy'],
    validationConfig: {
      keywords: ['governance', 'stewardship', 'ownership', 'accountability', 'policy'],
      requiredSections: ['governance', 'stewardship', 'roles'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Define data governance framework',
      steps: [
        { order: 1, action: 'Document governance structure and roles' },
        { order: 2, action: 'Define data stewardship responsibilities' },
        { order: 3, action: 'Include decision-making processes' }
      ],
      estimatedEffort: 'HIGH'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Governance',
      edition: '2nd Edition'
    }
  },
  {
    code: 'DMBOK-GOV-002',
    name: 'Data Policies',
    description: 'Document should include data policies and standards',
    rationale: 'Policies provide guidelines for consistent data handling',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-governance-plan', 'data-policy'],
    validationConfig: {
      keywords: ['policy', 'standard', 'guideline', 'procedure', 'compliance'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Document data policies',
      steps: [
        { order: 1, action: 'Define data handling policies' },
        { order: 2, action: 'Include data retention standards' },
        { order: 3, action: 'Document compliance requirements' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Governance',
      edition: '2nd Edition'
    }
  },

  // Data Architecture Rules
  {
    code: 'DMBOK-ARC-001',
    name: 'Data Architecture Definition',
    description: 'Document must define the data architecture',
    rationale: 'Data architecture provides blueprint for data assets',
    validationType: 'SECTION_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-architecture', 'data-strategy'],
    validationConfig: {
      keywords: ['architecture', 'model', 'structure', 'design', 'blueprint'],
      requiredSections: ['architecture', 'data model'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Define data architecture',
      steps: [
        { order: 1, action: 'Document conceptual data architecture' },
        { order: 2, action: 'Include logical data model' },
        { order: 3, action: 'Define integration patterns' }
      ],
      estimatedEffort: 'HIGH'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Architecture',
      edition: '2nd Edition'
    }
  },
  {
    code: 'DMBOK-ARC-002',
    name: 'Data Flow Documentation',
    description: 'Document should include data flow diagrams or descriptions',
    rationale: 'Data flows show how data moves through the organization',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-architecture', 'integration-design'],
    validationConfig: {
      keywords: ['data flow', 'flow diagram', 'etl', 'pipeline', 'source', 'target'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document data flows',
      steps: [
        { order: 1, action: 'Create data flow diagrams' },
        { order: 2, action: 'Document source and target systems' },
        { order: 3, action: 'Include transformation logic' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Architecture',
      edition: '2nd Edition'
    }
  },

  // Data Modeling Rules
  {
    code: 'DMBOK-MOD-001',
    name: 'Data Model Documentation',
    description: 'Document must include data model definitions',
    rationale: 'Data models provide structure for understanding data',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-model', 'data-architecture'],
    validationConfig: {
      keywords: ['entity', 'attribute', 'relationship', 'model', 'schema', 'table', 'column'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Document data models',
      steps: [
        { order: 1, action: 'Include entity-relationship diagrams' },
        { order: 2, action: 'Document attributes and data types' },
        { order: 3, action: 'Define relationships and cardinality' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Modeling and Design',
      edition: '2nd Edition'
    }
  },

  // Data Security Rules
  {
    code: 'DMBOK-SEC-001',
    name: 'Data Security Requirements',
    description: 'Document must include data security requirements',
    rationale: 'Security requirements protect data from unauthorized access',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'CRITICAL',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-security', 'data-governance-plan', 'data-architecture'],
    validationConfig: {
      keywords: ['security', 'access control', 'encryption', 'authentication', 'authorization', 'classification'],
      thresholds: { pass: 85, warning: 65, fail: 45 }
    },
    remediationGuidance: {
      summary: 'Document data security requirements',
      steps: [
        { order: 1, action: 'Define data classification scheme' },
        { order: 2, action: 'Document access control requirements' },
        { order: 3, action: 'Include encryption standards' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Security',
      edition: '2nd Edition'
    }
  },
  {
    code: 'DMBOK-SEC-002',
    name: 'Data Privacy Compliance',
    description: 'Document should address privacy and compliance requirements',
    rationale: 'Privacy compliance is legally required for personal data',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MAJOR',
    weight: 0.9,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-security', 'data-governance-plan', 'privacy-policy'],
    validationConfig: {
      keywords: ['privacy', 'gdpr', 'ccpa', 'pii', 'personal data', 'consent', 'data subject'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Document privacy compliance requirements',
      steps: [
        { order: 1, action: 'Identify applicable privacy regulations' },
        { order: 2, action: 'Document PII handling procedures' },
        { order: 3, action: 'Include consent management' }
      ],
      estimatedEffort: 'HIGH'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Security',
      edition: '2nd Edition'
    }
  },

  // Data Quality Rules
  {
    code: 'DMBOK-DQ-001',
    name: 'Data Quality Framework',
    description: 'Document must define data quality dimensions and standards',
    rationale: 'Quality framework ensures data fitness for use',
    validationType: 'SECTION_PRESENCE',
    severity: 'MAJOR',
    weight: 1.0,
    isActive: true,
    isRequired: true,
    applicableDocTypes: ['data-quality-plan', 'data-governance-plan'],
    validationConfig: {
      keywords: ['data quality', 'accuracy', 'completeness', 'consistency', 'timeliness', 'validity'],
      requiredSections: ['quality', 'dimensions'],
      thresholds: { pass: 80, warning: 60, fail: 40 }
    },
    remediationGuidance: {
      summary: 'Define data quality framework',
      steps: [
        { order: 1, action: 'Define data quality dimensions' },
        { order: 2, action: 'Set quality thresholds and KPIs' },
        { order: 3, action: 'Include quality monitoring processes' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Quality',
      edition: '2nd Edition'
    }
  },
  {
    code: 'DMBOK-DQ-002',
    name: 'Data Quality Metrics',
    description: 'Document should include data quality metrics and KPIs',
    rationale: 'Metrics enable objective quality measurement',
    validationType: 'METRIC_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-quality-plan'],
    validationConfig: {
      parameters: { requireMetrics: true },
      thresholds: { pass: 75, warning: 55, fail: 35 }
    },
    remediationGuidance: {
      summary: 'Add data quality metrics',
      steps: [
        { order: 1, action: 'Define measurable quality indicators' },
        { order: 2, action: 'Include target values' },
        { order: 3, action: 'Document measurement methods' }
      ],
      estimatedEffort: 'LOW'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Quality',
      edition: '2nd Edition'
    }
  },

  // Metadata Management Rules
  {
    code: 'DMBOK-META-001',
    name: 'Metadata Strategy',
    description: 'Document should include metadata management approach',
    rationale: 'Metadata provides context for understanding data',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-governance-plan', 'metadata-strategy'],
    validationConfig: {
      keywords: ['metadata', 'data catalog', 'data dictionary', 'lineage', 'glossary'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document metadata management',
      steps: [
        { order: 1, action: 'Define metadata types to capture' },
        { order: 2, action: 'Include data catalog requirements' },
        { order: 3, action: 'Document data lineage approach' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Metadata Management',
      edition: '2nd Edition'
    }
  },

  // Master Data Management Rules
  {
    code: 'DMBOK-MDM-001',
    name: 'Master Data Identification',
    description: 'Document should identify master data entities',
    rationale: 'Identifying master data ensures consistent enterprise data',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.8,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-governance-plan', 'master-data-plan'],
    validationConfig: {
      keywords: ['master data', 'reference data', 'golden record', 'single source of truth', 'customer', 'product'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document master data entities',
      steps: [
        { order: 1, action: 'Identify critical master data entities' },
        { order: 2, action: 'Define golden record criteria' },
        { order: 3, action: 'Document matching and merging rules' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Reference and Master Data',
      edition: '2nd Edition'
    }
  },

  // Data Integration Rules
  {
    code: 'DMBOK-INT-001',
    name: 'Integration Strategy',
    description: 'Document should define data integration approach',
    rationale: 'Integration strategy ensures consistent data movement',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-architecture', 'integration-design'],
    validationConfig: {
      keywords: ['integration', 'etl', 'api', 'interface', 'synchronization', 'replication'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document integration strategy',
      steps: [
        { order: 1, action: 'Define integration patterns' },
        { order: 2, action: 'Document API standards' },
        { order: 3, action: 'Include error handling approach' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Integration and Interoperability',
      edition: '2nd Edition'
    }
  },

  // Data Warehousing Rules
  {
    code: 'DMBOK-DW-001',
    name: 'Analytics Strategy',
    description: 'Document should include analytics and reporting approach',
    rationale: 'Analytics strategy ensures data supports decision-making',
    validationType: 'KEYWORD_PRESENCE',
    severity: 'MINOR',
    weight: 0.7,
    isActive: true,
    isRequired: false,
    applicableDocTypes: ['data-architecture', 'analytics-strategy'],
    validationConfig: {
      keywords: ['analytics', 'reporting', 'dashboard', 'warehouse', 'data mart', 'bi'],
      thresholds: { pass: 70, warning: 50, fail: 30 }
    },
    remediationGuidance: {
      summary: 'Document analytics approach',
      steps: [
        { order: 1, action: 'Define analytics requirements' },
        { order: 2, action: 'Include reporting strategy' },
        { order: 3, action: 'Document data warehouse approach' }
      ],
      estimatedEffort: 'MEDIUM'
    },
    standardsReference: {
      standardName: 'DMBOK',
      section: 'Data Warehousing and Business Intelligence',
      edition: '2nd Edition'
    }
  },
];

/**
 * Get the DMBOK standards pack definition
 */
export function getDMBOKPackDefinition(): Omit<StandardsPack, 'id' | 'rules' | 'categories' | 'createdAt' | 'updatedAt'> {
  return {
    packType: 'DMBOK',
    name: 'DMBOK Guide Compliance Pack',
    description: 'Standards compliance rules aligned with DMBOK 2nd Edition Knowledge Areas',
    version: '2.0',
    isActive: true,
  };
}

/**
 * Get all DMBOK categories
 */
export function getDMBOKCategories(): Omit<StandardsCategory, 'id' | 'packId'>[] {
  return DMBOK_CATEGORIES;
}

/**
 * Get all DMBOK rules
 */
export function getDMBOKRules(): Omit<ComplianceRule, 'id' | 'packId' | 'categoryId' | 'createdAt' | 'updatedAt'>[] {
  return DMBOK_RULES;
}

/**
 * Map rules to their categories
 */
export function getDMBOKRuleCategoryMapping(): Record<string, string> {
  return {
    'DMBOK-GOV-001': 'DATA_GOVERNANCE',
    'DMBOK-GOV-002': 'DATA_GOVERNANCE',
    'DMBOK-ARC-001': 'DATA_ARCHITECTURE',
    'DMBOK-ARC-002': 'DATA_ARCHITECTURE',
    'DMBOK-MOD-001': 'DATA_MODELING',
    'DMBOK-SEC-001': 'DATA_SECURITY',
    'DMBOK-SEC-002': 'DATA_SECURITY',
    'DMBOK-DQ-001': 'DATA_QUALITY',
    'DMBOK-DQ-002': 'DATA_QUALITY',
    'DMBOK-META-001': 'METADATA',
    'DMBOK-MDM-001': 'MASTER_DATA',
    'DMBOK-INT-001': 'DATA_INTEGRATION',
    'DMBOK-DW-001': 'DW_BI',
  };
}
