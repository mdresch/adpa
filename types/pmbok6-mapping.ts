/**
 * PMBOK 6th Edition - Comprehensive Process & Deliverable Mapping Registry
 * 
 * Maps all 49 processes and their 94+ deliverables to extracted entity types
 * for Tier 3 High-Integrity Compliance Auditing.
 */

export interface ProcessRequirement {
  entityType: string;
  minCount: number;
  weight: number; 
}

export interface PMBOK6ProcessMapping {
  code: string;
  name: string;
  requirements: ProcessRequirement[];
  deliverables: string[];
}

export const PMBOK6_PROCESS_MAP: PMBOK6ProcessMapping[] = [
  // 4. INTEGRATION MANAGEMENT
  {
    code: '4.1',
    name: 'Develop Project Charter',
    requirements: [
      { entityType: 'governanceDecisions', minCount: 1, weight: 0.5 },
      { entityType: 'stakeholders', minCount: 5, weight: 0.5 }
    ],
    deliverables: ['Project Charter', 'Assumptions Log']
  },
  {
    code: '4.2',
    name: 'Develop Project Management Plan',
    requirements: [
      { entityType: 'scopeBaselines', minCount: 1, weight: 0.3 },
      { entityType: 'scheduleBaselines', minCount: 1, weight: 0.3 },
      { entityType: 'budgetBaselines', minCount: 1, weight: 0.4 }
    ],
    deliverables: ['Project Management Plan']
  },
  {
    code: '4.3',
    name: 'Direct and Manage Project Work',
    requirements: [
      { entityType: 'workItems', minCount: 10, weight: 0.6 },
      { entityType: 'deliverables', minCount: 3, weight: 0.4 }
    ],
    deliverables: ['Deliverables', 'Work Performance Data', 'Issue Log']
  },
  {
    code: '4.4',
    name: 'Manage Project Knowledge',
    requirements: [
      { entityType: 'bestPractices', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Lessons Learned Register']
  },
  {
    code: '4.5',
    name: 'Monitor and Control Project Work',
    requirements: [
      { entityType: 'performanceMeasurements', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Work Performance Reports', 'Change Requests']
  },
  {
    code: '4.6',
    name: 'Perform Integrated Change Control',
    requirements: [
      { entityType: 'scopeChangeRequests', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Approved Change Requests', 'Change Log']
  },
  {
    code: '4.7',
    name: 'Close Project or Phase',
    requirements: [
      { entityType: 'deliverables', minCount: 1, weight: 0.5 },
      { entityType: 'governanceDecisions', minCount: 1, weight: 0.5 }
    ],
    deliverables: ['Final Product/Service/Result Transition', 'Final Report']
  },

  // 5. SCOPE MANAGEMENT
  {
    code: '5.1',
    name: 'Plan Scope Management',
    requirements: [
      { entityType: 'scopeBaselines', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Scope Management Plan', 'Requirements Management Plan']
  },
  {
    code: '5.2',
    name: 'Collect Requirements',
    requirements: [
      { entityType: 'requirements', minCount: 15, weight: 0.7 },
      { entityType: 'stakeholders', minCount: 5, weight: 0.3 }
    ],
    deliverables: ['Requirements Documentation', 'Requirements Traceability Matrix']
  },
  {
    code: '5.3',
    name: 'Define Scope',
    requirements: [
      { entityType: 'scopeItems', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Project Scope Statement']
  },
  {
    code: '5.4',
    name: 'Create WBS',
    requirements: [
      { entityType: 'wbsNodes', minCount: 15, weight: 0.7 },
      { entityType: 'deliverables', minCount: 5, weight: 0.3 }
    ],
    deliverables: ['Work Breakdown Structure', 'WBS Dictionary', 'Scope Baseline']
  },
  {
    code: '5.5',
    name: 'Validate Scope',
    requirements: [
      { entityType: 'deliverables', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Accepted Deliverables', 'Work Performance Information']
  },
  {
    code: '5.6',
    name: 'Control Scope',
    requirements: [
      { entityType: 'scopeChangeRequests', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Change Requests', 'Scope Baseline Updates']
  },

  // 6. SCHEDULE MANAGEMENT
  {
    code: '6.1',
    name: 'Plan Schedule Management',
    requirements: [
      { entityType: 'scheduleBaselines', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Schedule Management Plan']
  },
  {
    code: '6.2',
    name: 'Define Activities',
    requirements: [
      { entityType: 'activities', minCount: 20, weight: 0.8 },
      { entityType: 'milestones', minCount: 5, weight: 0.2 }
    ],
    deliverables: ['Activity List', 'Activity Attributes', 'Milestone List']
  },
  {
    code: '6.3',
    name: 'Sequence Activities',
    requirements: [
      { entityType: 'activities', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Project Schedule Network Diagrams']
  },
  {
    code: '6.4',
    name: 'Estimate Activity Durations',
    requirements: [
      { entityType: 'activities', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Duration Estimates', 'Basis of Estimates']
  },
  {
    code: '6.5',
    name: 'Develop Schedule',
    requirements: [
      { entityType: 'activities', minCount: 15, weight: 0.6 },
      { entityType: 'milestones', minCount: 10, weight: 0.4 }
    ],
    deliverables: ['Project Schedule', 'Schedule Baseline', 'Schedule Data']
  },
  {
    code: '6.6',
    name: 'Control Schedule',
    requirements: [
      { entityType: 'performanceMeasurements', minCount: 3, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Schedule Forecasts', 'Change Requests']
  },

  // 7. COST MANAGEMENT
  {
    code: '7.1',
    name: 'Plan Cost Management',
    requirements: [
      { entityType: 'budgetBaselines', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Cost Management Plan']
  },
  {
    code: '7.2',
    name: 'Estimate Costs',
    requirements: [
      { entityType: 'costEstimates', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Cost Estimates', 'Basis of Estimates']
  },
  {
    code: '7.3',
    name: 'Determine Budget',
    requirements: [
      { entityType: 'budgetBaselines', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Cost Baseline', 'Project Funding Requirements']
  },
  {
    code: '7.4',
    name: 'Control Costs',
    requirements: [
      { entityType: 'financialVariances', minCount: 3, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Cost Forecasts', 'Change Requests']
  },

  // 8. QUALITY MANAGEMENT
  {
    code: '8.1',
    name: 'Plan Quality Management',
    requirements: [
      { entityType: 'qualityStandards', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Quality Management Plan', 'Quality Metrics']
  },
  {
    code: '8.2',
    name: 'Manage Quality',
    requirements: [
      { entityType: 'qualityStandards', minCount: 3, weight: 1.0 }
    ],
    deliverables: ['Quality Reports', 'Test and Evaluation Documents']
  },
  {
    code: '8.3',
    name: 'Control Quality',
    requirements: [
      { entityType: 'qualityStandards', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Quality Control Measurements', 'Verified Deliverables']
  },

  // 9. RESOURCE MANAGEMENT
  {
    code: '9.1',
    name: 'Plan Resource Management',
    requirements: [
      { entityType: 'teamAgreements', minCount: 1, weight: 0.5 },
      { entityType: 'resourcePool', minCount: 5, weight: 0.5 }
    ],
    deliverables: ['Resource Management Plan', 'Team Charter']
  },
  {
    code: '9.2',
    name: 'Estimate Activity Resources',
    requirements: [
      { entityType: 'resourcePool', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Resource Requirements', 'Basis of Estimates', 'Resource Breakdown Structure']
  },
  {
    code: '9.3',
    name: 'Acquire Resources',
    requirements: [
      { entityType: 'resourcePool', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Physical Resource Assignments', 'Project Team Assignments']
  },
  {
    code: '9.4',
    name: 'Develop Team',
    requirements: [
      { entityType: 'stakeholders', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Team Performance Assessments']
  },
  {
    code: '9.5',
    name: 'Manage Team',
    requirements: [
      { entityType: 'stakeholderIssues', minCount: 3, weight: 1.0 }
    ],
    deliverables: ['Change Requests', 'Project Management Plan Updates']
  },
  {
    code: '9.6',
    name: 'Control Resources',
    requirements: [
      { entityType: 'utilizationRecords', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Change Requests']
  },

  // 10. COMMUNICATIONS MANAGEMENT
  {
    code: '10.1',
    name: 'Plan Communications Management',
    requirements: [
      { entityType: 'engagementActions', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Communications Management Plan']
  },
  {
    code: '10.2',
    name: 'Manage Communications',
    requirements: [
      { entityType: 'communicationLogs', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Project Communications']
  },
  {
    code: '10.3',
    name: 'Monitor Communications',
    requirements: [
      { entityType: 'communicationLogs', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Change Requests']
  },

  // 11. RISK MANAGEMENT
  {
    code: '11.1',
    name: 'Plan Risk Management',
    requirements: [
      { entityType: 'risks', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Risk Management Plan']
  },
  {
    code: '11.2',
    name: 'Identify Risks',
    requirements: [
      { entityType: 'risks', minCount: 15, weight: 0.8 },
      { entityType: 'constraints', minCount: 5, weight: 0.2 }
    ],
    deliverables: ['Risk Register', 'Risk Report']
  },
  {
    code: '11.3',
    name: 'Perform Qualitative Risk Analysis',
    requirements: [
      { entityType: 'riskAssessments', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Risk Register Updates']
  },
  {
    code: '11.4',
    name: 'Perform Quantitative Risk Analysis',
    requirements: [
      { entityType: 'riskAssessments', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Risk Report Updates']
  },
  {
    code: '11.5',
    name: 'Plan Risk Responses',
    requirements: [
      { entityType: 'riskResponsePlans', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Risk Register Updates', 'Risk Report Updates', 'Change Requests']
  },
  {
    code: '11.6',
    name: 'Implement Risk Responses',
    requirements: [
      { entityType: 'riskResponsePlans', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Change Requests']
  },
  {
    code: '11.7',
    name: 'Monitor Risks',
    requirements: [
      { entityType: 'risks', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Change Requests']
  },

  // 12. PROCUREMENT MANAGEMENT
  {
    code: '12.1',
    name: 'Plan Procurement Management',
    requirements: [
      { entityType: 'procurementCosts', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Procurement Management Plan', 'Procurement Strategy', 'Bid Documents']
  },
  {
    code: '12.2',
    name: 'Conduct Procurements',
    requirements: [
      { entityType: 'procurementCosts', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Selected Sellers', 'Agreements']
  },
  {
    code: '12.3',
    name: 'Control Procurements',
    requirements: [
      { entityType: 'procurementCosts', minCount: 1, weight: 1.0 }
    ],
    deliverables: ['Closed Procurements', 'Work Performance Information']
  },

  // 13. STAKEHOLDER MANAGEMENT
  {
    code: '13.1',
    name: 'Identify Stakeholders',
    requirements: [
      { entityType: 'stakeholders', minCount: 10, weight: 0.7 },
      { entityType: 'engagementActions', minCount: 2, weight: 0.3 }
    ],
    deliverables: ['Stakeholder Register']
  },
  {
    code: '13.2',
    name: 'Plan Stakeholder Engagement',
    requirements: [
      { entityType: 'engagementActions', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Stakeholder Engagement Plan']
  },
  {
    code: '13.3',
    name: 'Manage Stakeholder Engagement',
    requirements: [
      { entityType: 'communicationLogs', minCount: 10, weight: 1.0 }
    ],
    deliverables: ['Change Requests', 'Stakeholder Engagement Plan Updates']
  },
  {
    code: '13.4',
    name: 'Monitor Stakeholder Engagement',
    requirements: [
      { entityType: 'relationshipHealth', minCount: 5, weight: 1.0 }
    ],
    deliverables: ['Work Performance Information', 'Change Requests']
  }
];

export const PMBOK6_DELIVERABLE_MAP: Record<string, string[]> = {
  'Project Charter': ['governanceDecisions'],
  'Assumptions Log': ['constraints'],
  'Project Management Plan': ['scopeBaselines', 'scheduleBaselines', 'budgetBaselines'],
  'Deliverables': ['deliverables'],
  'Work Performance Data': ['performanceMeasurements'],
  'Issue Log': ['stakeholderIssues'],
  'Lessons Learned Register': ['bestPractices'],
  'Work Performance Reports': ['performanceMeasurements'],
  'Change Requests': ['scopeChangeRequests'],
  'Approved Change Requests': ['scopeChangeRequests'],
  'Change Log': ['scopeChangeRequests'],
  'Final Product/Service/Result Transition': ['governanceDecisions'],
  'Final Report': ['governanceDecisions'],
  'Scope Management Plan': ['scopeBaselines'],
  'Requirements Management Plan': ['requirements'],
  'Requirements Documentation': ['requirements'],
  'Requirements Traceability Matrix': ['requirementsTraceability'],
  'Project Scope Statement': ['scopeItems'],
  'Work Breakdown Structure': ['wbsNodes'],
  'WBS Dictionary': ['wbsNodes'],
  'Scope Baseline': ['scopeBaselines', 'wbsNodes'],
  'Accepted Deliverables': ['deliverables'],
  'Work Performance Information': ['performanceMeasurements'],
  'Scope Baseline Updates': ['scopeBaselines', 'wbsNodes'],
  'Schedule Management Plan': ['scheduleBaselines'],
  'Activity List': ['activities'],
  'Activity Attributes': ['activities'],
  'Milestone List': ['milestones'],
  'Project Schedule Network Diagrams': ['activities'],
  'Duration Estimates': ['activities'],
  'Basis of Estimates': ['activities', 'costEstimates', 'resourcePool'],
  'Project Schedule': ['activities', 'milestones'],
  'Schedule Baseline': ['scheduleBaselines'],
  'Schedule Data': ['activities'],
  'Schedule Forecasts': ['performanceMeasurements'],
  'Cost Management Plan': ['budgetBaselines'],
  'Cost Estimates': ['costEstimates'],
  'Cost Baseline': ['budgetBaselines'],
  'Project Funding Requirements': ['budgetBaselines'],
  'Cost Forecasts': ['financialVariances'],
  'Quality Management Plan': ['qualityStandards'],
  'Quality Metrics': ['qualityStandards'],
  'Quality Reports': ['qualityStandards'],
  'Test and Evaluation Documents': ['qualityStandards'],
  'Quality Control Measurements': ['qualityStandards'],
  'Verified Deliverables': ['deliverables'],
  'Resource Management Plan': ['teamAgreements'],
  'Team Charter': ['teamAgreements'],
  'Resource Requirements': ['resourcePool'],
  'Resource Breakdown Structure': ['resourcePool'],
  'Physical Resource Assignments': ['resourcePool'],
  'Project Team Assignments': ['resourcePool'],
  'Team Performance Assessments': ['stakeholders'],
  'Project Management Plan Updates': ['scopeBaselines', 'scheduleBaselines', 'budgetBaselines'],
  'Communications Management Plan': ['engagementActions'],
  'Project Communications': ['communicationLogs'],
  'Risk Management Plan': ['risks'],
  'Risk Register': ['risks', 'riskAssessments'],
  'Risk Report': ['risks', 'riskAssessments'],
  'Risk Register Updates': ['risks', 'riskAssessments', 'riskResponsePlans'],
  'Risk Report Updates': ['risks', 'riskAssessments', 'riskResponsePlans'],
  'Procurement Management Plan': ['procurementCosts'],
  'Procurement Strategy': ['procurementCosts'],
  'Bid Documents': ['procurementCosts'],
  'Selected Sellers': ['procurementCosts'],
  'Agreements': ['procurementCosts'],
  'Closed Procurements': ['procurementCosts'],
  'Stakeholder Register': ['stakeholders'],
  'Stakeholder Engagement Plan': ['engagementActions'],
  'Stakeholder Engagement Plan Updates': ['engagementActions']
};
