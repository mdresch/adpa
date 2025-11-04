# ADPA Quick Reference Guide

**Guide Version:** 1.0  
**Date:** November 4, 2025  
**Format:** Quick Reference / Cheat Sheet

---

## Common Tasks - Quick Steps

### 🚀 Create a New Project

1. Sidebar → **Projects**
2. Click **+ New Project**
3. Fill: Name, Description, Status
4. Click **Create**

**Shortcut**: `Ctrl/Cmd + N`

---

### 📄 Generate a Document

1. Go to **Project** → **Documents** tab
2. Click **+ Generate Document**
3. Select **Template**
4. Fill **Context** fields
5. Choose **AI Provider**
6. Click **Generate**

**Time**: 30-60 seconds  
**Shortcut**: `Ctrl/Cmd + D`

---

### 📤 Upload a Document

1. Project → Documents → **Upload**
2. Enter **Document Name**
3. **Select File** (.md, .pdf, .docx)
4. Choose **Template** (optional)
5. Click **Upload**

**Max Size**: 10MB

---

### 💾 Export a Document

1. Open **Document**
2. Click **Export** button
3. Choose format:
   - **PDF** (print-ready)
   - **DOCX** (editable)
   - **Markdown** (source)
4. Download

---

### 📊 Create a Baseline

1. Project → **Baselines** tab
2. Click **+ Create Baseline**
3. Enter: Name, Description, Type
4. Select **Documents** to include
5. Click **Create**
6. **Submit for Approval**

---

### 🎯 Prioritize Projects

1. Programs → Select **Program**
2. Click **Prioritize** tab
3. Click **Score** next to project
4. Rate on 5 criteria (1-5)
5. Add **Justifications**
6. Click **Submit Score**
7. Repeat for all projects
8. View **Rankings Table**

---

### 🔗 Connect an Integration

1. Sidebar → **Integrations**
2. Select integration (Confluence/SharePoint/GitHub)
3. Click **Connect**
4. Follow **OAuth** flow
5. Grant **Permissions**
6. Click **Authorize**
7. **Test Connection**

---

### 🤖 Add AI Provider (Admin)

1. Sidebar → **AI Providers**
2. Click **+ Add Provider**
3. Select **Provider Type**
4. Enter **API Key**
5. Configure **Settings**
6. Click **Test Connection**
7. Click **Save**

---

## Navigation Quick Keys

### Sidebar Sections

- **🏠 Dashboard**: Overview
- **📁 Projects**: All projects
- **📊 Programs**: Portfolio view
- **📄 Documents**: All documents
- **🔍 Search**: Find anything
- **🤖 AI Providers**: AI management
- **🔗 Integrations**: External tools
- **📈 Analytics**: Metrics
- **⚙️ Settings**: Preferences
- **👥 Users**: User management (admin)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick Search |
| `Ctrl/Cmd + N` | New Project |
| `Ctrl/Cmd + D` | Generate Document |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + /` | Show Shortcuts |
| `F1` | Help |
| `Esc` | Close Dialog |

---

## AI Provider Selection Guide

| Provider | Best For | Speed | Cost | Quality |
|----------|----------|-------|------|---------|
| **OpenAI (GPT-4)** | General purpose, high quality | Medium | $$$ | ⭐⭐⭐⭐⭐ |
| **Google AI (Gemini)** | Technical docs, code | Fast | $$ | ⭐⭐⭐⭐ |
| **GitHub Copilot** | Code documentation | Fast | $ | ⭐⭐⭐ |
| **Ollama** | Privacy-sensitive content | Slow | Free | ⭐⭐⭐ |

**Recommendation**: Use **OpenAI** for most documents, **Google AI** for technical content, **Ollama** for sensitive data.

---

## Document Template Quick Guide

### PMBOK Templates

- **Project Charter**: Project initiation document
- **Project Management Plan**: Comprehensive project plan
- **Scope Statement**: Detailed scope definition
- **WBS**: Work Breakdown Structure
- **Risk Register**: Risk identification and tracking
- **Change Request**: Change management
- **Lessons Learned**: Post-project review

### BABOK Templates

- **Business Requirements**: High-level requirements
- **Functional Requirements**: Detailed functional specs
- **Use Case**: User interaction scenarios
- **User Story**: Agile user stories
- **Process Flow**: Business process diagrams

### DMBOK Templates

- **Data Dictionary**: Data definitions
- **Data Model**: Entity-relationship diagrams
- **Data Quality Plan**: Data quality management
- **Data Governance**: Data governance framework

---

## Priority Scoring Quick Reference

### Default Criteria (5-Criteria Model)

| Criterion | Weight | What It Measures |
|-----------|--------|------------------|
| **Strategic Alignment** | 30% | Fit with corporate strategy |
| **Value Contribution** | 25% | ROI, benefits, business value |
| **Risk Level** | 15% | Project risk (inverted) |
| **Resource Availability** | 20% | Staff and funding availability |
| **Urgency** | 10% | Time sensitivity |

### Scoring Scale

- **5**: Excellent / Critical / Very High
- **4**: Good / High
- **3**: Moderate / Medium
- **2**: Fair / Low
- **1**: Poor / Very Low

### Priority Tiers

- 🔴 **Critical** (4.0+): Must do, highest priority
- 🟠 **High** (3.0-3.9): Should do, important
- 🟡 **Medium** (2.0-2.9): Could do, moderate
- ⚪ **Low** (<2.0): Nice to have, defer

---

## Baseline Management Quick Tips

### Baseline Types

- **Scope Baseline**: What we're building
- **Schedule Baseline**: When we're delivering
- **Cost Baseline**: How much we're spending
- **Quality Baseline**: Standards and criteria

### Drift Indicators

- 🟢 **Low**: Within tolerance, no action
- 🟠 **Medium**: Review recommended
- 🔴 **High**: Action required
- ⚫ **Critical**: Immediate attention

### When to Create a Baseline

✅ After project approval  
✅ At phase gates  
✅ Before major changes  
✅ Quarterly for long projects

---

## Troubleshooting - Quick Fixes

### Login Issues

1. Verify email/password
2. Try "Forgot Password"
3. Clear browser cache
4. Contact administrator

### Document Generation Fails

1. Check AI provider health
2. Fill all required fields
3. Try different AI provider
4. Check backend status

### Upload Fails

1. Check file size (<10MB)
2. Use supported formats
3. Check permissions
4. Try different browser

### Slow Performance

1. Clear browser cache
2. Close extra tabs
3. Check internet speed
4. Try different browser

---

## File Format Guide

### Supported Upload Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| Markdown | `.md` | Best integration, recommended |
| PDF | `.pdf` | Final deliverables |
| Word | `.docx` | Collaborative editing |
| Text | `.txt` | Plain text |

### Export Formats

| Format | Use Case |
|--------|----------|
| **PDF** | Final deliverables, printing |
| **DOCX** | Editing in Microsoft Word |
| **Markdown** | Source format, version control |
| **HTML** | Web publishing |

---

## Status Indicators

### Project Status

- 🟢 **Active**: In progress
- 🟡 **Planning**: Not started
- 🔵 **On Hold**: Paused
- ⚫ **Completed**: Finished
- 🔴 **Cancelled**: Terminated

### Document Status

- ✅ **Final**: Approved, locked
- 📝 **Draft**: Work in progress
- 🔄 **Under Review**: Pending approval
- ❌ **Rejected**: Not approved
- 🗑️ **Archived**: Historical

### AI Provider Health

- 🟢 **Healthy**: Operating normally
- 🟡 **Degraded**: Slower than usual
- 🔴 **Down**: Not available
- ⚪ **Unknown**: Status not checked

---

## User Permissions Quick Reference

### Standard Roles

| Role | Can Do |
|------|--------|
| **Admin** | Everything (full access) |
| **Manager** | Create projects, manage teams, approve baselines |
| **User** | Create documents, view projects |
| **Viewer** | Read-only access |

### Permission Examples

| Action | Admin | Manager | User | Viewer |
|--------|-------|---------|------|--------|
| Create Project | ✅ | ✅ | ❌ | ❌ |
| Generate Document | ✅ | ✅ | ✅ | ❌ |
| View Document | ✅ | ✅ | ✅ | ✅ |
| Approve Baseline | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Configure AI | ✅ | ❌ | ❌ | ❌ |

---

## Integration Quick Setup

### Confluence

1. Integrations → **Confluence** → **Connect**
2. Login to **Atlassian**
3. Grant **Permissions** (read, write)
4. Select **Space**
5. **Test** connection

### SharePoint

1. Integrations → **SharePoint** → **Connect**
2. Login to **Microsoft**
3. Grant **Permissions** (Files.ReadWrite)
4. Select **Site**
5. **Test** connection

### GitHub

1. Integrations → **GitHub** → **Connect**
2. Login to **GitHub**
3. Grant **Permissions** (repo, issues)
4. Select **Repositories**
5. **Test** connection

---

## Analytics Quick Metrics

### Project Dashboard

- **Total Documents**: Count of all documents
- **AI Usage**: Number of AI generations
- **Baseline Status**: Current drift level
- **Recent Activity**: Last 30 days

### Program Dashboard

- **Project Count**: Number of projects
- **Budget Utilization**: Spend vs budget
- **Priority Distribution**: Projects by tier
- **Health Score**: Overall program health

---

## Best Practices - Quick Checklist

### Before Starting

- [ ] Understand the feature
- [ ] Read documentation
- [ ] Check permissions
- [ ] Gather required information

### During Work

- [ ] Fill all required fields
- [ ] Review AI output carefully
- [ ] Add meaningful descriptions
- [ ] Save progress frequently

### After Completion

- [ ] Verify results
- [ ] Export if needed
- [ ] Notify stakeholders
- [ ] Document decisions

---

## Support - Quick Contact

### Get Help

- **Documentation**: `/docs`
- **Email**: support@adpa-framework.com
- **Help Desk**: https://support.adpa-framework.com
- **In-App Help**: Press `F1`

### Report Issues

- **Bug Reports**: Help → Report Bug
- **Feature Requests**: Help → Feature Request
- **General Feedback**: Feedback button (bottom right)

---

## URLs Quick Reference

### Main Pages

```
Dashboard:         /
Projects:          /projects
Programs:          /programs
Documents:         /documents
AI Providers:      /ai-providers
Integrations:      /integrations
Analytics:         /analytics
Settings:          /settings
```

### API Endpoints (Developers)

```
Health Check:      GET  /api/health
Projects:          GET  /api/projects
Generate Document: POST /api/documents/generate
Upload Document:   POST /api/documents/upload
```

---

## Quick Start Workflows

### New User (Day 1)

1. ✅ Log in
2. ✅ Explore dashboard
3. ✅ Create first project
4. ✅ Generate first document
5. ✅ Export to PDF

**Time**: 15 minutes

### Project Setup (Day 1)

1. ✅ Create project
2. ✅ Add team members
3. ✅ Generate project charter
4. ✅ Create initial baseline
5. ✅ Set up integration (optional)

**Time**: 30 minutes

### Portfolio Management (Week 1)

1. ✅ Create program
2. ✅ Add projects to program
3. ✅ Score projects (prioritization)
4. ✅ Review rankings
5. ✅ Export results

**Time**: 2 hours

---

## Version Information

**Guide Version**: 1.0  
**ADPA Version**: 2.0.0  
**Last Updated**: November 4, 2025  
**Format**: Quick Reference

---

**💡 Tip**: Print this guide and keep it handy for quick reference!

**📚 More Details**: See the full **Getting Started Guide** for comprehensive instructions.

---

**Quick Reference Guide | ADPA Framework | © 2025**
