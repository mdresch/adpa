# Template Compliance Workflow

## Overview

The ADPA system includes a comprehensive **Framework Compliance Review** stage in the template lifecycle to ensure generated documents meet industry framework standards (PMBOK 7, TOGAF, BABOK, etc.).

---

## 🎯 Complete Workflow

### **Stage 1: Testing** → **Stage 2: Compliance Review**

```
Draft (0 validations)
  ↓ (1+ validations)
Testing (3+ validations, 75%+ success)
  ↓ (manual promotion)
Compliance Review (5+ validations, 80%+ success)
  ↓ (manual compliance approval + promotion)
Validated (10+ validations, 90%+ success)
  ↓ (manual promotion)
Production ✅
```

---

## 📋 Compliance Stage: What Happens

When a template reaches the **Compliance Review** stage:

### **1. Automatic Requirements Check**
- ✅ **5+ validation runs** (document generations)
- ✅ **80%+ success rate**
- ⏳ **Manual compliance approval** (pending)

### **2. Manual Review Process**

The reviewer (typically a Subject Matter Expert or PMO) must:

1. **Generate 3-5 sample documents** using different prompts
2. **Review each document** against the framework checklist
3. **Verify compliance** with framework standards
4. **Approve or reject** the template

---

## ✅ Compliance Checklist

When reviewing a template, verify:

| Review Requirement | What to Check |
| :--- | :--- |
| **Framework Structure** | Generated documents follow the framework's required structure (e.g., PMBOK 7 uses 8 Performance Domains, not 10 Knowledge Areas) |
| **Required Sections** | All mandatory sections are present and complete |
| **Terminology** | Language and terminology align with framework standards |
| **Content Quality** | Content is specific, well-justified, and demonstrates understanding of the framework |

### **Example: PMBOK 7 Compliance**

For a PMBOK 7 template, verify:
- ✅ Uses **8 Performance Domains** (Stakeholders, Team, Planning, Project Work, Delivery, Measurement, Uncertainty, Tailoring)
- ✅ References **12 Principles** (Value, Stewardship, Team, Leadership, etc.)
- ✅ Focuses on **outcomes** (not just outputs)
- ✅ Includes **Development Approach & Tailoring Strategy**
- ✅ Uses correct terminology (e.g., "Performance Measurement Baseline" not "Triple Constraint")

---

## 🖥️ System Implementation

### **Database Layer**

**Table: `templates`**
```sql
-- Compliance tracking columns
compliance_checked_at TIMESTAMP     -- When compliance was approved
compliance_checked_by UUID          -- Who approved it
compliance_notes TEXT               -- Review notes
framework_compliance_score NUMERIC  -- Score 0-1 (e.g., 0.95 = 95%)
```

**Function: `approve_template_compliance()`**
```sql
CREATE OR REPLACE FUNCTION approve_template_compliance(
  p_template_id UUID,
  p_user_id UUID,
  p_compliance_score NUMERIC,  -- Percentage (0-100)
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
```

**Requirements:**
- Template must be in `compliance` status
- Score is converted from percentage (0-100) to decimal (0-1)
- Records timestamp, reviewer, score, and notes

---

### **Backend API**

**Endpoint:** `POST /api/templates/:id/compliance/approve`

**Request Body:**
```json
{
  "compliance_score": 95,
  "notes": "PMBOK 7 compliance approved. All 8 Performance Domains present, terminology correct, content quality excellent."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance approved with score: 95%",
  "compliance_score": 0.95,
  "compliance_checked_at": "2025-10-18T16:30:00Z"
}
```

**Permissions:** Requires `templates.update` permission

---

### **Frontend UI**

**Location:** `/templates/[id]` (Template Detail Page)

**UI Components:**

1. **Compliance Review Card** (visible only when status = 'compliance')
   - Shows framework name
   - Displays compliance checklist
   - Shows approval status

2. **Pending Review State:**
   ```
   🟠 Pending Review
   
   Review Requirements:
   ✓ Generated documents follow PMBOK 7 structure
   ✓ Required sections are present and complete
   ✓ Terminology aligns with framework standards
   ✓ Content quality meets framework expectations
   
   💡 Tip: Generate 3-5 sample documents with different prompts
   
   [Approve PMBOK 7 Compliance] ← Button
   ```

3. **Approved State:**
   ```
   ✅ Compliance Approved
   
   Score: 95%
   Reviewed: Oct 18, 2025
   
   [Promote to Validated] ← Now enabled
   ```

---

## 🔄 Complete User Journey

### **Step-by-Step Workflow**

#### **1. Create Template**
```
Status: Draft
Actions: Generate first document
```

#### **2. Initial Testing**
```
Status: Testing
Requirements: 3+ validations, 75%+ success
Actions: Generate 3+ documents, verify quality
Button: "Promote to Compliance Review"
```

#### **3. Compliance Review**
```
Status: Compliance Review
Requirements: 5+ validations, 80%+ success, manual approval
Actions: 
  1. Generate 5+ sample documents
  2. Review against framework checklist
  3. Click "Approve [Framework] Compliance" button
  4. System records approval timestamp, score, notes
  5. "Promote to Validated" button becomes enabled
```

#### **4. Validated**
```
Status: Validated
Requirements: 10+ validations, 90%+ success
Actions: Continue generating documents
Button: "Promote to Production"
```

#### **5. Production**
```
Status: Production ✅
Actions: Template is production-ready
Features: Batch generation enabled (up to 10 documents)
```

---

## 🎯 Current Implementation Status

### ✅ **Completed**
- Database schema with compliance columns
- SQL function `approve_template_compliance()`
- Backend API endpoint `/templates/:id/compliance/approve`
- Frontend UI with compliance card
- Frontend handler `handleApproveCompliance()`
- Automatic cache clearing after approval
- Promote button validation includes compliance check

### 📝 **How to Use (Current System)**

**Option 1: UI Button (Recommended)**
1. Go to template detail page
2. Scroll to "Framework Compliance Review" card
3. Review checklist
4. Click "Approve [Framework] Compliance" button
5. System automatically approves with 95% score

**Option 2: Script (For Testing)**
```bash
node scripts/approve-pmbok7-compliance.js
```

**Option 3: Direct API Call**
```bash
curl -X POST http://localhost:5000/api/templates/{id}/compliance/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "compliance_score": 95,
    "notes": "Framework compliance verified"
  }'
```

---

## 🎨 Future Enhancements

### **Potential Improvements**

1. **Interactive Compliance Form**
   - Add UI form to input compliance score (slider 0-100%)
   - Add text area for detailed review notes
   - Add checklist with checkboxes for each requirement

2. **Multi-Reviewer Approval**
   - Require 2+ reviewers for production promotion
   - Track all reviewer votes
   - Show consensus score

3. **Framework-Specific Checklists**
   - PMBOK 7: 8 Performance Domains + 12 Principles
   - TOGAF: ADM phases, artifacts, deliverables
   - BABOK: Knowledge Areas, techniques, perspectives
   - Auto-generate checklist based on template framework

4. **Document Comparison**
   - Side-by-side comparison of 3+ generated documents
   - Highlight variations and inconsistencies
   - Show framework element coverage matrix

5. **Compliance History**
   - Track all compliance reviews
   - Show approval/rejection history
   - Display reviewer comments timeline

---

## 📊 Example: PMBOK 7 Template Review

### **Your Recent Review Summary**

**Template:** PMBOK 7 Project Management Plan  
**Status:** Compliance Review (5/5 validations, 100% success)  
**Framework:** PMBOK 7th Edition  

**Manual Review Results:**
```
✅ HIGH COMPLIANCE - Generated documents follow PMBOK 7 structure
   → Successfully uses 8 Performance Domains (not 10 Knowledge Areas)
   → Includes Development Approach & Tailoring Strategy section

✅ COMPLIANT - Required sections present and complete
   → All critical components present: Value, Objectives, Tailoring,
     8 Performance Domains, Change/Closure

✅ COMPLIANT - Terminology aligns with framework standards
   → Uses: Value Proposition, Hybrid Approach, Tailoring Justification,
     Uncertainty Performance Domain, Team Charter, Artifacts

✅ HIGH COMPLIANCE - Content quality meets framework expectations
   → Specific, well-justified content
   → Deep understanding of modern PM practices
   → Strong tailoring justification linking to complexity/uncertainty
```

**Approval Action:**
```sql
-- Automatic approval via UI button or script
SELECT approve_template_compliance(
  '09f406cc-0d98-48db-89c3-fea4dbca005c',  -- template_id
  'admin-user-id',                          -- user_id
  95.0                                       -- compliance_score (95%)
);
```

**Result:**
- ✅ Compliance approved at 95%
- ✅ "Promote to Validated" button now enabled
- ✅ Template ready for final validation stage

---

## 🔒 Security & Permissions

**Required Permissions:**
- `templates.update` - Required to approve compliance
- `templates.promote` - Required to promote after approval

**Audit Trail:**
- All approvals logged in `template_lifecycle_events` table
- Compliance details stored in `templates` table
- Cache automatically cleared to reflect new status

---

## 📖 Related Documentation

- [Template Lifecycle Management](./TEMPLATE_LIFECYCLE.md)
- [Template Status System](../07-architecture/TEMPLATE_STATUS_SYSTEM.md)
- [PMBOK 7 Template Guide](./PMBOK7_TEMPLATE_GUIDE.md)
- [AI Template Request Flow](./AI_TEMPLATE_REQUEST_FLOW_GUIDE.md)

---

## ✅ Summary

**Compliance approval is a critical quality gate** ensuring templates produce documents that meet professional framework standards before entering validated/production use.

**Key Points:**
1. ✅ Automatic validation count & success rate checks
2. ✅ Manual expert review of generated documents
3. ✅ Framework-specific compliance verification
4. ✅ One-click approval via UI (or API/script)
5. ✅ Enables promotion to Validated stage
6. ✅ Full audit trail and cache management

**Current Status:** ✅ Fully implemented and ready to use!

