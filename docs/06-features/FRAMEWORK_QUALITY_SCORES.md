# 📊 Framework-Specific Quality Scores

## Overview

Quality scores should reflect compliance with the specific framework's principles, knowledge areas, and standards rather than generic document quality metrics.

---

## Current Quality Scoring

### Generic Approach (Current)
```typescript
quality_score = 0.8  // Generic score
```

**Problems**:
- Not meaningful for framework compliance
- Doesn't validate against framework standards
- Can't identify specific gaps
- No actionable feedback

---

## Framework-Specific Approach (Recommended)

### PMBOK 7 Quality Rubric

#### **12 Principles Compliance**

| Principle | Weight | Validation Criteria |
|-----------|--------|---------------------|
| Stewardship | 8% | Document shows responsible resource management |
| Team | 8% | Identifies team roles and collaboration |
| Stakeholders | 10% | Comprehensive stakeholder analysis |
| Value | 10% | Clear value delivery and benefits |
| Systems Thinking | 8% | Considers broader organizational context |
| Leadership | 8% | Defines leadership and governance |
| Tailoring | 8% | Adapts to project context |
| Quality | 10% | Meets quality standards and acceptance criteria |
| Complexity | 8% | Addresses project complexity |
| Risk | 8% | Identifies and manages risks |
| Adaptability | 7% | Shows flexibility and adaptation |
| Change | 7% | Addresses change management |

**Total**: 100%

#### **Implementation**:

```typescript
async function calculatePMBOK7QualityScore(document: string, template: Template): Promise<{
  overall_score: number
  principle_scores: Record<string, number>
  missing_elements: string[]
  recommendations: string[]
}> {
  const scores = {
    stewardship: 0,
    team: 0,
    stakeholders: 0,
    value: 0,
    systems_thinking: 0,
    leadership: 0,
    tailoring: 0,
    quality: 0,
    complexity: 0,
    risk: 0,
    adaptability: 0,
    change: 0
  }
  
  const missing: string[] = []
  const recommendations: string[] = []
  
  // Check for Stakeholders (10%)
  if (document.toLowerCase().includes('stakeholder')) {
    const hasStakeholderList = document.match(/\|.*stakeholder.*\|/i)
    const hasEngagementStrategy = document.toLowerCase().includes('engagement')
    
    if (hasStakeholderList && hasEngagementStrategy) {
      scores.stakeholders = 1.0  // Full marks
    } else if (hasStakeholderList) {
      scores.stakeholders = 0.7  // Partial
      recommendations.push('Add stakeholder engagement strategies')
    } else {
      scores.stakeholders = 0.3  // Minimal
      missing.push('Stakeholder analysis and engagement plan')
    }
  } else {
    scores.stakeholders = 0
    missing.push('Stakeholder information')
  }
  
  // Check for Value (10%)
  const valueKeywords = ['benefit', 'value', 'roi', 'outcome', 'deliverable']
  const hasValue = valueKeywords.some(keyword => document.toLowerCase().includes(keyword))
  
  if (hasValue) {
    const hasQuantified = /\d+%|\$[\d,]+/.test(document)  // Has numbers/percentages
    scores.value = hasQuantified ? 1.0 : 0.6
    if (!hasQuantified) {
      recommendations.push('Quantify expected benefits and value')
    }
  } else {
    scores.value = 0
    missing.push('Value and benefits articulation')
  }
  
  // Check for Risk (8%)
  if (document.toLowerCase().includes('risk')) {
    const hasRiskRegister = document.match(/risk.*\|.*\|/i)
    const hasMitigation = document.toLowerCase().includes('mitigation')
    
    if (hasRiskRegister && hasMitigation) {
      scores.risk = 1.0
    } else if (hasRiskRegister) {
      scores.risk = 0.7
      recommendations.push('Add risk mitigation strategies')
    } else {
      scores.risk = 0.4
      missing.push('Formal risk register')
    }
  } else {
    scores.risk = 0
    missing.push('Risk identification and management')
  }
  
  // Calculate weighted overall score
  const weights = {
    stewardship: 0.08,
    team: 0.08,
    stakeholders: 0.10,
    value: 0.10,
    systems_thinking: 0.08,
    leadership: 0.08,
    tailoring: 0.08,
    quality: 0.10,
    complexity: 0.08,
    risk: 0.08,
    adaptability: 0.07,
    change: 0.07
  }
  
  let overall = 0
  for (const [principle, score] of Object.entries(scores)) {
    overall += score * weights[principle]
  }
  
  return {
    overall_score: overall,
    principle_scores: scores,
    missing_elements: missing,
    recommendations: recommendations
  }
}
```

---

### BABOK Quality Rubric

#### **6 Knowledge Areas Compliance**

| Knowledge Area | Weight | Validation Criteria |
|----------------|--------|---------------------|
| Business Analysis Planning & Monitoring | 15% | Has planning and monitoring approach |
| Elicitation & Collaboration | 15% | Shows stakeholder engagement methods |
| Requirements Life Cycle Management | 20% | Traces requirements through lifecycle |
| Strategy Analysis | 15% | Links to business strategy and goals |
| Requirements Analysis & Design | 20% | Analyzes and specifies requirements |
| Solution Evaluation | 15% | Evaluates solution effectiveness |

**Implementation**:

```typescript
async function calculateBABOKQualityScore(document: string): Promise<QualityScore> {
  const scores = {
    planning_monitoring: checkForPlanningElements(document),
    elicitation: checkForStakeholderElicitation(document),
    lifecycle: checkForRequirementTraceability(document),
    strategy: checkForStrategyAlignment(document),
    analysis: checkForRequirementAnalysis(document),
    evaluation: checkForSolutionEvaluation(document)
  }
  
  const overall = 
    scores.planning_monitoring * 0.15 +
    scores.elicitation * 0.15 +
    scores.lifecycle * 0.20 +
    scores.strategy * 0.15 +
    scores.analysis * 0.20 +
    scores.evaluation * 0.15
  
  return { overall_score: overall, knowledge_area_scores: scores }
}
```

---

### DMBOK Quality Rubric

#### **11 Knowledge Areas Compliance**

| Knowledge Area | Weight |
|----------------|--------|
| Data Governance | 15% |
| Data Architecture | 10% |
| Data Modeling | 10% |
| Data Storage & Operations | 8% |
| Data Security | 12% |
| Data Integration | 8% |
| Documents & Content | 8% |
| Reference & Master Data | 8% |
| Data Warehousing & BI | 7% |
| Metadata | 7% |
| Data Quality | 12% |

---

## 🎯 Quality Score Display

### **In UI: Document Viewer**

Instead of showing just:
```
Quality Score: 0.85
```

Show framework-specific breakdown:
```
📊 PMBOK 7 Quality Assessment: 85%

Principles Coverage:
✅ Stakeholders: 100% (Comprehensive stakeholder matrix)
✅ Value: 90% (Clear value proposition with quantified benefits)
✅ Risk: 85% (Risk register with mitigation)
⚠️ Team: 60% (Team structure mentioned but not detailed)
⚠️ Change: 50% (Change management briefly addressed)

Missing Elements:
- Detailed team roles and responsibilities
- Change control process details

Recommendations:
- Add comprehensive team charter
- Expand change management section
```

### **In Pipeline Results**

```json
{
  "quality_assessment": {
    "overall_score": 0.85,
    "framework": "PMBOK 7",
    "principle_scores": {
      "stakeholders": 1.0,
      "value": 0.9,
      "risk": 0.85,
      "team": 0.6,
      "change": 0.5,
      ...
    },
    "compliance_level": "High",
    "missing_elements": [
      "Team roles and responsibilities",
      "Change control process"
    ],
    "recommendations": [
      "Add team charter section",
      "Expand change management"
    ]
  }
}
```

---

## 🔧 Implementation Approach

### Phase 1: Basic Framework Detection
```typescript
function getFrameworkRubric(framework: string) {
  switch(framework) {
    case 'PMBOK 7':
      return PMBOK7Rubric
    case 'BABOK v3':
      return BABOKRubric
    case 'DMBOK 2.0':
      return DMBOKRubric
    default:
      return GenericRubric
  }
}
```

### Phase 2: Content Analysis
```typescript
async function analyzeDocumentQuality(
  document: string,
  framework: string,
  template: Template
): Promise<QualityAssessment> {
  const rubric = getFrameworkRubric(framework)
  const scores = await rubric.evaluate(document)
  const missing = rubric.identifyGaps(document)
  const recommendations = rubric.generateRecommendations(scores, missing)
  
  return {
    overall_score: rubric.calculateOverall(scores),
    detailed_scores: scores,
    missing_elements: missing,
    recommendations: recommendations,
    compliance_level: rubric.getComplianceLevel(scores)
  }
}
```

### Phase 3: AI-Powered Quality Checking

Use AI to validate framework compliance:

```typescript
const qualityCheckPrompt = `
You are a ${framework} compliance expert.

Review this document and score it against ${framework} requirements:

DOCUMENT:
${document}

FRAMEWORK: ${framework}
TEMPLATE TYPE: ${template.name}

Score each ${framework} principle/knowledge area from 0.0 to 1.0:
${rubric.criteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Return JSON:
{
  "scores": { "principle1": 0.85, ... },
  "missing": ["element1", "element2"],
  "recommendations": ["Add X", "Expand Y"]
}
`

const aiQualityAssessment = await ai.generate(qualityCheckPrompt)
```

---

## 🎓 Example: Project Charter Quality

### **Generic Score** (Current):
```
Quality Score: 0.85
```
Not helpful - what does 0.85 mean?

### **PMBOK 7 Score** (Enhanced):
```
📊 PMBOK 7 Compliance: 85%

Excellent Coverage (90-100%):
✅ Stakeholders (100%) - Comprehensive stakeholder matrix with engagement
✅ Value (95%) - Clear benefits with $2.6M budget and ROI

Good Coverage (70-89%):
✅ Risk (85%) - Risk register with mitigation strategies
✅ Leadership (80%) - PM authority clearly defined
✅ Quality (75%) - Success criteria and acceptance defined

Needs Improvement (<70%):
⚠️ Team (60%) - Team structure needs detail
⚠️ Change (50%) - Change management brief
⚠️ Complexity (40%) - Complexity factors not addressed

Action Items:
1. Add detailed team charter with RACI matrix
2. Expand change management process (7 steps mentioned but brief)
3. Analyze and document project complexity factors
```

This tells you **exactly** what's good and what needs work!

---

## 🔄 Feedback Loop

1. **Generate Document** → Get framework-specific score
2. **Review Scores** → See what's missing
3. **Improve Template** → Add missing framework elements
4. **Regenerate** → Score improves
5. **Promote Template** → Once consistently high scores

---

## 📈 Benefits

### For Users:
- Know exactly what's missing from documents
- Understand compliance gaps
- Get actionable recommendations
- Confidence in framework adherence

### For Template Creators:
- See which sections need improvement
- Understand framework requirements
- Iterate based on specific feedback
- Create better templates over time

### For Organizations:
- Ensure compliance with chosen frameworks
- Maintain documentation standards
- Track quality trends
- Identify training needs

---

## 🎯 Success Metrics

Instead of:
- "85% quality" (meaningless)

You get:
- "PMBOK 7 Stakeholder Management: 100%" ✅
- "PMBOK 7 Team Definition: 60%" ⚠️
- "Missing: Complexity analysis" 📝
- "Recommendation: Add team RACI matrix" 💡

**Quality scores become learning and improvement tools!** 📚✨

---

## 🚀 Quick Implementation

Start simple:
1. Detect framework from template
2. Check for framework-specific keywords
3. Score based on presence/absence
4. Provide framework-specific feedback

Then enhance:
5. Use AI to validate framework compliance
6. Generate detailed gap analysis
7. Provide specific recommendations
8. Track improvement over time

---

**Framework-specific quality scores transform generic metrics into actionable compliance assessments!** 🎯

