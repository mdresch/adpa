# ADPA Administrator Guide

**Guide Version:** 1.0  
**Date:** November 4, 2025  
**Status:** ✅ Complete  
**Audience:** System Administrators, IT Staff, Platform Owners

---

## Overview

This guide provides comprehensive information for ADPA administrators responsible for system configuration, user management, security, and maintenance.

### Administrator Responsibilities

- 👥 **User Management**: Create accounts, assign roles, manage permissions
- ⚙️ **System Configuration**: Configure AI providers, integrations, settings
- 🔒 **Security**: Monitor security events, manage access control
- 📊 **Monitoring**: Track system health, performance, usage
- 🔧 **Maintenance**: Updates, backups, troubleshooting
- 📚 **Training**: Support users, create documentation

---

## Getting Started as an Administrator

### Initial Setup Checklist

- [ ] Access admin account
- [ ] Review system configuration
- [ ] Configure AI providers
- [ ] Set up integrations (Confluence, SharePoint, GitHub)
- [ ] Create user accounts
- [ ] Configure role-based permissions
- [ ] Set up audit logging
- [ ] Configure security settings
- [ ] Create organizational templates
- [ ] Set up backup procedures

### Administrator Access

**URL**: Your ADPA instance + `/admin` (or navigate via sidebar)

**Requirements**:
- Admin role assigned to your account
- Full system permissions
- Understanding of organizational policies

---

## User Management

### Creating User Accounts

**Navigation**: Sidebar → Users → + Add User

**Steps**:
1. Click **"+ Add User"**
2. Fill in user details:
   - **Email**: User's email address (used for login)
   - **Name**: Full name
   - **Role**: Select appropriate role
   - **Department** (optional): User's department
   - **Manager** (optional): Direct manager
3. Click **"Create User"**
4. User receives welcome email with temporary password

**Note**: Users must change password on first login for security.

### User Roles and Permissions

ADPA uses **Role-Based Access Control (RBAC)** with four primary roles:

#### 1. Admin

**Full System Access**

Permissions:
- ✅ All user permissions
- ✅ Create/edit/delete users
- ✅ Configure system settings
- ✅ Manage AI providers
- ✅ Set up integrations
- ✅ View all projects and documents
- ✅ Access audit logs
- ✅ Modify security settings
- ✅ Create global templates

**Use Case**: IT administrators, platform owners

#### 2. Manager

**Team and Project Management**

Permissions:
- ✅ Create/edit projects
- ✅ Manage team members
- ✅ Approve baselines
- ✅ View analytics
- ✅ Generate documents
- ✅ Configure project settings
- ❌ System configuration
- ❌ User administration (can't create/delete users)

**Use Case**: Project managers, program managers, PMO staff

#### 3. User

**Document Creation and Basic Access**

Permissions:
- ✅ View assigned projects
- ✅ Generate documents
- ✅ Edit own documents
- ✅ Upload documents
- ✅ Export documents
- ❌ Create projects
- ❌ Manage users
- ❌ Approve baselines
- ❌ System configuration

**Use Case**: Business analysts, content creators, team members

#### 4. Viewer

**Read-Only Access**

Permissions:
- ✅ View assigned projects
- ✅ View documents
- ✅ Export documents (read-only)
- ❌ Create/edit anything
- ❌ Generate documents
- ❌ Upload documents

**Use Case**: Stakeholders, executives, external reviewers

### Custom Permissions

For granular control, you can assign custom permissions:

**Available Permissions**:
- `projects.create`
- `projects.edit`
- `projects.delete`
- `documents.create`
- `documents.edit`
- `documents.delete`
- `baselines.create`
- `baselines.approve`
- `analytics.view`
- `users.manage`
- `system.configure`

**How to Assign**:
1. Navigate to **Users** → Select user
2. Click **"Manage Permissions"**
3. Check/uncheck specific permissions
4. Click **"Save"**

### Managing Existing Users

#### Editing User Details

1. Sidebar → **Users**
2. Find user in list
3. Click **"Edit"** button
4. Modify fields
5. Click **"Save"**

#### Changing User Role

1. Select user
2. Click **"Change Role"**
3. Select new role
4. Confirm change
5. User is notified of role change

#### Deactivating Users

**When to Deactivate**:
- User leaves organization
- User no longer needs access
- Security concerns

**Steps**:
1. Find user
2. Click **"Deactivate"**
3. Confirm action
4. User can no longer log in
5. User's documents are preserved

**Note**: Don't delete users; deactivate them to preserve audit trail.

#### Reactivating Users

1. Filter to show "Inactive" users
2. Select user
3. Click **"Reactivate"**
4. User can log in again

#### Resetting Passwords

1. Select user
2. Click **"Reset Password"**
3. Choose method:
   - **Email Link**: Send reset link to user's email
   - **Temporary Password**: Generate and provide to user
4. Confirm

---

## AI Provider Configuration

### Overview

ADPA supports multiple AI providers for document generation. As an administrator, you configure and manage these providers.

### Supported Providers

1. **OpenAI (GPT-4, GPT-3.5)**: Best overall quality
2. **Google AI (Gemini Pro, Gemini Ultra)**: Technical content
3. **Azure OpenAI**: Enterprise OpenAI with Microsoft Azure
4. **Anthropic Claude**: Advanced reasoning
5. **Mistral AI**: European provider
6. **GitHub Copilot**: Code-focused
7. **Ollama**: Local/self-hosted models

### Adding an AI Provider

**Navigation**: Sidebar → AI Providers → + Add Provider

**Example: Adding OpenAI**

1. Click **"+ Add Provider"**
2. Select **"OpenAI"** from dropdown
3. Fill in configuration:
   - **Name**: "OpenAI Production"
   - **API Key**: Your OpenAI API key (starts with `sk-`)
   - **Organization ID** (optional): OpenAI org ID
   - **Default Model**: `gpt-4` or `gpt-3.5-turbo`
   - **Temperature**: `0.7` (default, 0-1 scale)
   - **Max Tokens**: `4096` (response length limit)
4. Click **"Test Connection"**
   - Should show ✅ "Connection successful"
5. Click **"Save"**

**Provider is now available** to all users for document generation.

### Configuring Provider Settings

**Available Settings**:

**Temperature** (0.0 - 1.0):
- **0.0**: Deterministic, consistent outputs
- **0.3**: Slightly varied, focused
- **0.7**: Balanced (recommended)
- **1.0**: Creative, varied outputs

**Max Tokens**:
- Limits response length
- **Typical values**: 2048, 4096, 8192
- **Cost impact**: More tokens = higher cost

**Model Selection**:
- **GPT-4**: Highest quality, slower, expensive
- **GPT-3.5-turbo**: Fast, good quality, cheaper
- **GPT-4-32k**: Extended context for long documents

### Monitoring Provider Health

**Navigation**: AI Providers page

**Health Indicators**:
- 🟢 **Healthy**: Operational, fast response
- 🟡 **Degraded**: Slower than usual
- 🔴 **Down**: Not responding
- ⚪ **Unknown**: Not tested recently

**Auto-Health Checks**: ADPA pings providers every 5 minutes

**Manual Test**:
1. Navigate to provider
2. Click **"Test Now"**
3. View result

### Provider Usage and Cost Tracking

**View Usage**:
1. AI Providers → Select provider
2. Click **"Usage"** tab

**Metrics Shown**:
- **Total Requests**: Number of generation requests
- **Total Tokens**: Total tokens consumed
- **Estimated Cost**: Calculated cost
- **Average Response Time**: Performance metric
- **Error Rate**: Failed request percentage

**Export Reports**:
- Click **"Export Usage Report"**
- Choose date range
- Export as Excel or PDF

### Setting Usage Limits

**Prevent Cost Overruns**:

1. Navigate to provider
2. Click **"Usage Limits"**
3. Set limits:
   - **Daily Limit**: Max requests per day
   - **Monthly Budget**: Max spend per month
   - **Per-User Limit**: Max requests per user
4. Configure alerts:
   - Email when 80% of limit reached
   - Disable provider at 100% of limit
5. Save

### Provider Failover Configuration

**Automatic Failover**: If primary provider fails, use backup

**Setup**:
1. Navigate to **System Settings** → **AI Providers**
2. Enable **"Auto-Failover"**
3. Set priority order:
   - **1st Priority**: OpenAI
   - **2nd Priority**: Google AI
   - **3rd Priority**: Azure OpenAI
4. Configure failover rules:
   - Timeout: 30 seconds
   - Retry: 3 attempts
   - Circuit breaker: 5 consecutive failures
5. Save

---

## Integration Management

### Confluence Integration

**Purpose**: Sync documents to Atlassian Confluence

**Setup Steps**:

1. **Create Atlassian App**:
   - Go to https://developer.atlassian.com/console
   - Create new app
   - Add OAuth 2.0 credentials
   - Set redirect URL: `https://your-adpa.com/api/confluence/callback`
   - Note Client ID and Client Secret

2. **Configure in ADPA**:
   - Sidebar → Integrations → **Confluence**
   - Click **"Configure"**
   - Enter:
     - **Client ID**: From step 1
     - **Client Secret**: From step 1
     - **Scopes**: `read:confluence-content.all write:confluence-content`
   - Click **"Save"**

3. **Authorize**:
   - Click **"Connect"**
   - Log in to Atlassian
   - Grant permissions
   - Select Confluence space
   - Click **"Authorize"**

4. **Test**:
   - Click **"Test Connection"**
   - Should show ✅ "Connected to Confluence"

**User Configuration**: Users can now sync documents to their selected Confluence spaces.

### SharePoint Integration

**Purpose**: Upload documents to Microsoft SharePoint

**Setup Steps**:

1. **Register Azure AD App**:
   - Go to https://portal.azure.com → Azure Active Directory
   - App registrations → New registration
   - Name: "ADPA Integration"
   - Redirect URI: `https://your-adpa.com/api/sharepoint/callback`
   - Note Application (client) ID and Directory (tenant) ID

2. **Create Client Secret**:
   - Certificates & secrets → New client secret
   - Description: "ADPA Secret"
   - Expires: 24 months
   - Note the secret value

3. **Grant API Permissions**:
   - API permissions → Add permission → Microsoft Graph
   - Delegated permissions:
     - `Files.ReadWrite.All`
     - `Sites.ReadWrite.All`
     - `User.Read`
   - Grant admin consent

4. **Configure in ADPA**:
   - Sidebar → Integrations → **SharePoint**
   - Click **"Configure"**
   - Enter:
     - **Client ID**: Application ID from step 1
     - **Client Secret**: Secret from step 2
     - **Tenant ID**: Directory ID from step 1
   - Click **"Save"**

5. **Authorize and Test**: Same as Confluence

### GitHub Integration

**Purpose**: Link documents to GitHub repositories and issues

**Setup Steps**:

1. **Create GitHub App** (or use Personal Access Token):
   - GitHub → Settings → Developer settings → GitHub Apps
   - New GitHub App
   - Name: "ADPA Integration"
   - Webhook URL: `https://your-adpa.com/api/github/webhook`
   - Permissions:
     - Repository: Read & write
     - Issues: Read & write
     - Pull requests: Read only
   - Install app on organization/repositories

2. **Configure in ADPA**:
   - Sidebar → Integrations → **GitHub**
   - Click **"Configure"**
   - Enter:
     - **App ID**: GitHub App ID
     - **Private Key**: Downloaded private key
     - **Installation ID**: From GitHub App installation
   - Or use **Personal Access Token** for simpler setup
   - Click **"Save"**

3. **Test**: Connect to a test repository

---

## System Configuration

### General Settings

**Navigation**: Sidebar → Settings → System

**Configurable Options**:

**Application Settings**:
- **Site Name**: Display name (e.g., "ADPA - Acme Corp")
- **Site URL**: Base URL
- **Logo**: Upload custom logo (PNG, max 500KB)
- **Favicon**: Upload favicon (ICO, 32x32)
- **Theme**: Light or Dark mode (user preference)

**Security Settings**:
- **Password Policy**:
  - Minimum length: 8-16 characters
  - Require uppercase, lowercase, numbers, symbols
  - Password expiry: 90 days (optional)
  - Prevent reuse: Last 5 passwords
- **Session Timeout**: 30 minutes - 8 hours
- **Multi-Factor Authentication (MFA)**: Enable/disable
- **IP Whitelist**: Restrict access to specific IPs (optional)

**Email Settings**:
- **SMTP Server**: smtp.yourcompany.com
- **Port**: 587 (TLS) or 465 (SSL)
- **Username**: SMTP username
- **Password**: SMTP password
- **From Email**: noreply@adpa.yourcompany.com
- **From Name**: "ADPA Notifications"

**Document Settings**:
- **Default Storage Format**: Markdown (recommended)
- **Max Upload Size**: 10MB (default, can increase to 100MB)
- **Auto-Save Interval**: 30 seconds
- **Version History**: Keep last 10 versions

**AI Settings**:
- **Default Provider**: OpenAI
- **Fallback Enabled**: Yes/No
- **Max Retries**: 3
- **Timeout**: 60 seconds

### Template Management

**Navigation**: Settings → Templates

**Creating Global Templates**:

1. Click **"+ New Template"**
2. Fill in template details:
   - **Name**: "Custom Project Charter"
   - **Category**: PMBOK / BABOK / DMBOK / Custom
   - **Framework**: Project Management
   - **Description**: What this template generates
3. Define template structure:
   - Use Handlebars syntax: `{{variable_name}}`
   - Define sections and fields
   - Add validation rules
4. Set variables:
   - Variable name
   - Type (text, number, date, dropdown)
   - Required/optional
   - Default value
5. Test template with sample data
6. Click **"Save"**
7. **Publish** to make available to users

**Example Template**:
```markdown
# Project Charter: {{project_name}}

**Prepared by**: {{author}}
**Date**: {{current_date}}

## Executive Summary
{{executive_summary}}

## Business Case
{{business_case}}

## Objectives
{{#each objectives}}
- {{this}}
{{/each}}

## Stakeholders
| Name | Role | Contact |
|------|------|---------|
{{#each stakeholders}}
| {{this.name}} | {{this.role}} | {{this.email}} |
{{/each}}
```

### Prioritization Criteria Configuration

**Navigation**: Settings → Prioritization

**Customizing Criteria**:

1. Navigate to Prioritization settings
2. View default criteria (5-criteria model)
3. To add new criterion:
   - Click **"+ Add Criterion"**
   - Name: "Customer Impact"
   - Description: "Effect on customer satisfaction"
   - Weight: 15%
   - Scale: 1-5
   - Inverted: No
   - Sort order: 6
4. Adjust weights (must total 100%)
5. Click **"Save"**

**Note**: Changing criteria after projects are scored requires re-scoring.

---

## Security and Compliance

### Audit Logging

**View Audit Logs**:

**Navigation**: Security → Audit Logs

**Logged Events**:
- User login/logout
- Document creation/edit/delete
- Baseline approval/rejection
- Permission changes
- System configuration changes
- AI provider usage
- Integration activity

**Log Fields**:
- **Timestamp**: When event occurred
- **User**: Who performed the action
- **Action**: What was done
- **Resource**: What was affected
- **IP Address**: Source IP
- **User Agent**: Browser/device
- **Result**: Success/failure

**Filtering Logs**:
- By date range
- By user
- By action type
- By resource
- By result (success/failure)

**Exporting Logs**:
- Click **"Export"**
- Select date range
- Choose format (CSV, Excel, JSON)
- Download

### Security Event Monitoring

**Navigation**: Security → Security Events

**Monitored Events**:
- Failed login attempts (5+ in 10 minutes)
- Permission escalation attempts
- Unusual API activity
- Large file downloads
- Bulk deletions
- Unauthorized access attempts

**Alert Configuration**:
1. Navigate to Security Events
2. Click **"Configure Alerts"**
3. Set thresholds:
   - Failed logins: 5 in 10 minutes
   - Bulk operations: 50 in 1 hour
4. Set notification recipients:
   - Security team email
   - Slack channel (if integrated)
5. Save

### Access Control

**IP Whitelisting**:

1. Security → Access Control
2. Enable **"IP Whitelist"**
3. Add allowed IP ranges:
   - `192.168.1.0/24` (office network)
   - `10.0.0.0/8` (VPN)
4. Save
5. Users outside these IPs cannot access ADPA

**Rate Limiting**:

Prevent abuse by limiting API requests:
- **Default**: 100 requests per minute per user
- **AI Generation**: 10 per minute per user
- **File Upload**: 5 per minute per user

Configure in Settings → Security → Rate Limits

---

## Monitoring and Maintenance

### System Health Dashboard

**Navigation**: Admin → System Health

**Metrics Shown**:

**Application Health**:
- ✅ API Server: Running
- ✅ Database: Connected
- ✅ Redis Cache: Connected
- ✅ Background Jobs: Processing

**Performance**:
- Average Response Time: 120ms
- CPU Usage: 45%
- Memory Usage: 2.3GB / 8GB
- Disk Usage: 45GB / 100GB

**Recent Activity (Last 24 Hours)**:
- Users logged in: 87
- Documents generated: 143
- AI requests: 256
- Errors: 3 (view details)

### Database Management

**Backup Configuration**:

1. Admin → Database → Backups
2. Configure automated backups:
   - **Frequency**: Daily at 2:00 AM
   - **Retention**: Keep last 30 days
   - **Storage**: Cloud storage bucket
3. Test backup restoration periodically

**Manual Backup**:
1. Click **"Create Backup Now"**
2. Wait for completion
3. Download backup file

**Restore from Backup**:
1. Click **"Restore"**
2. Select backup file
3. Confirm restoration (warning: overwrites current data)
4. Wait for completion

### Log Management

**Application Logs**:

Logs are stored in `server/logs/`:
- `combined.log`: All logs
- `error.log`: Error logs only

**View Logs**:
1. Admin → Logs
2. Select log file
3. Filter by level (info, warn, error)
4. Search by keyword

**Log Rotation**:
- Logs rotate daily
- Keep last 30 days
- Compress old logs

### Performance Optimization

**Database Indexing**:

Ensure key indexes exist for performance:
- `documents.project_id`
- `documents.user_id`
- `projects.user_id`
- `audit_logs.created_at`

**Redis Cache**:

Monitor cache hit rate:
- **Good**: 80%+ hit rate
- **Poor**: <50% hit rate (review cache strategy)

**Clean Up**:
1. Admin → Maintenance
2. Click **"Run Cleanup"**:
   - Delete orphaned files
   - Clear expired sessions
   - Optimize database
   - Clear old logs
3. Review results

---

## Troubleshooting

### Common Admin Issues

#### Users Can't Log In

**Check**:
1. User account is active (not deactivated)
2. Password hasn't expired
3. IP whitelist includes user's IP
4. Account isn't locked (too many failed attempts)
5. Email server is working (for password resets)

**Resolution**:
- Reset password for user
- Unlock account if locked
- Adjust IP whitelist if needed

#### AI Provider Not Working

**Check**:
1. API key is valid (not expired/revoked)
2. Provider health status
3. Usage limits not exceeded
4. Network connectivity

**Resolution**:
- Test connection
- Verify API key
- Check provider's status page
- Review error logs

#### Integration Fails

**Check**:
1. OAuth credentials are correct
2. Permissions granted
3. Integration hasn't been revoked
4. External service is operational

**Resolution**:
- Re-authorize integration
- Verify credentials
- Check external service status

#### Slow Performance

**Check**:
1. Database performance (indexes, query optimization)
2. Server resources (CPU, memory, disk)
3. Network latency
4. Number of concurrent users

**Resolution**:
- Run database optimization
- Scale server resources
- Review slow queries
- Implement caching

---

## Best Practices

### User Management

✅ **Do**:
- Use descriptive usernames (email addresses)
- Assign roles based on job function
- Regularly review user access
- Deactivate (don't delete) former users
- Document role assignments

❌ **Don't**:
- Share admin accounts
- Give everyone admin access
- Leave inactive accounts active
- Delete users (breaks audit trail)

### Security

✅ **Do**:
- Enable MFA for all users
- Enforce strong password policies
- Monitor audit logs regularly
- Set up security alerts
- Keep software updated

❌ **Don't**:
- Disable security features
- Share API keys
- Ignore security alerts
- Use default passwords

### System Maintenance

✅ **Do**:
- Schedule regular backups
- Test backup restoration
- Monitor system health
- Review logs weekly
- Plan for updates/maintenance windows

❌ **Don't**:
- Skip backups
- Ignore error logs
- Run updates during business hours
- Neglect performance monitoring

---

## Support and Resources

### Getting Help

**Internal Resources**:
- **Documentation**: `/docs`
- **Knowledge Base**: Internal wiki
- **Admin Community**: Admin forum

**External Resources**:
- **Email Support**: admin-support@adpa-framework.com
- **Priority Support**: For enterprise customers
- **Professional Services**: For custom configurations

### Training

**Administrator Training**:
- **Online Course**: "ADPA Administration 101"
- **Live Webinars**: Monthly admin office hours
- **Certification**: ADPA Certified Administrator program

---

## Appendix

### Default Configuration Values

```yaml
# Application
site_name: "ADPA Framework"
max_upload_size: 10MB
session_timeout: 30 minutes

# Security
password_min_length: 8
password_expiry: 90 days
mfa_enabled: false
rate_limit: 100 per minute

# AI
default_provider: openai
timeout: 60 seconds
max_retries: 3

# Database
backup_frequency: daily
backup_retention: 30 days
```

### API Endpoints for Admins

```
GET    /api/admin/users              # List all users
POST   /api/admin/users              # Create user
PUT    /api/admin/users/:id          # Update user
DELETE /api/admin/users/:id          # Deactivate user

GET    /api/admin/audit-logs         # View audit logs
GET    /api/admin/system-health      # System health

POST   /api/admin/ai-providers       # Add AI provider
GET    /api/admin/ai-providers/:id/usage  # Provider usage
```

---

**Guide Version:** 1.0  
**Last Updated:** November 4, 2025  
**Maintained By:** ADPA Platform Team  
**Next Review:** December 4, 2025

---

**Administrator Guide Complete** | For additional support, contact: admin-support@adpa-framework.com
