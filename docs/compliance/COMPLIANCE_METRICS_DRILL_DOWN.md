# Compliance Metrics Drill-Down Feature

**Last Updated**: 2026-01-24  
**Status**: ✅ Implemented - Drill-Down Details Available for All Compliance Metrics  
**Purpose**: Enable users to see detailed breakdowns of how each compliance metric score is calculated

---

## Overview

The Quality Audit Report now includes **drill-down functionality** for each compliance metric, providing users with:

1. **Detailed Score Breakdown** - How each percentage is calculated
2. **Scoring Factors** - What factors were checked and their point values
3. **Keyword Analysis** - Which keywords were found/missing
4. **Applicability Status** - Whether the metric is relevant for the document type
5. **Contribution to Overall** - How each metric contributes to the overall compliance rating
6. **Improvement Recommendations** - Specific actions to improve scores

---

## User Interface

### Location: Quality Audit Modal → Compliance Tab

**Access Path:**
1. Navigate to Document Metadata page
2. Click "View Full Report" button (or "Run Quality Audit" if not yet run)
3. Click on "Compliance" tab
4. Click on any compliance metric card to expand details

---

## Features

### 1. **Expandable Compliance Cards**

Each compliance metric card is now **clickable** and expands to show:
- ✅/❌ Status indicators for each scoring factor
- Points earned vs. maximum points
- Keywords found (green badges)
- Keywords missing (red badges)
- Calculation formula
- Contribution to overall compliance rating
- Improvement recommendations

### 2. **Applicability Handling**

**Not Applicable Metrics:**
- Metrics like **HIPAA** for non-healthcare documents show "Not Applicable" badge
- These metrics are **excluded** from overall compliance calculation
- Clear explanation of why the metric doesn't apply

**Example:**
```
HIPAA: N/A
"This compliance standard is not applicable to this document type."
```

### 3. **Overall Compliance Rating Breakdown**

The overall compliance rating card includes:
- **"How is this calculated?"** expandable section
- Individual metric contributions with weights
- Calculation formula showing weighted average
- Visual breakdown of each metric's contribution

**Example:**
```
PMBOK Guide: 100% × 25% = 25.0%
GDPR: 75% × 15% = 11.3%
SOC 2: 35% × 15% = 5.3%
Industry Standards: 25% × 15% = 3.8%
Best Practices: 45% × 15% = 6.8%
Template Adherence: 100% × 10% = 10.0%
HIPAA: Excluded (Not Applicable)

Total: 61.2% (rounded to 61%)
```

---

## Compliance Metrics with Drill-Down

### 1. **PMBOK Guide** (0-100%)

**Scoring Factors:**
- **PMBOK Structure** (30 points): Project Charter or Project Management Plan structure
- **PMBOK Process Groups** (30 points): Initiating, Planning, Executing, Monitoring, Closing
- **PMBOK Knowledge Areas** (25 points): 5+ knowledge area references
- **Keyword Coverage** (15 points): 8+ PMBOK keywords found

**Keywords Checked:**
- `pmbok`, `project management`, `project charter`, `stakeholder`, `scope`, `schedule`, `cost`, `quality`, `risk`, `communication`, `procurement`, `integration`

**Weight in Overall:** 15% (or 25% if framework is PMBOK-related)

---

### 2. **GDPR** (0-100%)

**Scoring Factors:**
- **GDPR Compliance Statement** (40 points): Explicit GDPR compliance mention
- **GDPR Principles** (25 points): Lawfulness, fairness, transparency
- **Data Subject Rights** (20 points): Right to access, erasure, portability
- **Keyword Coverage** (15 points): 5+ GDPR keywords found

**Keywords Checked:**
- `gdpr`, `general data protection regulation`, `personal data`, `data subject`, `consent`, `privacy`, `data protection`, `right to be forgotten`, `data breach`, `data controller`, `data processor`

**Weight in Overall:** 15%

---

### 3. **HIPAA** (0-100%)

**Scoring Factors:**
- **HIPAA Compliance Statement** (40 points): Explicit HIPAA compliance mention
- **HIPAA Privacy Rule** (25 points): Privacy Rule or PHI references
- **HIPAA Security Rule** (25 points): Security Rule or ePHI references
- **Keyword Coverage** (10 points): 4+ HIPAA keywords found

**Keywords Checked:**
- `hipaa`, `health insurance portability`, `protected health information`, `phi`, `ephi`, `privacy rule`, `security rule`, `breach notification`, `business associate`, `covered entity`

**Weight in Overall:** 15% (but excluded if not applicable)

**Applicability:**
- ✅ Applicable: Healthcare documents, medical records, health data processing
- ❌ Not Applicable: Construction projects, general business documents, non-healthcare contexts

---

### 4. **SOC 2** (0-100%)

**Scoring Factors:**
- **SOC 2 Compliance Statement** (40 points): Explicit SOC 2 compliance mention
- **Trust Service Criteria** (25 points): References to Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
- **Security Controls** (25 points): Security or availability controls mentioned
- **Keyword Coverage** (10 points): 4+ SOC 2 keywords found

**Keywords Checked:**
- `soc 2`, `soc2`, `service organization control`, `trust service criteria`, `security`, `availability`, `processing integrity`, `confidentiality`, `privacy`, `audit`, `controls`, `ccs`

**Weight in Overall:** 15%

---

### 5. **Industry Standards** (0-100%)

**Scoring Factors:**
- **ISO Standards** (35 points): ISO 9001, ISO 27001, ISO 20000, ISO 14001, ISO 45001
- **Other Industry Standards** (25 points): ANSI, IEEE, NIST, CMMI, ITIL, COBIT
- **Standards References** (25 points): 3+ industry standard references
- **Keyword Coverage** (15 points): 5+ industry standard keywords found

**Keywords Checked:**
- `iso`, `ansi`, `ieee`, `nist`, `cmmi`, `itil`, `cobit`, `industry standard`, `best practice`, `standard operating procedure`, `sop`

**Weight in Overall:** 15%

---

### 6. **Best Practices** (0-100%)

**Scoring Factors:**
- **Best Practices Mention** (30 points): Explicit best practices or recommended practices
- **Lessons Learned** (25 points): Lessons learned or continuous improvement references
- **Proven Methods** (20 points): Proven or established methodologies
- **Documentation Standards** (15 points): Documentation standards or guidelines
- **Keyword Coverage** (10 points): 3+ best practice keywords found

**Keywords Checked:**
- `best practice`, `industry best practice`, `recommended practice`, `proven approach`, `established methodology`, `lessons learned`, `continuous improvement`

**Weight in Overall:** 15%

---

### 7. **Template Adherence** (0-100%)

**Scoring Factors:**
- **Required Sections** (40 points if template exists, 30 if not): 3+ main sections (## headings)
- **Proper Formatting** (30 points if template exists, 25 if not): Tables (10+ cells) or lists (5+ items)
- **Consistent Structure** (30 points if template exists, 25 if not): 2+ subsections (### headings)
- **Base Score** (20 points): Only if no template specified

**Weight in Overall:** 10%

---

## Visual Features

### Expandable Cards
- **Collapsed State:** Shows metric name, icon, score, and progress bar
- **Expanded State:** Shows detailed breakdown with all factors, keywords, and recommendations
- **Chevron Icon:** Indicates expandable state (down = collapsed, up = expanded)

### Color Coding
- **Green (✓)**: Factor passed, keyword found
- **Red (✗)**: Factor failed, keyword missing
- **Progress Bars**: Visual representation of score vs. maximum

### Badges
- **"Not Applicable"**: Gray badge for metrics that don't apply
- **Keyword Badges**: Green for found, red for missing

---

## Example: PMBOK Guide Drill-Down

**Collapsed View:**
```
📘 PMBOK Guide
PMBOK Guide compliance
100%
[Progress Bar: 100%]
```

**Expanded View:**
```
📘 PMBOK Guide
PMBOK Guide compliance
100%                    [Chevron Up]

─────────────────────────────────────
Score Breakdown
100% | 100 / 100 points

Scoring Factors:
✓ PMBOK Structure                   30 / 30 pts
  Document includes Project Charter or Project Management Plan structure
  ✓ Keywords Found: project charter, project management plan

✓ PMBOK Process Groups              30 / 30 pts
  Document references PMBOK process groups
  ✓ Keywords Found: initiating, planning, executing, monitoring, closing

✓ PMBOK Knowledge Areas             25 / 25 pts
  Document references 5+ PMBOK knowledge areas
  ✓ Keywords Found: pmbok, project management, stakeholder, scope, schedule, cost, quality, risk, communication, procurement, integration

✓ Keyword Coverage                  15 / 15 pts
  Excellent keyword coverage (8+ keywords)
  ✓ Keywords Found: [all 12 keywords]
  ✗ Keywords Missing: [none]

Calculation Formula:
Score = 30 (Structure) + 30 (Processes) + 25 (Knowledge Areas) + 15 (Keywords) = 100%

Contribution to Overall Compliance:
PMBOK Guide: 100% × 25% weight = 25.0%

Improvement Recommendations:
[None - score is perfect]
```

---

## Technical Implementation

### Frontend Component: `QualityAuditModal.tsx`

**Enhanced Components:**
- `ComplianceMetricCard` - Now expandable with drill-down details
- `ComplianceBreakdownDetails` - Shows detailed breakdown
- `OverallComplianceBreakdown` - Shows overall rating calculation
- `calculateComplianceBreakdown` - Calculates detailed breakdown on-demand

**Data Flow:**
1. User clicks on compliance metric card
2. Component fetches document content (if not already loaded)
3. `calculateComplianceBreakdown()` analyzes document content
4. Breakdown details displayed in expanded card

### Backend Enhancement: `qualityAuditService.ts`

**Updated Method:**
- `getDocumentAudit(documentId, includeContent)` - Now accepts `includeContent` parameter
- When `includeContent=true`, includes document content in response
- Includes `framework_used` from document for weight calculation

**API Endpoint:**
- `GET /api/quality-audits/document/:documentId?includeContent=true`
- Optional query parameter to include document content for breakdown analysis

---

## Benefits

### For End Users:
1. **Transparency**: Understand exactly how scores are calculated
2. **Actionable Insights**: See which keywords are missing to improve scores
3. **Context Awareness**: Understand which metrics are applicable
4. **Improvement Guidance**: Get specific recommendations for each metric

### For Document Quality:
1. **Targeted Improvements**: Know exactly what to add to improve scores
2. **Compliance Verification**: Verify that all required elements are present
3. **Standards Alignment**: Ensure documents meet all applicable standards

---

## Usage Examples

### Example 1: Low Industry Standards Score (25%)

**User Action:** Click on "Industry Standards" card

**Drill-Down Shows:**
- ❌ ISO Standards: 0 / 35 pts - No ISO standards found
- ❌ Other Industry Standards: 0 / 25 pts - No ANSI/IEEE/NIST found
- ✓ Standards References: 25 / 25 pts - 3+ industry keywords found
- ✓ Keyword Coverage: 10 / 15 pts - 3 keywords found (target: 5+)

**Recommendations:**
- Add ISO standard references (e.g., ISO 9001, ISO 27001, ISO 14001)
- Reference other industry standards (ANSI, IEEE, NIST, ITIL, COBIT)
- Add more industry standard keywords (currently 3, target: 3+)

**Result:** User knows exactly what to add to improve from 25% to 75%+

---

### Example 2: HIPAA Not Applicable

**User Action:** Click on "HIPAA" card

**Drill-Down Shows:**
- **Not Applicable Badge**: HIPAA is not relevant for this document type (construction project)
- **Explanation**: "HIPAA is typically only applicable to healthcare-related documents. If this document handles health information, add HIPAA compliance measures."
- **Contribution**: Excluded from overall compliance calculation

**Result:** User understands why HIPAA shows 0% and that it doesn't affect overall rating

---

### Example 3: Overall Compliance Rating Breakdown

**User Action:** Click "How is this calculated?" in Overall Compliance Rating card

**Drill-Down Shows:**
```
Calculation Breakdown:

PMBOK Guide: 100% × 25% = 25.0%
GDPR: 75% × 15% = 11.3%
SOC 2: 35% × 15% = 5.3%
Industry Standards: 25% × 15% = 3.8%
Best Practices: 45% × 15% = 6.8%
Template Adherence: 100% × 10% = 10.0%
HIPAA: Excluded (Not Applicable)

Total: 61.2% (rounded to 61%)

Formula:
PMBOK Guide: 100% × 25% = 25.0% + GDPR: 75% × 15% = 11.3% + ...
= 61.2% (rounded to 61%)
```

**Result:** User understands how 52% overall rating is calculated and which metrics contribute most

---

## Future Enhancements

### Potential Additions:
1. **Export Breakdown**: Export detailed breakdown as PDF or CSV
2. **Historical Comparison**: Compare breakdowns across document versions
3. **Benchmarking**: Compare scores against similar documents
4. **Auto-Improvement**: AI suggestions based on missing keywords
5. **Interactive Editing**: Click to add missing keywords directly

---

## Testing Checklist

- [ ] Click on each compliance metric card expands/collapses correctly
- [ ] Breakdown shows correct scoring factors for each metric
- [ ] Keywords found/missing are accurately displayed
- [ ] "Not Applicable" status shows correctly for HIPAA on non-healthcare documents
- [ ] Overall compliance breakdown shows correct calculations
- [ ] Recommendations are relevant and actionable
- [ ] Document content is fetched when needed
- [ ] Component handles missing document content gracefully
- [ ] Weight calculations are correct (PMBOK 25% vs 15%)
- [ ] All 7 compliance metrics have drill-down functionality

---

**Last Updated:** 2026-01-24  
**Status:** ✅ Implemented and Ready for Testing  
**Maintained By:** ADPA Development Team
