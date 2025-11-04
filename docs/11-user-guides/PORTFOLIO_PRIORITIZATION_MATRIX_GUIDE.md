# Portfolio Prioritization Matrix - Training Guide

**Guide Version:** 1.0  
**Date:** November 4, 2025  
**Status:** ✅ Complete  
**Audience:** Portfolio Managers, Program Managers, Executives, PMO

---

## Overview

The **Portfolio Prioritization Matrix** is a powerful feature that helps you objectively prioritize projects using weighted scoring across multiple criteria. This guide will teach you how to use this system effectively.

### What You'll Learn

- ✅ Understanding the prioritization framework
- ✅ Using the default 5-criteria model
- ✅ Scoring projects against criteria
- ✅ Interpreting priority rankings
- ✅ Exporting results for stakeholders
- ✅ Best practices for prioritization

### Prerequisites

- ADPA account with access to Programs
- At least one Program created
- Multiple projects within the program
- Basic understanding of project management

---

## What is the Portfolio Prioritization Matrix?

The Portfolio Prioritization Matrix is a **decision-making framework** that scores projects using multiple weighted criteria to produce objective priority rankings.

### Key Concepts

**Criteria**: Dimensions used to evaluate projects (e.g., Strategic Alignment, Value, Risk)  
**Weights**: Importance assigned to each criterion (totaling 100%)  
**Scores**: Ratings given to each project on each criterion (1-5 scale)  
**Priority Score**: Weighted average of all scores  
**Priority Tier**: Classification based on total score (Critical, High, Medium, Low)

### Why Use It?

✅ **Objective Decision-Making**: Remove bias with data-driven scoring  
✅ **Stakeholder Alignment**: Transparent, repeatable process  
✅ **Resource Optimization**: Focus on highest-value projects  
✅ **Portfolio Balance**: See the full picture across all projects  
✅ **Audit Trail**: Document why decisions were made

---

## The Default Prioritization Framework

ADPA comes pre-configured with a **5-criteria model** based on industry best practices:

### Standard Criteria

| # | Criterion | Weight | Description | Scale |
|---|-----------|--------|-------------|-------|
| 1 | **Strategic Alignment** | 30% | How well does the project support strategic objectives? | 1 (Low) - 5 (Critical) |
| 2 | **Value Contribution** | 25% | Expected ROI, benefits, business value | 1 (Low) - 5 (High) |
| 3 | **Risk Level** | 15% | Risk assessment (Inverted: 5 = low risk, 1 = high risk) | 1 (High Risk) - 5 (Low Risk) |
| 4 | **Resource Availability** | 20% | Can we staff and fund this project? | 1 (Not Available) - 5 (Fully Available) |
| 5 | **Urgency** | 10% | Time sensitivity, market window | 1 (Can Wait) - 5 (Urgent) |

**Total Weight**: 100%

### Scoring Formula

```
Priority Score = 
  (Strategic Alignment × 0.30) + 
  (Value Contribution × 0.25) + 
  (Risk Level × 0.15) + 
  (Resource Availability × 0.20) + 
  (Urgency × 0.10)

Maximum Score: 5.00
Minimum Score: 1.00
```

### Priority Tiers

Based on the total score, projects are classified into tiers:

- 🔴 **Critical Priority** (4.0 - 5.0): Highest priority, must be resourced
- 🟠 **High Priority** (3.0 - 3.9): Important, schedule soon
- 🟡 **Medium Priority** (2.0 - 2.9): Moderate importance, plan for future
- ⚪ **Low Priority** (< 2.0): Low importance, defer or cancel

---

## Step-by-Step: Prioritizing Your Projects

### Step 1: Navigate to Program Prioritization

1. Click **Programs** in the sidebar
2. Select your program (e.g., "Digital Transformation")
3. Click the **Prioritize** tab
   - If you don't see this tab, contact your administrator

### Step 2: Review Criteria

On the Prioritization page, you'll see:

- **Criteria List**: All 5 criteria with weights
- **Projects List**: All projects in your program
- **Scoring Status**: Which projects have been scored

**Tip**: Hover over any criterion to see its full description.

### Step 3: Score a Project

Click **"Score"** button next to a project to begin:

#### Scoring Interface

```
┌─────────────────────────────────────────────────────────┐
│ Score Project: Customer Portal Migration                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Strategic Alignment (Weight: 30%)                    │
│    How well does this project support strategic         │
│    objectives?                                           │
│                                                          │
│    ●─────●─────●─────●─────●                           │
│    1     2     3     4     5                            │
│    Low        Moderate        Critical                  │
│                                                          │
│    Selected: [5] Critical                               │
│    Weighted Score: 1.50 / 1.50                          │
│                                                          │
│    Justification:                                        │
│    ┌──────────────────────────────────────────────┐   │
│    │ Directly supports our digital transformation │   │
│    │ initiative and aligns with 2026 strategic    │   │
│    │ goals set by the executive team.             │   │
│    └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### For Each Criterion:

1. **Read the description** carefully
2. **Select a score** (1-5) using the slider
3. **See the weighted score** calculated automatically
4. **Add justification** (optional but recommended)
5. **Move to next criterion**

**Repeat** for all 5 criteria.

#### Tips for Scoring:

**Strategic Alignment**:
- 5: Directly supports top corporate objectives
- 4: Strongly supports key strategies
- 3: Moderately aligned with strategic themes
- 2: Loosely connected to strategy
- 1: Not aligned with current strategy

**Value Contribution**:
- 5: Very high ROI, significant benefits (>200% ROI)
- 4: High ROI, substantial benefits (100-200% ROI)
- 3: Moderate ROI, decent benefits (50-100% ROI)
- 2: Low ROI, limited benefits (10-50% ROI)
- 1: Minimal or negative ROI (<10% ROI)

**Risk Level** (Inverted):
- 5: Very low risk, proven technology, stable team
- 4: Low risk, some uncertainty
- 3: Moderate risk, manageable challenges
- 2: High risk, significant challenges
- 1: Very high risk, many unknowns

**Resource Availability**:
- 5: Fully staffed, fully funded, no constraints
- 4: Mostly available, minor gaps
- 3: Partially available, some hiring needed
- 2: Limited availability, major hiring/funding needed
- 1: Resources not available, major constraints

**Urgency**:
- 5: Critical time window, must start immediately
- 4: Important deadline, should start soon
- 3: Moderate timeline, some flexibility
- 2: Flexible timeline, can defer
- 1: No time pressure, can wait

### Step 4: Review Calculated Score

After scoring all criteria:

```
┌─────────────────────────────────────────────────────────┐
│ Total Priority Score: 4.10 / 5.00                      │
│ Priority Tier: 🔴 Critical Priority                    │
│ Rank: #1 of 12 projects in portfolio                   │
├─────────────────────────────────────────────────────────┤
│ [Save Draft] [Submit Score] [Reset]                    │
└─────────────────────────────────────────────────────────┘
```

- **Total Score**: Sum of all weighted scores
- **Priority Tier**: Automatic classification
- **Rank**: Position relative to other scored projects

**Actions**:
- **Save Draft**: Save progress, continue later
- **Submit Score**: Finalize scoring (may require approval)
- **Reset**: Clear all scores and start over

### Step 5: Repeat for All Projects

Score all projects in your program to build a complete ranking.

**Progress Tracker**:
```
Projects Scored: 8 / 12 (67%)
[████████████████░░░░░░░░░░] 
```

---

## Viewing and Interpreting Results

### Rankings Table

After scoring, view the **Rankings Table**:

```
┌──────┬───────────────────┬───────┬───────┬──────┬──────────┬─────────┬───────────┐
│ Rank │ Project           │ Strat │ Value │ Risk │ Resource │ Urgency │ Score     │
├──────┼───────────────────┼───────┼───────┼──────┼──────────┼─────────┼───────────┤
│  1   │ Portal Migration  │  5    │  4    │  4   │   3      │   4     │ 4.10 🔴   │
│  2   │ CRM Upgrade       │  3    │  5    │  2   │   4      │   2     │ 3.45 🟠   │
│  3   │ Data Warehouse    │  4    │  3    │  3   │   2      │   5     │ 3.30 🟠   │
│  4   │ Mobile App        │  2    │  2    │  1   │   5      │   3     │ 2.55 🟡   │
│  5   │ Legacy System     │  1    │  1    │  5   │   2      │   1     │ 1.75 ⚪   │
└──────┴───────────────────┴───────┴───────┴──────┴──────────┴─────────┴───────────┘
```

### Interpreting the Table

**Columns**:
- **Rank**: Position in priority order (1 = highest)
- **Project**: Project name
- **Strat/Value/Risk/Resource/Urgency**: Individual criterion scores
- **Score**: Total weighted priority score
- **Tier Indicator**: 🔴 Critical, 🟠 High, 🟡 Medium, ⚪ Low

**Insights**:
1. **Top-Ranked Projects**: Focus resources here first
2. **Score Breakdown**: See which criteria drove the ranking
3. **Gaps**: Low scores highlight areas needing attention
4. **Balance**: Assess portfolio mix across criteria

### Score Breakdown View

Click on any project to see detailed scoring:

```
Project: Portal Migration (Rank #1, Score: 4.10)

┌───────────────────────────────────────────────────────┐
│ Criterion            │ Score │ Weight │ Weighted      │
├──────────────────────┼───────┼────────┼───────────────┤
│ Strategic Alignment  │  5    │  30%   │ 1.50 ██████  │
│ Value Contribution   │  4    │  25%   │ 1.00 ████    │
│ Risk Level          │  4    │  15%   │ 0.60 ██      │
│ Resource Availability│  3    │  20%   │ 0.60 ██      │
│ Urgency             │  4    │  10%   │ 0.40 █       │
├──────────────────────┴───────┴────────┴───────────────┤
│ TOTAL                                 │ 4.10         │
└───────────────────────────────────────────────────────┘

Justifications:
• Strategic Alignment: "Directly supports digital 
  transformation initiative..."
• Value Contribution: "Expected ROI of 180% over 3 years..."
• Risk Level: "Proven technology stack, experienced team..."
```

### Filtering and Sorting

**Filter Options**:
- By Priority Tier (Critical, High, Medium, Low)
- By Status (Scored, Not Scored, Draft)
- By Project Category
- By Date Scored

**Sort Options**:
- By Rank (default)
- By Individual Criterion Score
- By Project Name
- By Date Updated

---

## Exporting Results

### Export Formats

Click **"Export"** to generate reports in multiple formats:

#### 1. Excel Export

```
File: Portfolio_Prioritization_2025-11-04.xlsx

Sheets:
1. Rankings Summary
   - All projects with scores and ranks
2. Score Details
   - Individual criterion scores and justifications
3. Criteria Definitions
   - Reference guide for criteria and weights
4. Charts
   - Priority distribution pie chart
   - Score comparison bar chart
```

#### 2. PDF Report

Professional report including:
- Executive summary
- Rankings table
- Score breakdowns
- Methodology explanation
- Recommendations

#### 3. PowerPoint Presentation

Stakeholder-ready slides with:
- Portfolio overview
- Top 5 projects
- Priority distribution
- Score comparisons
- Next steps

### Sharing Results

**Options**:
1. **Email**: Send report to stakeholders directly
2. **Confluence**: Sync to Confluence page
3. **SharePoint**: Upload to SharePoint library
4. **Download**: Save locally and distribute manually

---

## Advanced Features

### Editing Scores

To revise scores:

1. Navigate to Rankings Table
2. Click **"Edit"** next to the project
3. Modify scores as needed
4. Add notes about why scores changed
5. Re-submit

**Version History**: All scoring changes are tracked for audit purposes.

### Scenario Analysis

Compare different prioritization scenarios:

1. Click **"New Scenario"**
2. Name your scenario (e.g., "Aggressive Timeline")
3. Adjust weights or scores
4. Compare scenarios side-by-side
5. Choose the best approach

**Example Scenarios**:
- **Cost-Focused**: Increase Value weight to 40%
- **Risk-Averse**: Increase Risk weight to 30%
- **Strategic**: Increase Strategic Alignment to 50%

### Custom Criteria (Admin Feature)

Administrators can customize the criteria:

1. Navigate to **Admin → Prioritization Settings**
2. Click **"Add Criterion"** or **"Edit Criterion"**
3. Define:
   - Name
   - Description
   - Weight (must total 100%)
   - Scale (1-5, 1-10, etc.)
   - Inversion (higher is better/worse)
4. Save and apply to programs

**Note**: Changing criteria after scoring requires re-scoring projects.

### Approval Workflows

For governance, enable approval workflows:

1. **Project Manager** scores projects
2. **PMO** reviews and validates
3. **Executive** approves final rankings
4. **System** locks rankings until next review cycle

---

## Best Practices

### Before Scoring

✅ **Align on Criteria**: Ensure all scorers understand criteria definitions  
✅ **Set Expectations**: Agree on scoring guidelines and examples  
✅ **Gather Data**: Collect project information for objective scoring  
✅ **Schedule Workshop**: Score together in a facilitated session  
✅ **Review Projects**: Ensure all project details are up to date

### During Scoring

✅ **Be Consistent**: Use the same standards for all projects  
✅ **Be Objective**: Base scores on facts, not opinions  
✅ **Add Justifications**: Document why you gave each score  
✅ **Avoid Extremes**: Use the full 1-5 scale, not just 1s and 5s  
✅ **Collaborate**: Discuss scores with team for alignment

### After Scoring

✅ **Review Rankings**: Do results make sense?  
✅ **Validate Outliers**: Investigate unexpected high/low scores  
✅ **Communicate Results**: Share with stakeholders promptly  
✅ **Act on Results**: Use rankings to guide resource allocation  
✅ **Schedule Reviews**: Re-prioritize quarterly or when things change

### Common Pitfalls to Avoid

❌ **Don't**:
- Score without understanding criteria
- Give all projects the same scores
- Skip justifications
- Prioritize alone (collaborate!)
- Set-and-forget (re-evaluate regularly)
- Let politics override data
- Ignore low-priority projects completely

---

## Real-World Example

### Scenario: Technology Company Portfolio

**Company**: TechCorp  
**Program**: Digital Innovation Program  
**Projects**: 6 projects competing for resources  
**Goal**: Prioritize for Q1 2026 funding

#### Projects to Score

1. **Customer Portal Upgrade**
2. **Mobile App Development**
3. **AI Chatbot Integration**
4. **Legacy System Migration**
5. **Data Analytics Platform**
6. **Internal Tool Modernization**

#### Scoring Session

**Participants**: CTO, PMO Lead, 3 Project Managers  
**Duration**: 2 hours  
**Method**: Collaborative scoring workshop

#### Example: Scoring "AI Chatbot Integration"

**Strategic Alignment**: **4 (High)**
- Aligns with customer experience strategy
- Supports digital transformation initiative
- Justification: "Part of our 2026 CX roadmap, executive priority"

**Value Contribution**: **5 (Very High)**
- Expected $500K cost savings annually
- 24/7 customer support
- Justification: "ROI analysis shows 220% return in 18 months"

**Risk Level**: **3 (Moderate)**
- New technology for the team
- External vendor dependency
- Justification: "Some AI risks, but vendor is reputable"

**Resource Availability**: **4 (Mostly Available)**
- Budget approved
- Need to hire 1 AI specialist
- Justification: "90% funded, hiring in progress"

**Urgency**: **4 (High)**
- Competitor launched similar feature
- Customer demand increasing
- Justification**: "Market window closing, need Q1 launch"

**Total Score**:
```
(4 × 0.30) + (5 × 0.25) + (3 × 0.15) + (4 × 0.20) + (4 × 0.10)
= 1.20 + 1.25 + 0.45 + 0.80 + 0.40
= 4.10 🔴 Critical Priority
```

#### Final Rankings

```
┌──────┬──────────────────────────┬───────┬──────────────┐
│ Rank │ Project                  │ Score │ Tier         │
├──────┼──────────────────────────┼───────┼──────────────┤
│  1   │ AI Chatbot Integration   │ 4.10  │ 🔴 Critical  │
│  2   │ Customer Portal Upgrade  │ 3.95  │ 🟠 High      │
│  3   │ Data Analytics Platform  │ 3.45  │ 🟠 High      │
│  4   │ Mobile App Development   │ 2.80  │ 🟡 Medium    │
│  5   │ Legacy System Migration  │ 2.50  │ 🟡 Medium    │
│  6   │ Internal Tool Modern.    │ 1.90  │ ⚪ Low       │
└──────┴──────────────────────────┴───────┴──────────────┘
```

#### Decision

**Funded for Q1 2026**:
- ✅ AI Chatbot Integration (Rank #1)
- ✅ Customer Portal Upgrade (Rank #2)
- ✅ Data Analytics Platform (Rank #3)

**Deferred to Q2 2026**:
- ⏸️ Mobile App Development (Rank #4)
- ⏸️ Legacy System Migration (Rank #5)

**Not Funded**:
- ❌ Internal Tool Modernization (Rank #6)

**Outcome**: Clear, data-driven decision with documented rationale. All stakeholders aligned.

---

## Frequently Asked Questions (FAQ)

### General

**Q: How often should we re-prioritize?**  
A: Quarterly is standard. Re-prioritize sooner if major changes occur (strategy shift, budget cuts, market changes).

**Q: Can we customize the criteria?**  
A: Yes (admin feature). You can add, remove, or modify criteria and weights to fit your organization.

**Q: What if two projects tie?**  
A: Review individual criterion scores to differentiate. If still tied, consider secondary factors like dependencies or timing.

**Q: Should we score all projects at once?**  
A: Yes, for consistency. Schedule a workshop with key stakeholders to score all projects together.

### Scoring

**Q: Who should score projects?**  
A: Typically a cross-functional team: PMO, project managers, executives, and subject matter experts. Collaborative scoring reduces bias.

**Q: Can one person score all projects?**  
A: Not recommended. Multiple perspectives improve objectivity and buy-in.

**Q: What if we disagree on a score?**  
A: Discuss the disagreement and reach consensus. If consensus fails, use the average score or escalate to a decision-maker.

**Q: Should we score projects we know will be funded anyway?**  
A: Yes, for transparency and future reference. Scoring validates decisions and creates an audit trail.

### Results

**Q: What do we do with low-priority projects?**  
A: Options include: defer, cancel, reduce scope, or assign minimal resources. Don't ignore them; make an explicit decision.

**Q: Can we override the rankings?**  
A: Yes, but document the rationale. The matrix is a decision support tool, not a replacement for judgment.

**Q: How do we communicate results to project teams?**  
A: Be transparent. Share the rankings, explain the methodology, and emphasize that it's data-driven and fair.

---

## Troubleshooting

### Can't See Prioritize Tab

**Issue**: Prioritize tab not visible in Program view

**Solutions**:
1. Verify you have a Program (not just Projects)
2. Check user permissions (need "program.prioritize" permission)
3. Contact administrator to enable feature
4. Refresh the page

### Scoring Interface Won't Load

**Issue**: Scoring page shows error or won't load

**Solutions**:
1. Refresh the page
2. Check that criteria are configured (admin setting)
3. Clear browser cache
4. Try a different browser
5. Contact support if issue persists

### Scores Not Calculating

**Issue**: Total score shows 0.00 or doesn't update

**Solutions**:
1. Ensure all criteria are scored (can't leave blanks)
2. Verify weights total 100% (admin setting)
3. Refresh the page
4. Re-enter scores
5. Check browser console for errors

### Export Fails

**Issue**: Export to Excel/PDF fails or times out

**Solutions**:
1. Try a smaller export (filter to fewer projects)
2. Check internet connection
3. Try a different format (Excel vs PDF)
4. Wait a few minutes and retry
5. Contact administrator

---

## Additional Resources

### Related Guides

- **Getting Started Guide**: Learn ADPA basics
- **Program Management Guide**: Managing programs and projects
- **Administrator Guide**: System configuration
- **Reporting Guide**: Creating executive reports

### Training

- **Video Tutorial**: "Portfolio Prioritization in 15 Minutes"
- **Live Webinar**: Monthly prioritization workshop
- **Hands-On Lab**: Practice scoring with sample projects

### Templates

- **Criteria Definitions Template**: Customize for your organization
- **Scoring Workshop Agenda**: Facilitate prioritization sessions
- **Executive Presentation Template**: Present results to leadership

---

## Summary: Key Takeaways

1. ✅ Portfolio Prioritization Matrix provides **objective, data-driven** project rankings
2. ✅ Default model uses **5 weighted criteria** (Strategic Alignment, Value, Risk, Resource, Urgency)
3. ✅ Scoring is **collaborative** - involve key stakeholders
4. ✅ Results classify projects into **4 priority tiers** (Critical, High, Medium, Low)
5. ✅ Rankings guide **resource allocation** and portfolio management
6. ✅ Export results to **share with stakeholders** (Excel, PDF, PowerPoint)
7. ✅ Re-prioritize **regularly** (quarterly or when things change)
8. ✅ Use rankings as a **decision support tool**, not a replacement for judgment

---

**Guide Version:** 1.0  
**Last Updated:** November 4, 2025  
**Maintained By:** ADPA Product Team  
**Next Review:** December 4, 2025

---

**Need Help?** Contact support@adpa-framework.com or visit the Help Center.

**Ready to prioritize?** Navigate to Programs → Select Program → Prioritize tab and get started! 🎯
