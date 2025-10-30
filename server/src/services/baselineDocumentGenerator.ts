/**
 * Baseline Document Generator
 * Converts extracted baseline JSON into formal PMBOK-style baseline document
 */

export function generateFormalBaselineDocument(baseline: any, projectName: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  let document = `# Project Baselines: ${projectName}

**Project ID:** ${baseline.project_id || 'N/A'}  
**Date:** ${date}  
**Version:** ${baseline.version || '1.0'}  
**Status:** ${baseline.status || 'draft'}  

**Baseline Quality Metrics:**
- **Extraction Confidence:** ${Math.round((baseline.extraction_confidence || 0) * 100)}%
- **Completeness:** ${Math.round((baseline.completeness_score || 0) * 100)}%
- **Consistency:** ${Math.round((baseline.consistency_score || 0) * 100)}%

---

## 1. Scope Baseline (WBS & Scope Statement)

The Scope Baseline is the approved version of the project scope statement, WBS, and WBS dictionary.

`

  // Scope Baseline
  if (baseline.scope_baseline) {
    const scope = baseline.scope_baseline
    
    // Key Deliverables
    if (scope.deliverables && scope.deliverables.length > 0) {
      document += `### 1.1 Key Deliverables (Product & Project Scope)\n\n`
      document += `| ID | Deliverable Name | Description |\n`
      document += `|:---|:-----------------|:------------|\n`
      scope.deliverables.forEach((deliverable: any, idx: number) => {
        const name = typeof deliverable === 'string' ? deliverable : (deliverable.name || `Deliverable ${idx + 1}`)
        const desc = typeof deliverable === 'object' ? (deliverable.description || 'Extracted from documents') : 'Extracted from documents'
        document += `| D${idx + 1} | ${name} | ${desc} |\n`
      })
      document += `\n`
    } else {
      document += `### 1.1 Key Deliverables\n\n`
      document += `⚠️ **Missing Data:** No deliverables extracted from documents.\n\n`
      document += `**Recommendation:** Create a **Project Charter** or **Scope Statement** document that clearly lists project deliverables.\n\n`
    }
    
    // Scope Boundaries
    if (scope.scope_boundaries && scope.scope_boundaries.length > 0) {
      document += `### 1.2 Scope Boundaries (In-Scope & Exclusions)\n\n`
      document += `| Category | Boundary Description |\n`
      document += `|:---------|:---------------------|\n`
      
      const inScope = scope.scope_boundaries.filter((b: string) => 
        b.toLowerCase().includes('in-scope') || b.toLowerCase().includes('in scope') || !b.toLowerCase().includes('out')
      )
      const outScope = scope.scope_boundaries.filter((b: string) => 
        b.toLowerCase().includes('out-of-scope') || b.toLowerCase().includes('exclusion')
      )
      
      if (inScope.length > 0) {
        document += `| **IN-SCOPE** | ${inScope.join('; ')} |\n`
      }
      if (outScope.length > 0) {
        document += `| **OUT-OF-SCOPE** | ${outScope.join('; ')} |\n`
      }
      document += `\n`
    }
    
    // Project Objectives
    if (scope.project_objectives && scope.project_objectives.length > 0) {
      document += `### 1.3 Project Objectives\n\n`
      scope.project_objectives.forEach((obj: string, idx: number) => {
        document += `${idx + 1}. ${obj}\n`
      })
      document += `\n`
    }
    
    // Assumptions
    if (scope.assumptions && scope.assumptions.length > 0) {
      document += `### 1.4 Project Assumptions\n\n`
      scope.assumptions.forEach((assumption: string) => {
        document += `- ${assumption}\n`
      })
      document += `\n`
    }
    
    // Constraints
    if (scope.constraints && scope.constraints.length > 0) {
      document += `### 1.5 Project Constraints\n\n`
      scope.constraints.forEach((constraint: any) => {
        const text = typeof constraint === 'string' ? constraint : 
                    (constraint.description || constraint.name || constraint.title || 'Constraint')
        document += `- ${text}\n`
      })
      document += `\n`
    }
  } else {
    document += `⚠️ **Missing Data:** Scope baseline not extracted.\n\n`
    document += `**Recommendation:** Upload a **Project Charter** or **Business Case** document.\n\n`
  }
  
  // Check for missing WBS details
  document += `### 1.6 Work Breakdown Structure (WBS)\n\n`
  document += `⚠️ **Detailed WBS Not Available:** The baseline extraction captured high-level deliverables but not a detailed WBS hierarchy.\n\n`
  document += `**Recommendation:** Create or upload a **WBS document** with:\n`
  document += `- Work package breakdown\n`
  document += `- WBS dictionary\n`
  document += `- Responsibility assignments (RACI)\n\n`
  document += `**Template Available:** Use "WBS Template" to generate this document.\n\n`
  
  document += `---\n\n`

  // Technical Baseline
  document += `## 2. Technical Baseline\n\n`
  document += `The Technical Baseline represents the approved technology stack and architectural design.\n\n`
  
  if (baseline.technical_baseline) {
    const tech = baseline.technical_baseline
    
    if (tech.technology_stack && tech.technology_stack.length > 0) {
      document += `### 2.1 Technology Stack\n\n`
      document += `| Component | Technology | \n`
      document += `|:----------|:-----------|\n`
      tech.technology_stack.forEach((technology: string, idx: number) => {
        document += `| Component ${idx + 1} | ${technology} |\n`
      })
      document += `\n`
    }
    
    if (tech.architecture) {
      document += `### 2.2 Architecture\n\n`
      document += `${tech.architecture}\n\n`
    }
    
    if (tech.technical_requirements && tech.technical_requirements.length > 0) {
      document += `### 2.3 Technical Requirements\n\n`
      tech.technical_requirements.forEach((req: any, idx: number) => {
        const reqText = typeof req === 'string' ? req : 
                       (req.name || req.description || req.title || `Requirement ${idx + 1}`)
        document += `${idx + 1}. ${reqText}\n`
      })
      document += `\n`
    }
    
    if (tech.technical_constraints && tech.technical_constraints.length > 0) {
      document += `### 2.4 Technical Constraints\n\n`
      tech.technical_constraints.forEach((constraint: string) => {
        document += `- ${constraint}\n`
      })
      document += `\n`
    }
  } else {
    document += `⚠️ **Missing Data:** Technical baseline not extracted.\n\n`
  }
  
  document += `---\n\n`

  // Timeline Baseline
  document += `## 3. Schedule Baseline\n\n`
  
  if (baseline.timeline_baseline) {
    const timeline = baseline.timeline_baseline
    
    if (timeline.project_duration) {
      document += `### 3.1 Project Duration\n\n`
      document += `**Total Duration:** ${timeline.project_duration}\n\n`
    }
    
    if (timeline.key_milestones && timeline.key_milestones.length > 0) {
      document += `### 3.2 Key Milestones\n\n`
      document += `| Milestone | Description | Target Date |\n`
      document += `|:----------|:------------|:------------|\n`
      timeline.key_milestones.forEach((milestone: any, idx: number) => {
        const name = typeof milestone === 'string' ? milestone : milestone.name || `Milestone ${idx + 1}`
        const target = typeof milestone === 'object' ? milestone.target_date || 'TBD' : 'TBD'
        document += `| M${idx + 1} | ${name} | ${target} |\n`
      })
      document += `\n`
    }
    
    if (timeline.phases && timeline.phases.length > 0) {
      document += `### 3.3 Project Phases\n\n`
      timeline.phases.forEach((phase: any, idx: number) => {
        const phaseName = typeof phase === 'string' ? phase : phase.name || `Phase ${idx + 1}`
        const duration = typeof phase === 'object' ? phase.duration : 'TBD'
        document += `**Phase ${idx + 1}: ${phaseName}**\n`
        if (duration && duration !== 'TBD') document += `- Duration: ${duration}\n`
        if (phase.deliverables && phase.deliverables.length > 0) {
          document += `- Deliverables: ${phase.deliverables.join(', ')}\n`
        }
        document += `\n`
      })
    }
    
    // Gap Analysis for Schedule Details
    document += `### 3.4 Detailed Schedule (Activity List)\n\n`
    document += `⚠️ **Missing Data:** Detailed activity list, dependencies, and resource estimates not extracted.\n\n`
    document += `**Recommendation:** Create a **Project Schedule** document with:\n`
    document += `- Activity list with IDs\n`
    document += `- Duration estimates (pessimistic, most likely, optimistic)\n`
    document += `- Resource assignments\n`
    document += `- Dependencies (FS, SS, FF, SF)\n`
    document += `- Critical path analysis\n\n`
    document += `**Template Available:** Use "Project Schedule Template" to generate this document.\n\n`
    
  } else {
    document += `⚠️ **Missing Data:** Timeline baseline not extracted.\n\n`
  }
  
  document += `---\n\n`

  // Cost Baseline
  document += `## 4. Cost Baseline\n\n`
  
  if (baseline.cost_baseline) {
    const cost = baseline.cost_baseline
    
    if (cost.total_budget) {
      document += `### 4.1 Total Project Budget\n\n`
      document += `**Approved Budget:** ${cost.total_budget}\n\n`
    }
    
    if (cost.cost_breakdown && Object.keys(cost.cost_breakdown).length > 0) {
      document += `### 4.2 Cost Breakdown\n\n`
      document += `| Category | Amount |\n`
      document += `|:---------|:-------|\n`
      Object.entries(cost.cost_breakdown).forEach(([category, amount]) => {
        document += `| ${category} | ${amount} |\n`
      })
      document += `\n`
    }
    
    // Gap Analysis for Cost Details
    document += `### 4.3 Detailed Cost Estimates\n\n`
    document += `⚠️ **Missing Data:** Detailed resource cost estimates and contingency reserves not fully extracted.\n\n`
    document += `**Recommendation:** Create a **Cost Management Plan** or **Budget Document** with:\n`
    document += `- Activity-based cost estimates\n`
    document += `- Resource cost rates\n`
    document += `- Contingency reserves (by phase)\n`
    document += `- Management reserves\n`
    document += `- Funding schedule\n\n`
    
  } else {
    document += `⚠️ **Missing Data:** Cost baseline not extracted from documents.\n\n`
    document += `**Recommendation:** Add budget or cost estimation documents to project.\n\n`
  }
  
  document += `---\n\n`

  // Resource Baseline
  document += `## 5. Resource Baseline\n\n`
  
  if (baseline.resource_baseline) {
    const resource = baseline.resource_baseline
    
    if (resource.team_composition && resource.team_composition.length > 0) {
      document += `### 5.1 Team Composition\n\n`
      resource.team_composition.forEach((member: any) => {
        const memberText = typeof member === 'string' ? member : 
                          (member.name || member.role || 'Team Member')
        document += `- ${memberText}\n`
      })
      document += `\n`
    }
    
    // Stakeholders
    if (resource.stakeholders && resource.stakeholders.length > 0) {
      document += `### 5.1.1 Key Stakeholders\n\n`
      document += `| Name | Role | Interest/Influence |\n`
      document += `|:-----|:-----|:-------------------|\n`
      resource.stakeholders.slice(0, 15).forEach((stakeholder: any) => {
        const name = typeof stakeholder === 'string' ? stakeholder : (stakeholder.name || 'Stakeholder')
        const role = typeof stakeholder === 'object' ? (stakeholder.role || 'N/A') : 'N/A'
        const influence = typeof stakeholder === 'object' ? 
                         `${stakeholder.interest_level || 'N/A'}/${stakeholder.influence_level || 'N/A'}` : 
                         'N/A'
        document += `| ${name} | ${role} | ${influence} |\n`
      })
      document += `\n`
    }
    
    if (resource.required_skills && resource.required_skills.length > 0) {
      document += `### 5.2 Required Skills\n\n`
      resource.required_skills.forEach((skill: string) => {
        document += `- ${skill}\n`
      })
      document += `\n`
    }
    
    if (resource.capacity_allocation) {
      document += `### 5.3 Capacity Allocation\n\n`
      document += `${resource.capacity_allocation}\n\n`
    }
    
    // Gap Analysis for Resource Details
    document += `### 5.4 Resource Estimates & Allocation\n\n`
    document += `⚠️ **Missing Data:** Detailed resource estimates by activity not extracted.\n\n`
    document += `**Recommendation:** Create a **Resource Management Plan** with:\n`
    document += `- Resource histogram\n`
    document += `- Resource allocation by time period\n`
    document += `- Resource cost estimates\n`
    document += `- Skills matrix\n\n`
    
  } else {
    document += `⚠️ **Missing Data:** Resource baseline not extracted.\n\n`
  }
  
  document += `---\n\n`

  // Success Criteria / Performance Measurement Baseline
  document += `## 6. Performance Measurement Baseline (Success Criteria)\n\n`
  
  if (baseline.success_criteria) {
    const success = baseline.success_criteria
    
    if (success.kpis && success.kpis.length > 0) {
      document += `### 6.1 Key Performance Indicators (KPIs)\n\n`
      document += `| KPI | Target Baseline |\n`
      document += `|:----|:----------------|\n`
      success.kpis.forEach((kpi: any) => {
        const kpiName = typeof kpi === 'string' ? kpi : 
                       (kpi.metric || kpi.name || kpi.description || 'KPI')
        const target = typeof kpi === 'object' ? (kpi.target_value || 'As stated') : 'As stated'
        document += `| ${kpiName} | ${target} |\n`
      })
      document += `\n`
    }
    
    if (success.acceptance_criteria && success.acceptance_criteria.length > 0) {
      document += `### 6.2 Acceptance Criteria\n\n`
      success.acceptance_criteria.forEach((criteria: string, idx: number) => {
        document += `${idx + 1}. ${criteria}\n`
      })
      document += `\n`
    }
    
    if (success.quality_metrics && success.quality_metrics.length > 0) {
      document += `### 6.3 Quality Metrics\n\n`
      success.quality_metrics.forEach((metric: any) => {
        const metricText = typeof metric === 'string' ? metric : 
                          (metric.name || metric.metric || metric.description || 'Quality Metric')
        document += `- ${metricText}\n`
      })
      document += `\n`
    }
  }
  
  document += `---\n\n`

  // Gap Analysis Summary
  document += `## 7. Baseline Completeness Assessment\n\n`
  document += `### 7.1 Available Baseline Components\n\n`
  
  const hasScope = baseline.scope_baseline && Object.keys(baseline.scope_baseline).length > 0
  const hasTech = baseline.technical_baseline && Object.keys(baseline.technical_baseline).length > 0
  const hasTimeline = baseline.timeline_baseline && Object.keys(baseline.timeline_baseline).length > 0
  const hasCost = baseline.cost_baseline && Object.keys(baseline.cost_baseline).length > 0
  const hasResource = baseline.resource_baseline && Object.keys(baseline.resource_baseline).length > 0
  const hasSuccess = baseline.success_criteria && Object.keys(baseline.success_criteria).length > 0
  
  document += `| Baseline Component | Status | Completeness |\n`
  document += `|:-------------------|:-------|:-------------|\n`
  document += `| Scope Baseline | ${hasScope ? '✅ Extracted' : '❌ Missing'} | ${hasScope ? Math.round((baseline.completeness_score || 0) * 100) + '%' : '0%'} |\n`
  document += `| Technical Baseline | ${hasTech ? '✅ Extracted' : '❌ Missing'} | ${hasTech ? '100%' : '0%'} |\n`
  document += `| Schedule Baseline | ${hasTimeline ? '✅ Extracted' : '❌ Missing'} | ${hasTimeline ? '75%' : '0%'} |\n`
  document += `| Cost Baseline | ${hasCost ? '✅ Extracted' : '❌ Missing'} | ${hasCost ? '50%' : '0%'} |\n`
  document += `| Resource Baseline | ${hasResource ? '✅ Extracted' : '❌ Missing'} | ${hasResource ? '60%' : '0%'} |\n`
  document += `| Success Criteria | ${hasSuccess ? '✅ Extracted' : '❌ Missing'} | ${hasSuccess ? '90%' : '0%'} |\n`
  document += `\n`
  
  // Gap Analysis
  document += `### 7.2 Missing Baseline Details (Opportunities for Improvement)\n\n`
  document += `The following baseline details were not found in the analyzed documents. Consider creating these documents to enhance baseline completeness:\n\n`
  
  const gaps = []
  
  if (!hasTimeline || !baseline.timeline_baseline?.critical_path) {
    gaps.push({
      missing: 'Detailed Work Breakdown Structure (WBS)',
      impact: 'Cannot track work package completion or assign responsibilities',
      template: 'WBS Template',
      priority: 'High'
    })
  }
  
  if (!hasTimeline || !baseline.timeline_baseline?.critical_dependencies) {
    gaps.push({
      missing: 'Activity List with Dependencies',
      impact: 'Cannot identify critical path or schedule risks',
      template: 'Project Schedule Template',
      priority: 'High'
    })
  }
  
  if (!hasResource || !baseline.resource_baseline?.resource_histogram) {
    gaps.push({
      missing: 'Resource Estimates by Activity',
      impact: 'Cannot forecast resource needs or identify over-allocation',
      template: 'Resource Management Plan Template',
      priority: 'Medium'
    })
  }
  
  if (!hasCost || !baseline.cost_baseline?.funding_schedule) {
    gaps.push({
      missing: 'Detailed Cost Estimates & Funding Schedule',
      impact: 'Limited ability to track cost performance or forecast cash flow',
      template: 'Cost Management Plan Template',
      priority: 'Medium'
    })
  }
  
  if (gaps.length > 0) {
    document += `| Missing Element | Impact | Recommended Template | Priority |\n`
    document += `|:----------------|:-------|:---------------------|:---------|\n`
    gaps.forEach(gap => {
      document += `| ${gap.missing} | ${gap.impact} | ${gap.template} | ${gap.priority} |\n`
    })
    document += `\n`
  } else {
    document += `✅ **All critical baseline components are present!**\n\n`
  }
  
  document += `---\n\n`

  // Approval Section
  document += `## 8. Baseline Approval\n\n`
  document += `### 8.1 Sign-Off\n\n`
  document += `| Role | Name | Signature | Date |\n`
  document += `|:-----|:-----|:----------|:-----|\n`
  document += `| Project Manager | | | |\n`
  document += `| Project Sponsor | | | |\n`
  document += `| Technical Lead | | | |\n`
  document += `| Product Owner | | | |\n`
  document += `\n`
  
  document += `### 8.2 Baseline Version Control\n\n`
  document += `- **Version:** ${baseline.version || '1.0'}\n`
  document += `- **Created:** ${new Date(baseline.created_at).toLocaleDateString()}\n`
  document += `- **Created By:** ${baseline.created_by_name || 'System'}\n`
  document += `- **Status:** ${baseline.status || 'draft'}\n`
  
  if (baseline.approved_at) {
    document += `- **Approved:** ${new Date(baseline.approved_at).toLocaleDateString()}\n`
    document += `- **Approved By:** ${baseline.approved_by_name || 'N/A'}\n`
  }
  
  document += `\n---\n\n`
  
  // AI Processing Metadata
  document += `## 9. Baseline Extraction Metadata\n\n`
  document += `This baseline was automatically extracted from project documents using AI.\n\n`
  
  if (baseline.ai_processing_metadata) {
    const aiMeta = baseline.ai_processing_metadata
    document += `- **AI Provider:** ${aiMeta.provider || 'N/A'}\n`
    document += `- **Model:** ${aiMeta.model || 'N/A'}\n`
    document += `- **Documents Analyzed:** ${aiMeta.documents_analyzed || 0}\n`
    document += `- **Total Words Analyzed:** ${(aiMeta.total_words_analyzed || 0).toLocaleString()}\n`
    document += `- **Processing Time:** ${Math.round((aiMeta.processing_time_ms || 0) / 1000)} seconds\n`
  }
  
  document += `\n---\n\n`
  document += `**Document Generated:** ${date}  \n`
  document += `**Generated By:** ADPA Baseline Drift Detection System  \n`
  document += `**CR Reference:** CR-2026-001\n`
  
  return document
}

export function identifyMissingBaselineDocuments(baseline: any): Array<{
  documentType: string
  purpose: string
  template: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  whatItProvides: string
}> {
  const missing = []
  
  // Check for WBS
  if (!baseline.scope_baseline?.wbs_hierarchy) {
    missing.push({
      documentType: 'Work Breakdown Structure (WBS)',
      purpose: 'Hierarchical decomposition of project work into manageable work packages',
      template: 'WBS Template (PMBOK)',
      priority: 'High' as const,
      whatItProvides: 'Work package IDs, responsibility assignments (RACI), deliverable breakdown, WBS dictionary'
    })
  }
  
  // Check for Activity List
  if (!baseline.timeline_baseline?.activity_list) {
    missing.push({
      documentType: 'Activity List with Dependencies',
      purpose: 'Detailed schedule with task dependencies and critical path',
      template: 'Project Schedule Template',
      priority: 'High' as const,
      whatItProvides: 'Activity IDs, durations, dependencies, critical path, resource assignments, float/slack analysis'
    })
  }
  
  // Check for Resource Estimates
  if (!baseline.resource_baseline?.resource_estimates) {
    missing.push({
      documentType: 'Resource Estimates by Activity',
      purpose: 'Detailed resource allocation and capacity planning',
      template: 'Resource Management Plan Template',
      priority: 'Medium' as const,
      whatItProvides: 'Resource histogram, capacity allocation, skills matrix, cost per resource, over-allocation alerts'
    })
  }
  
  // Check for Cost Estimates
  if (!baseline.cost_baseline?.detailed_estimates) {
    missing.push({
      documentType: 'Activity-Based Cost Estimates',
      purpose: 'Detailed cost breakdown with contingency and management reserves',
      template: 'Cost Management Plan Template',
      priority: 'Medium' as const,
      whatItProvides: 'Bottom-up cost estimates, parametric estimates, funding schedule, cost performance tracking'
    })
  }
  
  // Check for Risk Register
  if (!baseline.scope_baseline?.risk_register) {
    missing.push({
      documentType: 'Risk Register',
      purpose: 'Identified risks with probability, impact, and mitigation strategies',
      template: 'Risk Register Template (PMBOK)',
      priority: 'High' as const,
      whatItProvides: 'Risk IDs, probability × impact scores, response strategies, risk owners, contingency plans'
    })
  }
  
  return missing
}

