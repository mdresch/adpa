"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PMBOK6_DEPENDENCIES = exports.PMBOK6_PROCESSES = void 0;
exports.PMBOK6_PROCESSES = [
    {
        code: '4.1',
        name: 'Develop Project Charter',
        description: 'The process of developing a document that formally authorizes the existence of a project and provides the project manager with the authority to apply organizational resources to project activities.',
        inputs: ['Business documents', 'Agreements', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data gathering', 'Interpersonal and team skills', 'Meetings'],
        outputs: ['Project charter', 'Assumptions log'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.2',
        name: 'Develop Project Management Plan',
        description: 'The process of defining, preparing, and coordinating all subsidiary plans and integrating them into a comprehensive project management plan.',
        inputs: ['Project charter', 'Outputs from other processes', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data gathering', 'Interpersonal and team skills', 'Meetings'],
        outputs: ['Project management plan'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.3',
        name: 'Direct and Manage Project Work',
        description: 'The process of leading and performing the work defined in the project management plan.',
        inputs: ['Project management plan', 'Project documents', 'Approved change requests', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Project management information system', 'Meetings'],
        outputs: ['Deliverables', 'Work performance data', 'Issue log', 'Change requests'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.4',
        name: 'Manage Project Knowledge',
        description: 'The process of using existing knowledge and creating new knowledge to achieve the project\'s objectives.',
        inputs: ['Project management plan', 'Project documents', 'Deliverables', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Knowledge management', 'Information management', 'Interpersonal and team skills'],
        outputs: ['Lessons learned register'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.5',
        name: 'Monitor and Control Project Work',
        description: 'The process of tracking, reviewing, and reporting the overall progress to meet performance objectives.',
        inputs: ['Project management plan', 'Project documents', 'Work performance information', 'Agreements', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Decision making', 'Meetings'],
        outputs: ['Work performance reports', 'Change requests'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.6',
        name: 'Perform Integrated Change Control',
        description: 'The process of reviewing all change requests, approving changes and managing changes to deliverables.',
        inputs: ['Project management plan', 'Project documents', 'Work performance reports', 'Change requests', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Change control tools', 'Data analysis', 'Decision making', 'Meetings'],
        outputs: ['Approved change requests'],
        knowledgeArea: 'Integration'
    },
    {
        code: '4.7',
        name: 'Close Project or Phase',
        description: 'The process of finalizing all activities for the project, phase, or contract.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Accepted deliverables', 'Business documents', 'Agreements', 'Procurement documentation', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Meetings'],
        outputs: ['Project documents updates', 'Final product, service, or result transition', 'Final report'],
        knowledgeArea: 'Integration'
    },
    {
        code: '5.1',
        name: 'Plan Scope Management',
        description: 'The process of creating a scope management plan.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Meetings'],
        outputs: ['Scope management plan', 'Requirements management plan'],
        knowledgeArea: 'Scope'
    },
    {
        code: '5.2',
        name: 'Collect Requirements',
        description: 'The process of determining, documenting, and managing stakeholder needs.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Business documents', 'Agreements', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Decision making', 'Data representation', 'Interpersonal and team skills', 'Context diagram', 'Prototypes'],
        outputs: ['Requirements documentation', 'Requirements traceability matrix'],
        knowledgeArea: 'Scope'
    },
    {
        code: '5.3',
        name: 'Define Scope',
        description: 'The process of developing a detailed description of the project and product.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Decision making', 'Interpersonal and team skills', 'Product analysis'],
        outputs: ['Project scope statement'],
        knowledgeArea: 'Scope'
    },
    {
        code: '5.4',
        name: 'Create WBS',
        description: 'The process of subdividing project deliverables and project work into smaller components.',
        inputs: ['Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Decomposition'],
        outputs: ['Scope baseline'],
        knowledgeArea: 'Scope'
    },
    {
        code: '5.5',
        name: 'Validate Scope',
        description: 'The process of formalizing acceptance of the completed project deliverables.',
        inputs: ['Project management plan', 'Project documents', 'Verified deliverables', 'Work performance data'],
        tools: ['Inspection', 'Decision making'],
        outputs: ['Accepted deliverables', 'Work performance information'],
        knowledgeArea: 'Scope'
    },
    {
        code: '5.6',
        name: 'Control Scope',
        description: 'The process of monitoring the status of the project and product scope.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'Organizational process assets'],
        tools: ['Data analysis'],
        outputs: ['Work performance information', 'Change requests'],
        knowledgeArea: 'Scope'
    },
    {
        code: '6.1',
        name: 'Plan Schedule Management',
        description: 'Establishing policies for planning, developing, managing, executing, and controlling the project schedule.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Meetings'],
        outputs: ['Schedule management plan'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '6.2',
        name: 'Define Activities',
        description: 'Identifying and documenting specific actions to produce project deliverables.',
        inputs: ['Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Decomposition', 'Rolling wave planning', 'Meetings'],
        outputs: ['Activity list', 'Activity attributes', 'Milestone list', 'Change requests'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '6.3',
        name: 'Sequence Activities',
        description: 'Identifying and documenting relationships among project activities.',
        inputs: ['Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Precedence diagramming method', 'Dependency determination and integration', 'Leads and lags', 'PMIS'],
        outputs: ['Project schedule network diagrams'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '6.4',
        name: 'Estimate Activity Durations',
        description: 'Estimating the number of work periods needed to complete individual activities.',
        inputs: ['Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Analogous estimating', 'Parametric estimating', 'Three-point estimating', 'Bottom-up estimating', 'Data analysis'],
        outputs: ['Duration estimates', 'Basis of estimates'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '6.5',
        name: 'Develop Schedule',
        description: 'Analyzing activity sequences, durations, resource requirements, and constraints to create the schedule model.',
        inputs: ['Project management plan', 'Project documents', 'Agreements', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Schedule network analysis', 'Critical path method', 'Resource optimization', 'Data analysis', 'Leads and lags', 'Schedule compression'],
        outputs: ['Schedule baseline', 'Project schedule', 'Schedule data', 'Project calendars'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '6.6',
        name: 'Control Schedule',
        description: 'Monitoring the status of project activities to update progress and manage changes to the schedule baseline.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'Organizational process assets'],
        tools: ['Data analysis', 'Critical path method', 'PMIS', 'Resource optimization', 'Leads and lags', 'Schedule compression'],
        outputs: ['Work performance information', 'Schedule forecasts', 'Change requests'],
        knowledgeArea: 'Schedule'
    },
    {
        code: '7.1',
        name: 'Plan Cost Management',
        description: 'Defining how project costs will be estimated, budgeted, managed, monitored, and controlled.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'Meetings'],
        outputs: ['Cost management plan'],
        knowledgeArea: 'Cost'
    },
    {
        code: '7.2',
        name: 'Estimate Costs',
        description: 'Approximating the monetary resources needed to complete project work.',
        inputs: ['Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Analogous estimating', 'Parametric estimating', 'Bottom-up estimating', 'Three-point estimating', 'Data analysis'],
        outputs: ['Cost estimates', 'Basis of estimates'],
        knowledgeArea: 'Cost'
    },
    {
        code: '7.3',
        name: 'Determine Budget',
        description: 'Aggregating estimated costs of individual activities to establish an authorized cost baseline.',
        inputs: ['Project management plan', 'Project documents', 'Business documents', 'Agreements', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Cost aggregation', 'Data analysis', 'Historical information review', 'Funding limit reconciliation'],
        outputs: ['Cost baseline', 'Project funding requirements'],
        knowledgeArea: 'Cost'
    },
    {
        code: '7.4',
        name: 'Control Costs',
        description: 'Monitoring the status of the project to update costs and managing changes to the cost baseline.',
        inputs: ['Project management plan', 'Project documents', 'Project funding requirements', 'Work performance data', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data analysis', 'To-complete performance index', 'PMIS'],
        outputs: ['Work performance information', 'Cost forecasts', 'Change requests'],
        knowledgeArea: 'Cost'
    },
    {
        code: '8.1',
        name: 'Plan Quality Management',
        description: 'Identifying quality requirements and standards for the project and deliverables.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Enterprise environmental factors', 'Organizational process assets'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Decision making', 'Data representation', 'Test and inspection planning'],
        outputs: ['Quality management plan', 'Quality metrics'],
        knowledgeArea: 'Quality'
    },
    {
        code: '8.2',
        name: 'Manage Quality',
        description: 'Translating the quality management plan into executable quality activities.',
        inputs: ['Project management plan', 'Project documents', 'Organizational process assets'],
        tools: ['Data gathering', 'Data analysis', 'Decision making', 'Data representation', 'Audits', 'Design for X', 'Problem solving'],
        outputs: ['Quality reports', 'Test and evaluation documents', 'Change requests'],
        knowledgeArea: 'Quality'
    },
    {
        code: '8.3',
        name: 'Control Quality',
        description: 'Monitoring and recording results of quality activities to assess performance.',
        inputs: ['Project management plan', 'Project documents', 'Approved change requests', 'Deliverables', 'Work performance data', 'EEFs', 'OPAs'],
        tools: ['Data gathering', 'Data analysis', 'Inspection', 'Testing/product evaluations', 'Data representation', 'Meetings'],
        outputs: ['Quality control measurements', 'Verified deliverables', 'Work performance information', 'Change requests'],
        knowledgeArea: 'Quality'
    },
    {
        code: '9.1',
        name: 'Plan Resource Management',
        description: 'Defining how to estimate, acquire, manage, and utilize physical and team resources.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data representation', 'Organizational theory', 'Meetings'],
        outputs: ['Resource management plan', 'Team charter'],
        knowledgeArea: 'Resources'
    },
    {
        code: '9.2',
        name: 'Estimate Activity Resources',
        description: 'Estimating team resources and quantities of materials, equipment, and supplies.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Bottom-up estimating', 'Analogous estimating', 'Parametric estimating', 'Data analysis', 'PMIS'],
        outputs: ['Resource requirements', 'Basis of estimates', 'Resource breakdown structure'],
        knowledgeArea: 'Resources'
    },
    {
        code: '9.3',
        name: 'Acquire Resources',
        description: 'Obtaining team members, facilities, equipment, and materials necessary for project work.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Decision making', 'Interpersonal skills', 'Pre-assignment', 'Virtual teams', 'Negotiation'],
        outputs: ['Physical resource assignments', 'Project team assignments', 'Resource calendars', 'Change requests'],
        knowledgeArea: 'Resources'
    },
    {
        code: '9.4',
        name: 'Develop Team',
        description: 'Improving competencies and team environment to enhance project performance.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Colocation', 'Virtual teams', 'Communication technology', 'Interpersonal skills', 'Recognition and rewards', 'Training'],
        outputs: ['Team performance assessments', 'Change requests'],
        knowledgeArea: 'Resources'
    },
    {
        code: '9.5',
        name: 'Manage Team',
        description: 'Tracking performance, providing feedback, and resolving issues to optimize project performance.',
        inputs: ['Project management plan', 'Project documents', 'Work performance reports', 'Team performance assessments', 'EEFs', 'OPAs'],
        tools: ['Interpersonal skills', 'PMIS'],
        outputs: ['Change requests'],
        knowledgeArea: 'Resources'
    },
    {
        code: '9.6',
        name: 'Control Resources',
        description: 'Ensuring physical resources are available as planned and monitoring their use.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'Agreements', 'OPAs'],
        tools: ['Data analysis', 'Problem solving', 'Interpersonal skills', 'PMIS'],
        outputs: ['Work performance information', 'Change requests'],
        knowledgeArea: 'Resources'
    },
    {
        code: '10.1',
        name: 'Plan Communications Management',
        description: 'Developing an appropriate approach and plan for communications.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Communication requirements analysis', 'Communication technology', 'Communication models', 'Communication methods'],
        outputs: ['Communications management plan'],
        knowledgeArea: 'Communications'
    },
    {
        code: '10.2',
        name: 'Manage Communications',
        description: 'Ensuring timely and appropriate collection, creation, and distribution of project information.',
        inputs: ['Project management plan', 'Project documents', 'Work performance reports', 'EEFs', 'OPAs'],
        tools: ['Communication technology', 'Communication methods', 'Communication skills', 'PMIS', 'Project reporting'],
        outputs: ['Project communications'],
        knowledgeArea: 'Communications'
    },
    {
        code: '10.3',
        name: 'Monitor Communications',
        description: 'Ensuring the information needs of the project and stakeholders are met.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'PMIS', 'Data representation', 'Interpersonal skills', 'Meetings'],
        outputs: ['Work performance information', 'Change requests'],
        knowledgeArea: 'Communications'
    },
    {
        code: '11.1',
        name: 'Plan Risk Management',
        description: 'Defining how to conduct risk management activities.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data analysis', 'Meetings'],
        outputs: ['Risk management plan'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.2',
        name: 'Identify Risks',
        description: 'Identifying individual project risks and sources of overall risk.',
        inputs: ['Project management plan', 'Project documents', 'Agreements', 'Procurement documentation', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Interpersonal skills', 'Prompt lists'],
        outputs: ['Risk register', 'Risk report'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.3',
        name: 'Perform Qualitative Risk Analysis',
        description: 'Prioritizing risks for further analysis by assessing their probability and impact.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Interpersonal skills', 'Risk categorization'],
        outputs: ['Project documents updates'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.4',
        name: 'Perform Quantitative Risk Analysis',
        description: 'Numerically analyzing the combined effect of identified risks on objectives.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Interpersonal skills', 'Representations of uncertainty', 'Data analysis'],
        outputs: ['Project documents updates'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.5',
        name: 'Plan Risk Responses',
        description: 'Developing options and selecting strategies to address risk exposure.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Interpersonal skills', 'Strategies for threats/opportunities', 'Data analysis'],
        outputs: ['Change requests', 'Project management plan updates'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.6',
        name: 'Implement Risk Responses',
        description: 'Implementing agreed-upon risk response plans.',
        inputs: ['Project management plan', 'Project documents', 'OPAs'],
        tools: ['Expert judgment', 'Interpersonal skills', 'PMIS'],
        outputs: ['Change requests'],
        knowledgeArea: 'Risk'
    },
    {
        code: '11.7',
        name: 'Monitor Risks',
        description: 'Monitoring implemented response plans and tracking identified risks.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'Work performance reports'],
        tools: ['Data analysis', 'Audits', 'Meetings'],
        outputs: ['Work performance information', 'Change requests'],
        knowledgeArea: 'Risk'
    },
    {
        code: '12.1',
        name: 'Plan Procurement Management',
        description: 'Documenting procurement decisions and identifying potential sellers.',
        inputs: ['Project charter', 'Business documents', 'Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Source selection analysis'],
        outputs: ['Procurement management plan', 'Procurement strategy', 'Bid documents'],
        knowledgeArea: 'Procurement'
    },
    {
        code: '12.2',
        name: 'Conduct Procurements',
        description: 'Obtaining seller responses, selecting a seller, and awarding a contract.',
        inputs: ['Project management plan', 'Project documents', 'Procurement documentation', 'Seller proposals', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Advertising', 'Bidder conferences', 'Data analysis', 'Interpersonal skills'],
        outputs: ['Selected sellers', 'Agreements', 'Change requests'],
        knowledgeArea: 'Procurement'
    },
    {
        code: '12.3',
        name: 'Control Procurements',
        description: 'Managing procurement relationships and monitoring contract performance.',
        inputs: ['Project management plan', 'Project documents', 'Agreements', 'Procurement documentation', 'Approved change requests'],
        tools: ['Expert judgment', 'Claims administration', 'Data analysis', 'Inspection', 'Audits'],
        outputs: ['Closed procurements', 'Work performance information', 'Change requests'],
        knowledgeArea: 'Procurement'
    },
    {
        code: '13.1',
        name: 'Identify Stakeholders',
        description: 'Identifying stakeholders regularly and analyzing their interests and impact.',
        inputs: ['Project charter', 'Business documents', 'Project management plan', 'Project documents', 'Agreements', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Data representation', 'Meetings'],
        outputs: ['Stakeholder register', 'Change requests'],
        knowledgeArea: 'Stakeholders'
    },
    {
        code: '13.2',
        name: 'Plan Stakeholder Engagement',
        description: 'Developing approaches to involve stakeholders based on their needs.',
        inputs: ['Project charter', 'Project management plan', 'Project documents', 'Agreements', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Data gathering', 'Data analysis', 'Decision making', 'Data representation'],
        outputs: ['Stakeholder engagement plan'],
        knowledgeArea: 'Stakeholders'
    },
    {
        code: '13.3',
        name: 'Manage Stakeholder Engagement',
        description: 'Communicating and working with stakeholders to meet their needs.',
        inputs: ['Project management plan', 'Project documents', 'EEFs', 'OPAs'],
        tools: ['Expert judgment', 'Communication skills', 'Interpersonal skills', 'Ground rules'],
        outputs: ['Change requests'],
        knowledgeArea: 'Stakeholders'
    },
    {
        code: '13.4',
        name: 'Monitor Stakeholder Engagement',
        description: 'Monitoring overall project stakeholder relationships.',
        inputs: ['Project management plan', 'Project documents', 'Work performance data', 'EEFs', 'OPAs'],
        tools: ['Data analysis', 'Decision making', 'Data representation', 'Communication skills', 'Interpersonal skills'],
        outputs: ['Work performance information', 'Change requests'],
        knowledgeArea: 'Stakeholders'
    }
];
exports.PMBOK6_DEPENDENCIES = [
    { source: '4.1', target: '13.1', type: 'FS', lagWeeks: 0 },
    { source: '4.1', target: '4.2', type: 'FS', lagWeeks: 0 },
    { source: '13.1', target: '13.2', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '5.1', type: 'FS', lagWeeks: 0 },
    { source: '5.1', target: '5.2', type: 'FS', lagWeeks: 0 },
    { source: '5.2', target: '5.3', type: 'FS', lagWeeks: 0 },
    { source: '5.3', target: '5.4', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '6.1', type: 'FS', lagWeeks: 0 },
    { source: '5.4', target: '6.2', type: 'FS', lagWeeks: 0 },
    { source: '6.2', target: '6.3', type: 'FS', lagWeeks: 0 },
    { source: '6.3', target: '6.4', type: 'FS', lagWeeks: 0 },
    { source: '6.4', target: '6.5', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '7.1', type: 'FS', lagWeeks: 0 },
    { source: '6.5', target: '7.2', type: 'FS', lagWeeks: 0 },
    { source: '7.2', target: '7.3', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '8.1', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '9.1', type: 'FS', lagWeeks: 0 },
    { source: '9.1', target: '9.2', type: 'FS', lagWeeks: 0 },
    { source: '9.1', target: '9.3', type: 'FS', lagWeeks: 0 },
    { source: '9.3', target: '9.4', type: 'FS', lagWeeks: 0 },
    { source: '9.4', target: '9.5', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '10.1', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '11.1', type: 'FS', lagWeeks: 0 },
    { source: '11.1', target: '11.2', type: 'FS', lagWeeks: 0 },
    { source: '11.2', target: '11.3', type: 'FS', lagWeeks: 0 },
    { source: '11.3', target: '11.4', type: 'FS', lagWeeks: 0 },
    { source: '11.4', target: '11.5', type: 'FS', lagWeeks: 0 },
    { source: '11.5', target: '11.6', type: 'FS', lagWeeks: 0 },
    { source: '11.6', target: '11.7', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '12.1', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '4.3', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '4.4', type: 'FS', lagWeeks: 0 },
    { source: '8.1', target: '8.2', type: 'FS', lagWeeks: 0 },
    { source: '8.2', target: '8.3', type: 'FS', lagWeeks: 0 },
    { source: '9.5', target: '9.6', type: 'FS', lagWeeks: 0 },
    { source: '10.2', target: '10.3', type: 'FS', lagWeeks: 0 },
    { source: '12.2', target: '12.3', type: 'FS', lagWeeks: 0 },
    { source: '13.3', target: '13.4', type: 'FS', lagWeeks: 0 },
    { source: '4.2', target: '4.5', type: 'FS', lagWeeks: 0 },
    { source: '5.4', target: '5.5', type: 'FS', lagWeeks: 0 },
    { source: '5.3', target: '5.6', type: 'FS', lagWeeks: 0 },
    { source: '6.5', target: '6.6', type: 'FS', lagWeeks: 0 },
    { source: '7.3', target: '7.4', type: 'FS', lagWeeks: 0 },
    { source: '4.5', target: '4.6', type: 'FS', lagWeeks: 0 },
    { source: '5.5', target: '4.7', type: 'FS', lagWeeks: 0 },
    { source: '12.3', target: '4.7', type: 'FS', lagWeeks: 0 },
];
