# ADPA Framework - Getting Started Guide

**Guide Version:** 1.0  
**Date:** November 4, 2025  
**Status:** ✅ Complete  
**Audience:** New Users, Project Managers, Business Analysts

---

## Welcome to ADPA

Welcome to the **ADPA (Advanced Document Processing & Automation) Framework**! This guide will help you get started with the platform and become productive in minutes.

### What is ADPA?

ADPA is an enterprise-grade platform that combines AI-powered document generation with seamless project management. It helps you:

- 📝 **Generate professional documents** using AI (project charters, requirements, specifications)
- 📊 **Manage projects and programs** with portfolio visibility
- 🤖 **Leverage multiple AI providers** (OpenAI, Google AI, GitHub Copilot)
- 📈 **Track baselines and detect drift** automatically
- 🔗 **Integrate with enterprise tools** (Confluence, SharePoint, GitHub)
- 📉 **Analyze and optimize** document quality and project performance

---

## Quick Start (5 Minutes)

### Step 1: Log In

1. Navigate to your ADPA URL (e.g., `https://adpa.yourcompany.com`)
2. Click **"Sign In"**
3. Enter your credentials
   - Email: `your.email@company.com`
   - Password: Your provided password
4. Click **"Log In"**

**First Time?** Contact your administrator for account creation.

### Step 2: Explore the Dashboard

After logging in, you'll see the main dashboard with:

- **Projects Card**: Shows your projects and quick access
- **Recent Documents**: Your latest generated documents
- **Quick Actions**: Common tasks like "New Project" or "Generate Document"
- **Navigation Sidebar**: Access to all major features

### Step 3: Create Your First Project

1. Click **"Projects"** in the sidebar
2. Click **"+ New Project"** button (top right)
3. Fill in the project details:
   - **Project Name**: e.g., "Customer Portal Upgrade"
   - **Description**: Brief overview of the project
   - **Status**: Select "Planning" or "Active"
   - **Start Date**: Project start date
   - **Budget** (optional): Project budget amount
4. Click **"Create Project"**

✅ **Success!** Your project is now created.

### Step 4: Generate Your First Document

1. Navigate to your project page
2. Click the **"Documents"** tab
3. Click **"+ Generate Document"** button
4. Choose a template:
   - **Project Charter** - For project initiation
   - **Requirements Document** - For gathering requirements
   - **Risk Register** - For risk management
   - Or select from 100+ other templates
5. Fill in the context fields (project name, stakeholders, etc.)
6. Select your preferred **AI Provider** (OpenAI recommended)
7. Click **"Generate"**

⏱️ **Wait Time**: 30-60 seconds for AI generation

✅ **Done!** Your document is generated and ready to view, edit, or export.

---

## Core Concepts

### Projects

**Projects** are the primary organizational unit in ADPA. Each project contains:

- **Documents**: All generated and uploaded documents
- **Baselines**: Approved project snapshots for drift detection
- **Dashboard**: Project metrics and status
- **Settings**: Project configuration and permissions

**Best Practice**: Create one project per major initiative or deliverable.

### Programs

**Programs** are collections of related projects. Use programs to:

- Group related projects (e.g., "Digital Transformation Program")
- View portfolio-level metrics
- Manage cross-project dependencies
- Prioritize projects using the Prioritization Matrix

### Documents

**Documents** are the core output of ADPA. They can be:

- **AI-Generated**: Created from templates using AI
- **Uploaded**: Imported from your file system
- **Edited**: Modified using the built-in editor
- **Exported**: Downloaded as PDF, DOCX, or Markdown

**Storage Format**: All documents are stored as Markdown for maximum flexibility.

### Templates

**Templates** are reusable document structures that include:

- **PMBOK Templates**: Project management documents (charters, plans, registers)
- **BABOK Templates**: Business analysis documents (requirements, use cases)
- **DMBOK Templates**: Data management documents (data dictionaries, models)
- **Custom Templates**: Create your own templates

### AI Providers

ADPA supports multiple AI providers for document generation:

- **OpenAI (GPT-4)**: Best overall quality and versatility
- **Google AI (Gemini)**: Great for technical documents
- **GitHub Copilot**: Good for code-related documentation
- **Ollama**: Local AI for privacy-sensitive content

**Switching Providers**: You can switch providers for any generation task.

---

## Common Tasks

### Creating a New Project

**Navigation**: Sidebar → Projects → + New Project

**Required Fields**:
- Project Name
- Description
- Status

**Optional Fields**:
- Budget
- Start Date / End Date
- Priority
- Category

**After Creation**: You can add documents, baselines, and team members.

### Generating a Document

**Navigation**: Project Page → Documents Tab → + Generate Document

**Steps**:
1. Select a template from the catalog
2. Fill in the context variables (project-specific information)
3. Choose an AI provider
4. Click "Generate"
5. Wait for completion (30-60 seconds)
6. Review and edit the generated document
7. Export or share as needed

**Tip**: Save time by pre-filling common context in project settings.

### Uploading an Existing Document

**Navigation**: Project Page → Documents Tab → Upload Document

**Steps**:
1. Click "Upload Document"
2. Enter a document name
3. Select a file (Markdown, PDF, DOCX supported)
4. Choose a template (optional, for structure)
5. Click "Upload"

**Best Practice**: Use Markdown (.md) files for best integration with ADPA features.

### Exporting a Document

**Navigation**: Document View Page → Export Button

**Available Formats**:
- **PDF**: Professional, print-ready format
- **DOCX**: Microsoft Word format for editing
- **Markdown**: Raw source format
- **HTML**: Web-ready format

**Tip**: Use PDF for final deliverables and DOCX for collaborative editing.

### Setting a Baseline

**What is a Baseline?**  
A baseline is an approved snapshot of your project's scope, schedule, and cost. Use baselines to track changes and detect drift.

**Steps**:
1. Navigate to Project Page → Baselines Tab
2. Click "+ Create Baseline"
3. Enter baseline details:
   - Name: e.g., "Phase 1 Baseline"
   - Description: What this baseline represents
   - Type: Scope, Schedule, Cost, or Quality
4. Select documents to include
5. Click "Create Baseline"
6. Submit for approval (if workflow enabled)

**After Approval**: All document changes will be tracked against this baseline.

### Viewing Baseline Drift

**Navigation**: Project Page → Baselines Tab

**Drift Indicators**:
- 🟢 **Low**: Minor changes, within tolerance
- 🟠 **Medium**: Moderate changes, review recommended
- 🔴 **High**: Significant changes, action required
- ⚫ **Critical**: Major deviation, immediate attention

**Drift Types**:
- **Scope Drift**: Changes to project scope
- **Cost Drift**: Budget modifications
- **Timeline Drift**: Schedule impacts
- **Technical Drift**: Technology changes

### Managing AI Providers

**Navigation**: Sidebar → AI Providers

**Viewing Providers**:
- See all configured AI providers
- View health status (🟢 Healthy, 🔴 Down)
- Check usage statistics
- Monitor costs

**Adding a Provider** (Admin only):
1. Click "+ Add Provider"
2. Select provider type (OpenAI, Google AI, etc.)
3. Enter API credentials
4. Configure settings (model, temperature, max tokens)
5. Test connection
6. Save

### Integrating with External Tools

**Navigation**: Sidebar → Integrations

**Available Integrations**:

**Confluence**:
- Sync documents to Confluence pages
- Maintain metadata consistency
- Two-way updates (coming soon)

**SharePoint**:
- Upload documents to SharePoint libraries
- Sync document metadata
- Maintain folder structure

**GitHub**:
- Create repositories for projects
- Track issues and pull requests
- Link code commits to documents

**Setup Steps**:
1. Navigate to Integrations
2. Click on desired integration
3. Click "Connect" or "Authorize"
4. Follow OAuth flow
5. Grant required permissions
6. Test connection
7. Configure sync settings

---

## Navigation Guide

### Sidebar Menu

**Main Sections**:

- **🏠 Dashboard**: Overview and quick access
- **📁 Projects**: All your projects
- **📊 Programs**: Portfolio management
- **📄 Documents**: All documents across projects
- **🔍 Search**: Find anything quickly
- **🤖 AI Providers**: Manage AI services
- **🔗 Integrations**: External tool connections
- **📈 Analytics**: Usage metrics and insights
- **⚙️ Settings**: User preferences
- **👥 Users** (Admin): User management
- **🔒 Security** (Admin): Security dashboard

### Quick Actions Bar

Located at the top of most pages:

- **+ New Project**: Create a project
- **+ Generate Document**: Quick document generation
- **🔍 Search**: Quick search
- **🔔 Notifications**: Recent alerts
- **👤 Profile**: Your account settings

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Quick search
- **Ctrl/Cmd + N**: New project
- **Ctrl/Cmd + D**: Generate document
- **Ctrl/Cmd + S**: Save (when editing)
- **Ctrl/Cmd + /**: Show keyboard shortcuts

---

## Best Practices

### Project Organization

✅ **Do**:
- Use clear, descriptive project names
- Add detailed descriptions
- Set realistic budgets and timelines
- Categorize projects appropriately
- Keep project status up to date

❌ **Don't**:
- Create duplicate projects
- Use vague names like "Test" or "Project 1"
- Leave required fields blank
- Mix unrelated work in one project

### Document Management

✅ **Do**:
- Use templates whenever possible
- Provide detailed context for AI generation
- Review and edit AI-generated content
- Use Markdown format for source documents
- Export to PDF for final deliverables
- Version your documents

❌ **Don't**:
- Generate without reviewing
- Skip context fields
- Store only PDF versions
- Mix multiple document types in one file

### AI Provider Usage

✅ **Do**:
- Choose the right provider for the task
  - OpenAI: General purpose, high quality
  - Google AI: Technical content
  - GitHub Copilot: Code documentation
- Provide rich context for better results
- Review and improve AI outputs
- Report poor generations to improve templates

❌ **Don't**:
- Use the same provider for everything
- Provide minimal context
- Accept AI output without review
- Share sensitive data with external AIs (use Ollama instead)

### Baseline Management

✅ **Do**:
- Create baselines at major milestones
- Include comprehensive documentation
- Get proper approvals
- Monitor drift regularly
- Update baselines when authorized changes occur

❌ **Don't**:
- Create baselines too frequently
- Skip approval workflows
- Ignore drift warnings
- Update baselines without authorization

---

## Troubleshooting

### Can't Log In

**Issue**: Login fails with "Invalid credentials"

**Solutions**:
1. Verify email and password are correct
2. Check for typos (email is case-sensitive)
3. Try "Forgot Password" link
4. Contact your administrator if account is locked
5. Clear browser cache and cookies

### Document Generation Fails

**Issue**: Document generation times out or errors

**Solutions**:
1. Check that AI provider is healthy (AI Providers page)
2. Verify you provided all required context fields
3. Try a different AI provider
4. Reduce document complexity
5. Check backend logs (admin only)
6. Contact support if issue persists

### Upload Fails

**Issue**: Document upload times out or fails

**Solutions**:
1. Ensure file size is under 10MB
2. Use supported formats (Markdown, PDF, DOCX)
3. Check internet connection
4. Verify you have upload permissions
5. Try a different browser
6. Check backend is running (admin only)

### Integration Not Working

**Issue**: Confluence/SharePoint/GitHub integration fails

**Solutions**:
1. Re-authorize the integration
2. Check credentials haven't expired
3. Verify permissions on external system
4. Test connection in Integrations page
5. Review integration logs
6. Contact administrator

### Slow Performance

**Issue**: ADPA is slow or unresponsive

**Solutions**:
1. Clear browser cache
2. Close unnecessary tabs
3. Check internet connection speed
4. Try a different browser
5. Report to administrator if system-wide

---

## Getting Help

### Documentation

- **User Guides**: `/docs/11-user-guides/` - Step-by-step guides
- **Feature Docs**: `/docs/06-features/` - Detailed feature documentation
- **API Docs**: `/docs/05-integrations/` - Integration guides
- **Troubleshooting**: `/docs/10-troubleshooting/` - Common issues and solutions

### Support Channels

- **Email Support**: support@adpa-framework.com
- **Help Desk**: https://support.adpa-framework.com
- **Knowledge Base**: https://kb.adpa-framework.com
- **Community Forum**: https://community.adpa-framework.com

### Training Resources

- **Video Tutorials**: https://training.adpa-framework.com/videos
- **Live Webinars**: Monthly training sessions
- **Documentation**: This guide and related docs
- **Admin Training**: Separate guide for administrators

---

## Next Steps

### Beginner Track (Week 1)

1. ✅ Complete this Getting Started guide
2. 📝 Create your first project
3. 🤖 Generate your first document
4. 📤 Export a document to PDF
5. 📊 Explore the project dashboard

### Intermediate Track (Week 2-3)

1. 📋 Create a baseline for your project
2. 🔗 Set up one integration (Confluence, SharePoint, or GitHub)
3. 📈 Review analytics for your documents
4. 👥 Add team members to your project
5. 📊 Create a program and add multiple projects

### Advanced Track (Month 2+)

1. 🎨 Create custom templates
2. 🔄 Set up approval workflows
3. 📊 Use the Portfolio Prioritization Matrix
4. 🤖 Configure multiple AI providers
5. 🔍 Master advanced search and filtering
6. 📈 Create executive dashboards

### Administrator Track

See the separate **ADPA Administrator Guide** for:
- User management
- System configuration
- Security settings
- Integration setup
- Monitoring and troubleshooting

---

## Additional Training Materials

### Available Guides

1. **Portfolio Prioritization Matrix Guide** - Prioritize projects using weighted scoring
2. **AI Document Generation Guide** - Master AI-powered document creation
3. **Baseline Management Guide** - Track and manage project baselines
4. **Integration Setup Guide** - Connect external tools
5. **Administrator Guide** - System configuration and management

### Video Tutorials (Coming Soon)

- Getting Started (5 minutes)
- Creating Your First Document (8 minutes)
- Setting Up Baselines (12 minutes)
- Portfolio Prioritization (15 minutes)
- Advanced Features Overview (20 minutes)

---

## Feedback

We value your feedback! Help us improve ADPA:

- **Feature Requests**: Submit via Help → Feature Request
- **Bug Reports**: Submit via Help → Report Bug
- **Documentation Feedback**: Email docs@adpa-framework.com
- **General Feedback**: Use in-app feedback form

---

**Guide Version:** 1.0  
**Last Updated:** November 4, 2025  
**Maintained By:** ADPA Documentation Team  
**Next Review:** December 4, 2025

---

## Quick Reference Card

### Essential URLs
- Dashboard: `/`
- Projects: `/projects`
- Programs: `/programs`
- Documents: `/documents`
- AI Providers: `/ai-providers`
- Integrations: `/integrations`

### Key Actions
- New Project: Projects → + New Project
- Generate Doc: Project → Documents → + Generate
- Upload Doc: Project → Documents → Upload
- Create Baseline: Project → Baselines → + Create
- View Analytics: Project → Dashboard → Analytics

### Support
- Email: support@adpa-framework.com
- Docs: `/docs`
- Help: Press `F1` in-app

---

**Welcome to ADPA! Start building better documents today.** 🚀
