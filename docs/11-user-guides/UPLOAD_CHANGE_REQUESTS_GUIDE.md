# How to Upload Change Requests to ADPA
**Guide Version:** 1.0  
**Date:** October 20, 2025  
**Status:** ✅ Template Created & Ready

---

## Quick Start

✅ **Change Request Template Created!**
- **Template ID:** `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- **Name:** Change Request (CR)
- **Framework:** PMBOK
- **Category:** Change Management
- **Status:** Production (ready to use)

---

## Step-by-Step Upload Process

### 1. Navigate to Your Project

1. Go to http://localhost:3000 (or your ADPA URL)
2. Click on **Projects** in the sidebar
3. Select your project (e.g., "ADPA")

### 2. Open Document Upload

**Option A: From Project Detail Page**
1. On the project page, go to the **Documents** tab
2. Click the **"Upload Document"** button (top right)

**Option B: From Documents List**
1. Navigate to **Projects → [Your Project] → Documents**
2. Click **"Upload Document"** button

### 3. Upload Change Request

**Upload Dialog Fields:**

1. **Document Name:** 
   - Enter a clear name (e.g., "CR-2026-001 Baseline Drift Detection")
   
2. **Select File:**
   - Click "Choose File" or drag & drop
   - Select your CR markdown file (e.g., `CR-2026-001_Baseline_Drift_Detection.md`)
   
3. **Template Selection:**
   - **Important:** Select **"Change Request (CR)"** from the dropdown
   - This template has the PMBOK change management structure
   
4. Click **"Upload Document"**

---

## Change Requests to Upload

### CR-2026-001: Baseline Drift Detection System
- **File:** `docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md`
- **Status:** ✅ Approved & Authorized
- **Budget:** $400,000
- **Timeline:** 12 months

### CR-2026-002: Feedback Intelligence System
- **File:** `docs/roadmap/change-requests/CR-2026-002_Feedback_Intelligence.md`
- **Status:** ✅ Approved
- **Budget:** TBD
- **Timeline:** TBD

### CR-2026-003: Advanced Analytics Dashboard
- **File:** `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md` (extract CR-2026-003)
- **Status:** ✅ Deployed
- **Timeline:** Completed

### CR-2026-004: ADPA Budget & Resources
- **File:** `docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md`
- **Status:** ✅ Approved
- **Budget:** $320K-$400K
- **Timeline:** 6 months

### CR-2027-001: Background Document Generation
- **File:** Extract from `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md`
- **Status:** ✅ Approved for next sprint
- **Timeline:** TBD

---

## Template Structure

The Change Request (CR) template includes:

### Core Sections

1. **CR Identification**
   - CR ID, Project, Date, Priority, Type, Status
   
2. **Executive Summary**
   - 2-3 sentence overview
   
3. **Change Description**
   - Current state, Proposed change, Reason for change
   
4. **Business Justification**
   - Business value, Alignment with objectives, Alternatives
   
5. **Impact Analysis**
   - Scope, Schedule, Cost, Quality, Resources, Stakeholders
   
6. **Risk Assessment**
   - Risks of implementing
   - Risks of NOT implementing
   
7. **Dependencies & Constraints**
   
8. **Implementation Plan**
   - Approach, Timeline, Resources, Success criteria
   
9. **Approval Workflow**
   - Approval authority, Review & approval table, Conditions
   
10. **Baseline Updates**
    - Scope, Schedule, Cost, Quality, Communications
    
11. **Attachments & References**

---

## After Upload

### What Happens Next

1. **Document Saved:**
   - CR is stored in the database
   - Linked to your project
   - Assigned the "Change Request (CR)" template
   
2. **Metadata Captured:**
   - Upload date
   - File size
   - Creator
   - Template association
   
3. **Available Actions:**
   - **View:** Read the full CR
   - **Edit:** Modify content (if permissions allow)
   - **Download:** Export as PDF or DOCX
   - **Share:** Distribute to stakeholders
   - **Baseline Validation:** (if baseline exists) CR will be checked for drift

### Baseline Drift Detection

**Important:** If your project has an active baseline (CR-2026-001 Phase 1), uploaded CRs will automatically be validated for drift:

- **Scope Drift:** Changes to project scope
- **Cost Drift:** Budget modifications
- **Timeline Drift:** Schedule impacts
- **Technical Drift:** Technology changes
- **Resource Drift:** Team changes

Any detected drift will appear in the **Baseline** tab with:
- Drift type
- Severity (Low/Medium/High/Critical)
- Description
- Impact assessment

---

## Troubleshooting

### Template Not Showing in Dropdown

**Problem:** "Change Request (CR)" template not visible

**Solution:**
```bash
# Verify template exists
cd D:\source\repos\adpa
node scripts/create-change-request-template.js

# Restart frontend
cd D:\source\repos\adpa
npm run dev
```

### Upload Fails

**Problem:** Upload error or timeout

**Solutions:**
1. **File Size:** Ensure file < 10MB
2. **Format:** Use `.md` (Markdown) files
3. **Backend Running:** Check `http://localhost:5000/health`
4. **Permissions:** Ensure you have `documents.create` permission

### Template Selection Blank

**Problem:** Template dropdown is empty

**Solution:**
```bash
# Check backend logs
cd D:\source\repos\adpa\server
npm run dev

# Should see: "Templates loaded: X templates"
# If 0, run template creation script
```

---

## Verification Checklist

After uploading, verify:

- [ ] Document appears in Documents list
- [ ] Document name is correct
- [ ] Template shows as "Change Request (CR)"
- [ ] File can be opened/viewed
- [ ] Metadata is captured (date, creator, etc.)
- [ ] Baseline validation ran (if baseline exists)
- [ ] No errors in browser console

---

## Advanced: Bulk Upload Script

For uploading multiple CRs programmatically:

```javascript
// scripts/bulk-upload-crs.js
const fs = require('fs');
const path = require('path');
const apiClient = require('../lib/api').apiClient;

const CRs = [
  {
    file: 'docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md',
    name: 'CR-2026-001: Baseline Drift Detection System'
  },
  {
    file: 'docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md',
    name: 'CR-2026-004: ADPA Budget & Resources'
  }
];

async function bulkUploadCRs(projectId) {
  const templateId = 'a421afc9-81b8-45bf-9bf4-19fec3712f3a'; // Change Request template
  
  for (const cr of CRs) {
    console.log(`Uploading ${cr.name}...`);
    const content = fs.readFileSync(cr.file, 'utf8');
    
    await apiClient.createDocument({
      project_id: projectId,
      name: cr.name,
      content: content,
      template_id: templateId,
      status: 'approved'
    });
    
    console.log(`✅ ${cr.name} uploaded`);
  }
}

// Usage: node scripts/bulk-upload-crs.js <project-id>
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/bulk-upload-crs.js <project-id>');
  process.exit(1);
}

bulkUploadCRs(projectId).catch(console.error);
```

---

## Best Practices

### Naming Convention

Use consistent naming for CRs:
```
CR-YYYY-NNN: [Title]

Examples:
CR-2026-001: Baseline Drift Detection System
CR-2026-002: Feedback Intelligence System
CR-2026-004: ADPA Budget & Resources
```

### Status Tracking

After upload, update CR status in the document:
- **Draft** → **Submitted** → **Under Review** → **Approved/Rejected**

### Version Control

For CR revisions:
- Upload new version with version suffix: `CR-2026-001 v1.1`
- Or edit existing document with version history

### Linking

Reference related documents:
- Link to project charter
- Link to risk register
- Link to other related CRs
- Link to baseline (if applicable)

---

## FAQ

**Q: Can I upload CRs as PDF?**  
A: Yes, but Markdown (.md) is recommended for better integration with ADPA features like baseline drift detection and AI analysis.

**Q: Will uploaded CRs trigger baseline validation?**  
A: Yes, if your project has an active baseline (CR-2026-001 implemented), all uploaded documents are automatically validated.

**Q: Can I upload multiple CRs at once?**  
A: UI supports one-at-a-time upload. Use the bulk upload script (above) for multiple files.

**Q: What if my CR has attachments?**  
A: Upload the main CR document, then add attachments as separate documents or reference external links.

**Q: How do I update an uploaded CR?**  
A: Navigate to the document → Click "Edit" → Modify content → Save

---

## Support

**Issues with Upload:**
- Check frontend console (F12)
- Check backend logs (`server/logs/`)
- Verify template exists: `node scripts/create-change-request-template.js`

**Template Questions:**
- Template ID: `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- Template Name: "Change Request (CR)"
- Framework: PMBOK
- Category: Change Management

---

**Guide Version:** 1.0  
**Last Updated:** October 20, 2025  
**Maintained By:** Project Management Office

**Guide Version:** 1.0  
**Date:** October 20, 2025  
**Status:** ✅ Template Created & Ready

---

## Quick Start

✅ **Change Request Template Created!**
- **Template ID:** `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- **Name:** Change Request (CR)
- **Framework:** PMBOK
- **Category:** Change Management
- **Status:** Production (ready to use)

---

## Step-by-Step Upload Process

### 1. Navigate to Your Project

1. Go to http://localhost:3000 (or your ADPA URL)
2. Click on **Projects** in the sidebar
3. Select your project (e.g., "ADPA")

### 2. Open Document Upload

**Option A: From Project Detail Page**
1. On the project page, go to the **Documents** tab
2. Click the **"Upload Document"** button (top right)

**Option B: From Documents List**
1. Navigate to **Projects → [Your Project] → Documents**
2. Click **"Upload Document"** button

### 3. Upload Change Request

**Upload Dialog Fields:**

1. **Document Name:** 
   - Enter a clear name (e.g., "CR-2026-001 Baseline Drift Detection")
   
2. **Select File:**
   - Click "Choose File" or drag & drop
   - Select your CR markdown file (e.g., `CR-2026-001_Baseline_Drift_Detection.md`)
   
3. **Template Selection:**
   - **Important:** Select **"Change Request (CR)"** from the dropdown
   - This template has the PMBOK change management structure
   
4. Click **"Upload Document"**

---

## Change Requests to Upload

### CR-2026-001: Baseline Drift Detection System
- **File:** `docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md`
- **Status:** ✅ Approved & Authorized
- **Budget:** $400,000
- **Timeline:** 12 months

### CR-2026-002: Feedback Intelligence System
- **File:** `docs/roadmap/change-requests/CR-2026-002_Feedback_Intelligence.md`
- **Status:** ✅ Approved
- **Budget:** TBD
- **Timeline:** TBD

### CR-2026-003: Advanced Analytics Dashboard
- **File:** `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md` (extract CR-2026-003)
- **Status:** ✅ Deployed
- **Timeline:** Completed

### CR-2026-004: ADPA Budget & Resources
- **File:** `docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md`
- **Status:** ✅ Approved
- **Budget:** $320K-$400K
- **Timeline:** 6 months

### CR-2027-001: Background Document Generation
- **File:** Extract from `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md`
- **Status:** ✅ Approved for next sprint
- **Timeline:** TBD

---

## Template Structure

The Change Request (CR) template includes:

### Core Sections

1. **CR Identification**
   - CR ID, Project, Date, Priority, Type, Status
   
2. **Executive Summary**
   - 2-3 sentence overview
   
3. **Change Description**
   - Current state, Proposed change, Reason for change
   
4. **Business Justification**
   - Business value, Alignment with objectives, Alternatives
   
5. **Impact Analysis**
   - Scope, Schedule, Cost, Quality, Resources, Stakeholders
   
6. **Risk Assessment**
   - Risks of implementing
   - Risks of NOT implementing
   
7. **Dependencies & Constraints**
   
8. **Implementation Plan**
   - Approach, Timeline, Resources, Success criteria
   
9. **Approval Workflow**
   - Approval authority, Review & approval table, Conditions
   
10. **Baseline Updates**
    - Scope, Schedule, Cost, Quality, Communications
    
11. **Attachments & References**

---

## After Upload

### What Happens Next

1. **Document Saved:**
   - CR is stored in the database
   - Linked to your project
   - Assigned the "Change Request (CR)" template
   
2. **Metadata Captured:**
   - Upload date
   - File size
   - Creator
   - Template association
   
3. **Available Actions:**
   - **View:** Read the full CR
   - **Edit:** Modify content (if permissions allow)
   - **Download:** Export as PDF or DOCX
   - **Share:** Distribute to stakeholders
   - **Baseline Validation:** (if baseline exists) CR will be checked for drift

### Baseline Drift Detection

**Important:** If your project has an active baseline (CR-2026-001 Phase 1), uploaded CRs will automatically be validated for drift:

- **Scope Drift:** Changes to project scope
- **Cost Drift:** Budget modifications
- **Timeline Drift:** Schedule impacts
- **Technical Drift:** Technology changes
- **Resource Drift:** Team changes

Any detected drift will appear in the **Baseline** tab with:
- Drift type
- Severity (Low/Medium/High/Critical)
- Description
- Impact assessment

---

## Troubleshooting

### Template Not Showing in Dropdown

**Problem:** "Change Request (CR)" template not visible

**Solution:**
```bash
# Verify template exists
cd D:\source\repos\adpa
node scripts/create-change-request-template.js

# Restart frontend
cd D:\source\repos\adpa
npm run dev
```

### Upload Fails

**Problem:** Upload error or timeout

**Solutions:**
1. **File Size:** Ensure file < 10MB
2. **Format:** Use `.md` (Markdown) files
3. **Backend Running:** Check `http://localhost:5000/health`
4. **Permissions:** Ensure you have `documents.create` permission

### Template Selection Blank

**Problem:** Template dropdown is empty

**Solution:**
```bash
# Check backend logs
cd D:\source\repos\adpa\server
npm run dev

# Should see: "Templates loaded: X templates"
# If 0, run template creation script
```

---

## Verification Checklist

After uploading, verify:

- [ ] Document appears in Documents list
- [ ] Document name is correct
- [ ] Template shows as "Change Request (CR)"
- [ ] File can be opened/viewed
- [ ] Metadata is captured (date, creator, etc.)
- [ ] Baseline validation ran (if baseline exists)
- [ ] No errors in browser console

---

## Advanced: Bulk Upload Script

For uploading multiple CRs programmatically:

```javascript
// scripts/bulk-upload-crs.js
const fs = require('fs');
const path = require('path');
const apiClient = require('../lib/api').apiClient;

const CRs = [
  {
    file: 'docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md',
    name: 'CR-2026-001: Baseline Drift Detection System'
  },
  {
    file: 'docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md',
    name: 'CR-2026-004: ADPA Budget & Resources'
  }
];

async function bulkUploadCRs(projectId) {
  const templateId = 'a421afc9-81b8-45bf-9bf4-19fec3712f3a'; // Change Request template
  
  for (const cr of CRs) {
    console.log(`Uploading ${cr.name}...`);
    const content = fs.readFileSync(cr.file, 'utf8');
    
    await apiClient.createDocument({
      project_id: projectId,
      name: cr.name,
      content: content,
      template_id: templateId,
      status: 'approved'
    });
    
    console.log(`✅ ${cr.name} uploaded`);
  }
}

// Usage: node scripts/bulk-upload-crs.js <project-id>
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/bulk-upload-crs.js <project-id>');
  process.exit(1);
}

bulkUploadCRs(projectId).catch(console.error);
```

---

## Best Practices

### Naming Convention

Use consistent naming for CRs:
```
CR-YYYY-NNN: [Title]

Examples:
CR-2026-001: Baseline Drift Detection System
CR-2026-002: Feedback Intelligence System
CR-2026-004: ADPA Budget & Resources
```

### Status Tracking

After upload, update CR status in the document:
- **Draft** → **Submitted** → **Under Review** → **Approved/Rejected**

### Version Control

For CR revisions:
- Upload new version with version suffix: `CR-2026-001 v1.1`
- Or edit existing document with version history

### Linking

Reference related documents:
- Link to project charter
- Link to risk register
- Link to other related CRs
- Link to baseline (if applicable)

---

## FAQ

**Q: Can I upload CRs as PDF?**  
A: Yes, but Markdown (.md) is recommended for better integration with ADPA features like baseline drift detection and AI analysis.

**Q: Will uploaded CRs trigger baseline validation?**  
A: Yes, if your project has an active baseline (CR-2026-001 implemented), all uploaded documents are automatically validated.

**Q: Can I upload multiple CRs at once?**  
A: UI supports one-at-a-time upload. Use the bulk upload script (above) for multiple files.

**Q: What if my CR has attachments?**  
A: Upload the main CR document, then add attachments as separate documents or reference external links.

**Q: How do I update an uploaded CR?**  
A: Navigate to the document → Click "Edit" → Modify content → Save

---

## Support

**Issues with Upload:**
- Check frontend console (F12)
- Check backend logs (`server/logs/`)
- Verify template exists: `node scripts/create-change-request-template.js`

**Template Questions:**
- Template ID: `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- Template Name: "Change Request (CR)"
- Framework: PMBOK
- Category: Change Management

---

**Guide Version:** 1.0  
**Last Updated:** October 20, 2025  
**Maintained By:** Project Management Office

**Guide Version:** 1.0  
**Date:** October 20, 2025  
**Status:** ✅ Template Created & Ready

---

## Quick Start

✅ **Change Request Template Created!**
- **Template ID:** `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- **Name:** Change Request (CR)
- **Framework:** PMBOK
- **Category:** Change Management
- **Status:** Production (ready to use)

---

## Step-by-Step Upload Process

### 1. Navigate to Your Project

1. Go to http://localhost:3000 (or your ADPA URL)
2. Click on **Projects** in the sidebar
3. Select your project (e.g., "ADPA")

### 2. Open Document Upload

**Option A: From Project Detail Page**
1. On the project page, go to the **Documents** tab
2. Click the **"Upload Document"** button (top right)

**Option B: From Documents List**
1. Navigate to **Projects → [Your Project] → Documents**
2. Click **"Upload Document"** button

### 3. Upload Change Request

**Upload Dialog Fields:**

1. **Document Name:** 
   - Enter a clear name (e.g., "CR-2026-001 Baseline Drift Detection")
   
2. **Select File:**
   - Click "Choose File" or drag & drop
   - Select your CR markdown file (e.g., `CR-2026-001_Baseline_Drift_Detection.md`)
   
3. **Template Selection:**
   - **Important:** Select **"Change Request (CR)"** from the dropdown
   - This template has the PMBOK change management structure
   
4. Click **"Upload Document"**

---

## Change Requests to Upload

### CR-2026-001: Baseline Drift Detection System
- **File:** `docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md`
- **Status:** ✅ Approved & Authorized
- **Budget:** $400,000
- **Timeline:** 12 months

### CR-2026-002: Feedback Intelligence System
- **File:** `docs/roadmap/change-requests/CR-2026-002_Feedback_Intelligence.md`
- **Status:** ✅ Approved
- **Budget:** TBD
- **Timeline:** TBD

### CR-2026-003: Advanced Analytics Dashboard
- **File:** `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md` (extract CR-2026-003)
- **Status:** ✅ Deployed
- **Timeline:** Completed

### CR-2026-004: ADPA Budget & Resources
- **File:** `docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md`
- **Status:** ✅ Approved
- **Budget:** $320K-$400K
- **Timeline:** 6 months

### CR-2027-001: Background Document Generation
- **File:** Extract from `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md`
- **Status:** ✅ Approved for next sprint
- **Timeline:** TBD

---

## Template Structure

The Change Request (CR) template includes:

### Core Sections

1. **CR Identification**
   - CR ID, Project, Date, Priority, Type, Status
   
2. **Executive Summary**
   - 2-3 sentence overview
   
3. **Change Description**
   - Current state, Proposed change, Reason for change
   
4. **Business Justification**
   - Business value, Alignment with objectives, Alternatives
   
5. **Impact Analysis**
   - Scope, Schedule, Cost, Quality, Resources, Stakeholders
   
6. **Risk Assessment**
   - Risks of implementing
   - Risks of NOT implementing
   
7. **Dependencies & Constraints**
   
8. **Implementation Plan**
   - Approach, Timeline, Resources, Success criteria
   
9. **Approval Workflow**
   - Approval authority, Review & approval table, Conditions
   
10. **Baseline Updates**
    - Scope, Schedule, Cost, Quality, Communications
    
11. **Attachments & References**

---

## After Upload

### What Happens Next

1. **Document Saved:**
   - CR is stored in the database
   - Linked to your project
   - Assigned the "Change Request (CR)" template
   
2. **Metadata Captured:**
   - Upload date
   - File size
   - Creator
   - Template association
   
3. **Available Actions:**
   - **View:** Read the full CR
   - **Edit:** Modify content (if permissions allow)
   - **Download:** Export as PDF or DOCX
   - **Share:** Distribute to stakeholders
   - **Baseline Validation:** (if baseline exists) CR will be checked for drift

### Baseline Drift Detection

**Important:** If your project has an active baseline (CR-2026-001 Phase 1), uploaded CRs will automatically be validated for drift:

- **Scope Drift:** Changes to project scope
- **Cost Drift:** Budget modifications
- **Timeline Drift:** Schedule impacts
- **Technical Drift:** Technology changes
- **Resource Drift:** Team changes

Any detected drift will appear in the **Baseline** tab with:
- Drift type
- Severity (Low/Medium/High/Critical)
- Description
- Impact assessment

---

## Troubleshooting

### Template Not Showing in Dropdown

**Problem:** "Change Request (CR)" template not visible

**Solution:**
```bash
# Verify template exists
cd D:\source\repos\adpa
node scripts/create-change-request-template.js

# Restart frontend
cd D:\source\repos\adpa
npm run dev
```

### Upload Fails

**Problem:** Upload error or timeout

**Solutions:**
1. **File Size:** Ensure file < 10MB
2. **Format:** Use `.md` (Markdown) files
3. **Backend Running:** Check `http://localhost:5000/health`
4. **Permissions:** Ensure you have `documents.create` permission

### Template Selection Blank

**Problem:** Template dropdown is empty

**Solution:**
```bash
# Check backend logs
cd D:\source\repos\adpa\server
npm run dev

# Should see: "Templates loaded: X templates"
# If 0, run template creation script
```

---

## Verification Checklist

After uploading, verify:

- [ ] Document appears in Documents list
- [ ] Document name is correct
- [ ] Template shows as "Change Request (CR)"
- [ ] File can be opened/viewed
- [ ] Metadata is captured (date, creator, etc.)
- [ ] Baseline validation ran (if baseline exists)
- [ ] No errors in browser console

---

## Advanced: Bulk Upload Script

For uploading multiple CRs programmatically:

```javascript
// scripts/bulk-upload-crs.js
const fs = require('fs');
const path = require('path');
const apiClient = require('../lib/api').apiClient;

const CRs = [
  {
    file: 'docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md',
    name: 'CR-2026-001: Baseline Drift Detection System'
  },
  {
    file: 'docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md',
    name: 'CR-2026-004: ADPA Budget & Resources'
  }
];

async function bulkUploadCRs(projectId) {
  const templateId = 'a421afc9-81b8-45bf-9bf4-19fec3712f3a'; // Change Request template
  
  for (const cr of CRs) {
    console.log(`Uploading ${cr.name}...`);
    const content = fs.readFileSync(cr.file, 'utf8');
    
    await apiClient.createDocument({
      project_id: projectId,
      name: cr.name,
      content: content,
      template_id: templateId,
      status: 'approved'
    });
    
    console.log(`✅ ${cr.name} uploaded`);
  }
}

// Usage: node scripts/bulk-upload-crs.js <project-id>
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/bulk-upload-crs.js <project-id>');
  process.exit(1);
}

bulkUploadCRs(projectId).catch(console.error);
```

---

## Best Practices

### Naming Convention

Use consistent naming for CRs:
```
CR-YYYY-NNN: [Title]

Examples:
CR-2026-001: Baseline Drift Detection System
CR-2026-002: Feedback Intelligence System
CR-2026-004: ADPA Budget & Resources
```

### Status Tracking

After upload, update CR status in the document:
- **Draft** → **Submitted** → **Under Review** → **Approved/Rejected**

### Version Control

For CR revisions:
- Upload new version with version suffix: `CR-2026-001 v1.1`
- Or edit existing document with version history

### Linking

Reference related documents:
- Link to project charter
- Link to risk register
- Link to other related CRs
- Link to baseline (if applicable)

---

## FAQ

**Q: Can I upload CRs as PDF?**  
A: Yes, but Markdown (.md) is recommended for better integration with ADPA features like baseline drift detection and AI analysis.

**Q: Will uploaded CRs trigger baseline validation?**  
A: Yes, if your project has an active baseline (CR-2026-001 implemented), all uploaded documents are automatically validated.

**Q: Can I upload multiple CRs at once?**  
A: UI supports one-at-a-time upload. Use the bulk upload script (above) for multiple files.

**Q: What if my CR has attachments?**  
A: Upload the main CR document, then add attachments as separate documents or reference external links.

**Q: How do I update an uploaded CR?**  
A: Navigate to the document → Click "Edit" → Modify content → Save

---

## Support

**Issues with Upload:**
- Check frontend console (F12)
- Check backend logs (`server/logs/`)
- Verify template exists: `node scripts/create-change-request-template.js`

**Template Questions:**
- Template ID: `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- Template Name: "Change Request (CR)"
- Framework: PMBOK
- Category: Change Management

---

**Guide Version:** 1.0  
**Last Updated:** October 20, 2025  
**Maintained By:** Project Management Office

**Guide Version:** 1.0  
**Date:** October 20, 2025  
**Status:** ✅ Template Created & Ready

---

## Quick Start

✅ **Change Request Template Created!**
- **Template ID:** `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- **Name:** Change Request (CR)
- **Framework:** PMBOK
- **Category:** Change Management
- **Status:** Production (ready to use)

---

## Step-by-Step Upload Process

### 1. Navigate to Your Project

1. Go to http://localhost:3000 (or your ADPA URL)
2. Click on **Projects** in the sidebar
3. Select your project (e.g., "ADPA")

### 2. Open Document Upload

**Option A: From Project Detail Page**
1. On the project page, go to the **Documents** tab
2. Click the **"Upload Document"** button (top right)

**Option B: From Documents List**
1. Navigate to **Projects → [Your Project] → Documents**
2. Click **"Upload Document"** button

### 3. Upload Change Request

**Upload Dialog Fields:**

1. **Document Name:** 
   - Enter a clear name (e.g., "CR-2026-001 Baseline Drift Detection")
   
2. **Select File:**
   - Click "Choose File" or drag & drop
   - Select your CR markdown file (e.g., `CR-2026-001_Baseline_Drift_Detection.md`)
   
3. **Template Selection:**
   - **Important:** Select **"Change Request (CR)"** from the dropdown
   - This template has the PMBOK change management structure
   
4. Click **"Upload Document"**

---

## Change Requests to Upload

### CR-2026-001: Baseline Drift Detection System
- **File:** `docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md`
- **Status:** ✅ Approved & Authorized
- **Budget:** $400,000
- **Timeline:** 12 months

### CR-2026-002: Feedback Intelligence System
- **File:** `docs/roadmap/change-requests/CR-2026-002_Feedback_Intelligence.md`
- **Status:** ✅ Approved
- **Budget:** TBD
- **Timeline:** TBD

### CR-2026-003: Advanced Analytics Dashboard
- **File:** `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md` (extract CR-2026-003)
- **Status:** ✅ Deployed
- **Timeline:** Completed

### CR-2026-004: ADPA Budget & Resources
- **File:** `docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md`
- **Status:** ✅ Approved
- **Budget:** $320K-$400K
- **Timeline:** 6 months

### CR-2027-001: Background Document Generation
- **File:** Extract from `docs/roadmap/change-requests/CHANGE_REQUESTS_Q1_2025.md`
- **Status:** ✅ Approved for next sprint
- **Timeline:** TBD

---

## Template Structure

The Change Request (CR) template includes:

### Core Sections

1. **CR Identification**
   - CR ID, Project, Date, Priority, Type, Status
   
2. **Executive Summary**
   - 2-3 sentence overview
   
3. **Change Description**
   - Current state, Proposed change, Reason for change
   
4. **Business Justification**
   - Business value, Alignment with objectives, Alternatives
   
5. **Impact Analysis**
   - Scope, Schedule, Cost, Quality, Resources, Stakeholders
   
6. **Risk Assessment**
   - Risks of implementing
   - Risks of NOT implementing
   
7. **Dependencies & Constraints**
   
8. **Implementation Plan**
   - Approach, Timeline, Resources, Success criteria
   
9. **Approval Workflow**
   - Approval authority, Review & approval table, Conditions
   
10. **Baseline Updates**
    - Scope, Schedule, Cost, Quality, Communications
    
11. **Attachments & References**

---

## After Upload

### What Happens Next

1. **Document Saved:**
   - CR is stored in the database
   - Linked to your project
   - Assigned the "Change Request (CR)" template
   
2. **Metadata Captured:**
   - Upload date
   - File size
   - Creator
   - Template association
   
3. **Available Actions:**
   - **View:** Read the full CR
   - **Edit:** Modify content (if permissions allow)
   - **Download:** Export as PDF or DOCX
   - **Share:** Distribute to stakeholders
   - **Baseline Validation:** (if baseline exists) CR will be checked for drift

### Baseline Drift Detection

**Important:** If your project has an active baseline (CR-2026-001 Phase 1), uploaded CRs will automatically be validated for drift:

- **Scope Drift:** Changes to project scope
- **Cost Drift:** Budget modifications
- **Timeline Drift:** Schedule impacts
- **Technical Drift:** Technology changes
- **Resource Drift:** Team changes

Any detected drift will appear in the **Baseline** tab with:
- Drift type
- Severity (Low/Medium/High/Critical)
- Description
- Impact assessment

---

## Troubleshooting

### Template Not Showing in Dropdown

**Problem:** "Change Request (CR)" template not visible

**Solution:**
```bash
# Verify template exists
cd D:\source\repos\adpa
node scripts/create-change-request-template.js

# Restart frontend
cd D:\source\repos\adpa
npm run dev
```

### Upload Fails

**Problem:** Upload error or timeout

**Solutions:**
1. **File Size:** Ensure file < 10MB
2. **Format:** Use `.md` (Markdown) files
3. **Backend Running:** Check `http://localhost:5000/health`
4. **Permissions:** Ensure you have `documents.create` permission

### Template Selection Blank

**Problem:** Template dropdown is empty

**Solution:**
```bash
# Check backend logs
cd D:\source\repos\adpa\server
npm run dev

# Should see: "Templates loaded: X templates"
# If 0, run template creation script
```

---

## Verification Checklist

After uploading, verify:

- [ ] Document appears in Documents list
- [ ] Document name is correct
- [ ] Template shows as "Change Request (CR)"
- [ ] File can be opened/viewed
- [ ] Metadata is captured (date, creator, etc.)
- [ ] Baseline validation ran (if baseline exists)
- [ ] No errors in browser console

---

## Advanced: Bulk Upload Script

For uploading multiple CRs programmatically:

```javascript
// scripts/bulk-upload-crs.js
const fs = require('fs');
const path = require('path');
const apiClient = require('../lib/api').apiClient;

const CRs = [
  {
    file: 'docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md',
    name: 'CR-2026-001: Baseline Drift Detection System'
  },
  {
    file: 'docs/roadmap/change-requests/CR-2026-004_ADPA_BUDGET_RESOURCES.md',
    name: 'CR-2026-004: ADPA Budget & Resources'
  }
];

async function bulkUploadCRs(projectId) {
  const templateId = 'a421afc9-81b8-45bf-9bf4-19fec3712f3a'; // Change Request template
  
  for (const cr of CRs) {
    console.log(`Uploading ${cr.name}...`);
    const content = fs.readFileSync(cr.file, 'utf8');
    
    await apiClient.createDocument({
      project_id: projectId,
      name: cr.name,
      content: content,
      template_id: templateId,
      status: 'approved'
    });
    
    console.log(`✅ ${cr.name} uploaded`);
  }
}

// Usage: node scripts/bulk-upload-crs.js <project-id>
const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/bulk-upload-crs.js <project-id>');
  process.exit(1);
}

bulkUploadCRs(projectId).catch(console.error);
```

---

## Best Practices

### Naming Convention

Use consistent naming for CRs:
```
CR-YYYY-NNN: [Title]

Examples:
CR-2026-001: Baseline Drift Detection System
CR-2026-002: Feedback Intelligence System
CR-2026-004: ADPA Budget & Resources
```

### Status Tracking

After upload, update CR status in the document:
- **Draft** → **Submitted** → **Under Review** → **Approved/Rejected**

### Version Control

For CR revisions:
- Upload new version with version suffix: `CR-2026-001 v1.1`
- Or edit existing document with version history

### Linking

Reference related documents:
- Link to project charter
- Link to risk register
- Link to other related CRs
- Link to baseline (if applicable)

---

## FAQ

**Q: Can I upload CRs as PDF?**  
A: Yes, but Markdown (.md) is recommended for better integration with ADPA features like baseline drift detection and AI analysis.

**Q: Will uploaded CRs trigger baseline validation?**  
A: Yes, if your project has an active baseline (CR-2026-001 implemented), all uploaded documents are automatically validated.

**Q: Can I upload multiple CRs at once?**  
A: UI supports one-at-a-time upload. Use the bulk upload script (above) for multiple files.

**Q: What if my CR has attachments?**  
A: Upload the main CR document, then add attachments as separate documents or reference external links.

**Q: How do I update an uploaded CR?**  
A: Navigate to the document → Click "Edit" → Modify content → Save

---

## Support

**Issues with Upload:**
- Check frontend console (F12)
- Check backend logs (`server/logs/`)
- Verify template exists: `node scripts/create-change-request-template.js`

**Template Questions:**
- Template ID: `a421afc9-81b8-45bf-9bf4-19fec3712f3a`
- Template Name: "Change Request (CR)"
- Framework: PMBOK
- Category: Change Management

---

**Guide Version:** 1.0  
**Last Updated:** October 20, 2025  
**Maintained By:** Project Management Office

