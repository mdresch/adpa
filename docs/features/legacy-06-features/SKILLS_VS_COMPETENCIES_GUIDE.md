# Skills vs Competencies: Definition and Administration Guide

## Overview

ADPA supports both **Skills** and **Competencies** as distinct but complementary concepts for managing human resources, role requirements, and stakeholder capabilities. Understanding the difference is critical for effective administration.

---

## Key Definitions

### **Skills** 🛠️
**Definition**: Specific, measurable technical or functional abilities that can be demonstrated and assessed.

**Characteristics**:
- **Concrete and Observable**: Can be demonstrated through performance (e.g., "Can write SQL queries", "Can use Git")
- **Task-Oriented**: Directly applicable to specific work activities
- **Proficiency-Based**: Measured in levels: Beginner → Intermediate → Advanced → Expert
- **Verifiable**: Can be tested, certified, or validated through work samples
- **Technology/Tool-Specific**: Often tied to specific tools, languages, or methodologies

**Examples**:
- "JavaScript Programming"
- "Microsoft Excel"
- "Agile Scrum Master"
- "Project Management Software (Jira)"
- "Database Administration (PostgreSQL)"
- "API Development (REST)"

### **Competencies** 🎯
**Definition**: Broader behavioral capabilities, knowledge areas, and professional attributes that enable effective performance.

**Characteristics**:
- **Behavioral and Contextual**: Reflect how someone applies knowledge and skills in real situations
- **Role-Oriented**: Aligned with professional standards and frameworks (PMBOK, BABOK, etc.)
- **Level-Based**: Measured in levels that reflect mastery (e.g., "Foundational", "Intermediate", "Advanced", "Expert")
- **Holistic**: Encompass knowledge, skills, and behaviors together
- **Framework-Aligned**: Often map to professional standards (PMBOK Performance Domains, BABOK Knowledge Areas)

**Examples**:
- "Stakeholder Engagement" (PMBOK Performance Domain)
- "Analytical Thinking & Problem Solving" (BABOK Underlying Competency)
- "Team Leadership"
- "Strategic Planning"
- "Risk Management"
- "Business Analysis Knowledge" (BABOK)

---

## Comparison Matrix

| Aspect | Skills | Competencies |
|--------|--------|-------------|
| **Scope** | Narrow, specific | Broad, comprehensive |
| **Nature** | Technical/Functional | Behavioral/Professional |
| **Measurement** | Proficiency levels (4 levels) | Competency levels (flexible) |
| **Verification** | Through testing, certification | Through observation, assessment |
| **Application** | Task execution | Role performance |
| **Examples** | "Python Programming", "AWS Cloud" | "Stakeholder Management", "Strategic Thinking" |
| **Framework** | Tool/Technology-specific | PMBOK/BABOK/DMBOK-aligned |
| **Time to Acquire** | Weeks to months | Months to years |
| **Transferability** | Tool-specific (may need retraining) | Highly transferable across contexts |

---

## When to Use Skills vs Competencies

### Use **Skills** When:
✅ Defining specific technical requirements for a role  
✅ Tracking tool proficiency (e.g., "Must know Jira")  
✅ Assessing demonstrable abilities (e.g., "Can write SQL")  
✅ Matching people to specific tasks  
✅ Managing certifications and technical credentials  
✅ Resource allocation based on technical capabilities  

**Example Role Requirements**:
- **Developer Role**: Skills = ["JavaScript", "React", "Node.js", "Git"]
- **Data Analyst Role**: Skills = ["SQL", "Python", "Tableau", "Excel"]

### Use **Competencies** When:
✅ Defining professional capabilities aligned with frameworks  
✅ Assessing behavioral and contextual performance  
✅ Mapping to PMBOK Performance Domains or BABOK Knowledge Areas  
✅ Evaluating leadership and strategic capabilities  
✅ Professional development and career progression  
✅ Role-based capability assessment  

**Example Role Requirements**:
- **Project Manager Role**: Competencies = ["Stakeholder Engagement", "Team Performance", "Planning Performance Domain"]
- **Business Analyst Role**: Competencies = ["Analytical Thinking", "Business Analysis Knowledge", "Behavioral Characteristics"]

---

## Administration Best Practices

### 1. **Role Definition Strategy**

**Recommended Approach**: Use **both** Skills and Competencies for comprehensive role definition.

```typescript
// Example: Senior Project Manager Role
{
  roleName: "Senior Project Manager",
  
  // Skills: Technical/tool-specific requirements
  skills: [
    { skillId: "ms-project", requiredProficiency: "advanced", isRequired: true },
    { skillId: "jira", requiredProficiency: "intermediate", isRequired: true },
    { skillId: "power-bi", requiredProficiency: "beginner", isRequired: false }
  ],
  
  // Competencies: Professional capabilities
  competencies: [
    { competencyId: "stakeholder-engagement", requiredLevel: "advanced", isRequired: true },
    { competencyId: "team-performance", requiredLevel: "advanced", isRequired: true },
    { competencyId: "planning-performance", requiredLevel: "expert", isRequired: true }
  ]
}
```

### 2. **Stakeholder Assessment**

**Skills Assessment**:
- Focus on **demonstrable abilities**
- Use proficiency levels: Beginner → Intermediate → Advanced → Expert
- Verify through: Certifications, work samples, technical tests
- Track: Years of experience, last used date, certification expiry

**Competencies Assessment**:
- Focus on **behavioral evidence**
- Use competency levels: Foundational → Intermediate → Advanced → Expert
- Verify through: Performance reviews, project outcomes, peer feedback
- Track: Development plans, training history, role progression

### 3. **Matching Strategy**

**For Task Assignment**:
1. **Primary Match**: Skills (technical requirements)
2. **Secondary Match**: Competencies (behavioral fit)
3. **Gap Analysis**: Identify missing skills vs. missing competencies

**For Role Assignment**:
1. **Primary Match**: Competencies (role alignment)
2. **Secondary Match**: Skills (tool proficiency)
3. **Development Plan**: Address competency gaps first (longer-term), then skill gaps (shorter-term)

### 4. **Data Management**

#### Skills Catalog
- **Keep granular**: One skill per tool/technology
- **Update frequently**: New tools emerge regularly
- **Categorize**: Technical, Tool, Certification, Language
- **Version-aware**: Track tool versions (e.g., "React 18" vs "React 19")

#### Competencies Catalog
- **Keep stable**: Align with professional frameworks
- **Update rarely**: Only when frameworks evolve
- **Categorize**: By framework (PMBOK, BABOK, DMBOK) or domain
- **Framework-aligned**: Map to official competency models

---

## Implementation in ADPA

### Database Structure

**Skills Tables**:
- `skills` - Skills catalog
- `role_skills` - Skills required for roles
- `stakeholder_skills` - Skills possessed by stakeholders

**Competencies Tables**:
- `competencies` - Competencies catalog
- `role_competencies` - Competencies required for roles
- `stakeholder_competencies` - Competencies possessed by stakeholders

### API Endpoints

**Skills**:
- `GET /api/skills` - List all skills
- `GET /api/skills/role/:roleId` - Get skills for a role
- `POST /api/skills/:id/assign-to-role` - Assign skill to role
- `POST /api/stakeholders/:id/skills` - Assign skill to stakeholder

**Competencies**:
- `GET /api/competencies` - List all competencies
- `GET /api/competencies/role/:roleId` - Get competencies for a role
- `POST /api/competencies/:id/assign-to-role` - Assign competency to role
- `POST /api/stakeholders/:id/competencies` - Assign competency to stakeholder

### UI Components

**Skills Management**:
- `/app/skills` - Skills catalog management
- `/app/roles` - Role skills assignment (in Roles page)
- Stakeholder detail dialog → Skills tab (stakeholder personal skills)

**Competencies Management**:
- `/app/competencies` - Competencies catalog management
- `/app/roles` - Role competencies assignment (in Roles page)
- Stakeholder detail dialog → Competencies tab (stakeholder personal competencies)

---

## Common Scenarios

### Scenario 1: Hiring a Project Manager

**Skills to Require**:
- Microsoft Project (Advanced)
- Jira (Intermediate)
- Excel (Advanced)

**Competencies to Require**:
- Stakeholder Engagement (Advanced)
- Team Performance (Advanced)
- Planning Performance Domain (Expert)

**Assessment**:
- Skills: Technical test, tool demonstration
- Competencies: Behavioral interview, case study, reference checks

### Scenario 2: Promoting a Developer to Tech Lead

**New Skills Needed**:
- Code Review Tools (Intermediate)
- Architecture Design Tools (Beginner)

**New Competencies Needed**:
- Team Leadership (Intermediate → Advanced)
- Strategic Thinking (Foundational → Intermediate)
- Stakeholder Engagement (Beginner → Intermediate)

**Development Plan**:
- Skills: 2-3 months training
- Competencies: 6-12 months mentoring and experience

### Scenario 3: Matching Stakeholder to Role

**Role: Business Analyst**

**Skills Match**:
- ✅ SQL (Advanced) - Matches requirement
- ✅ Excel (Expert) - Exceeds requirement
- ❌ Jira (Missing) - Gap identified

**Competencies Match**:
- ✅ Analytical Thinking (Advanced) - Matches requirement
- ✅ Business Analysis Knowledge (Intermediate) - Matches requirement
- ⚠️ Behavioral Characteristics (Intermediate) - Below requirement (Advanced needed)

**Recommendation**: Assign with development plan for Behavioral Characteristics competency.

---

## Migration and Data Quality

### Existing Data Cleanup

**If you have duplicate concepts**:
1. **Skills that are actually Competencies**: 
   - "Leadership" → Move to Competencies
   - "Strategic Planning" → Move to Competencies
   - "Problem Solving" → Move to Competencies

2. **Competencies that are actually Skills**:
   - "Microsoft Excel" → Move to Skills
   - "Python Programming" → Move to Skills
   - "AWS Cloud" → Move to Skills

### Data Quality Rules

**Skills**:
- ✅ Must be tool/technology-specific
- ✅ Must be demonstrable
- ✅ Should have clear proficiency levels
- ❌ Avoid behavioral terms
- ❌ Avoid framework-aligned terms

**Competencies**:
- ✅ Must be behavioral/professional
- ✅ Should align with frameworks (PMBOK, BABOK)
- ✅ Should be role-oriented
- ❌ Avoid tool-specific terms
- ❌ Avoid technology-specific terms

---

## Summary

| **Use Skills For** | **Use Competencies For** |
|-------------------|-------------------------|
| Technical requirements | Professional capabilities |
| Tool proficiency | Behavioral performance |
| Task assignment | Role alignment |
| Short-term training | Long-term development |
| Certifications | Career progression |
| Technology stack | Framework alignment |

**Best Practice**: Use **both** in combination for comprehensive resource management. Skills ensure technical capability, while Competencies ensure professional fit and framework alignment.

---

## Quick Reference

**Skills = "Can they do it?"** (Technical ability)  
**Competencies = "Will they do it well?"** (Professional capability)

**Skills** answer: "Do they know Python?"  
**Competencies** answer: "Can they solve complex problems using Python in a business context?"

Both are essential for effective resource management and role matching in ADPA.

