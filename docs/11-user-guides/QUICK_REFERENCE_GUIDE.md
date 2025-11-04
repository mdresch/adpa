# ADPA Quick Reference Guide
**Cheat Sheet for Common Tasks**  
**Version:** 1.0.0  
**Last Updated:** November 4, 2025

---

## 🚀 Quick Actions

### Create New Project
```
1. Dashboard → Projects → [+ New Project]
2. Fill in: Name, Description, Start/End Date
3. Click "Create Project"
```

### Generate Document
```
1. Open Project → Documents Tab
2. Click [+ Generate Document]
3. Select Template
4. Provide Context
5. Click "Generate"
```

### Create Template
```
1. Templates → [+ New Template]
2. Add Name, Category, Framework
3. Define Sections
4. Write System Prompts
5. Save Template
```

---

## 📝 Template Design Patterns

### Good System Prompt Structure
```markdown
You are a [ROLE].

Generate a [DOCUMENT SECTION] that:
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [REQUIREMENT 3]

Use [FORMAT/STRUCTURE].
Maintain [TONE/STYLE].
```

### Example: Status Summary
```markdown
You are an experienced project manager.

Generate an executive summary that:
- Summarizes project health (Green/Yellow/Red)
- Highlights 2-3 key accomplishments
- Identifies critical issues
- Provides outlook for next week

Keep it concise (150-200 words).
Use professional business language.
```

---

## 🔧 API Quick Reference

### Authentication
```bash
# API Key (Header)
Authorization: Bearer adpa_key_abc123xyz456

# cURL Example
curl -X GET https://adpa.com/api/v1/projects \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Common Endpoints

**Projects**
```
GET    /api/v1/projects              # List projects
POST   /api/v1/projects              # Create project
GET    /api/v1/projects/{id}         # Get project
PATCH  /api/v1/projects/{id}         # Update project
DELETE /api/v1/projects/{id}         # Delete project
```

**Documents**
```
GET    /api/v1/documents             # List documents
GET    /api/v1/documents/{id}        # Get document
POST   /api/v1/generation            # Generate document
GET    /api/v1/generation/{jobId}    # Check status
```

**Templates**
```
GET    /api/v1/templates             # List templates
POST   /api/v1/templates             # Create template
GET    /api/v1/templates/{id}        # Get template
```

### Request Examples

**Create Project**
```javascript
POST /api/v1/projects
{
  "name": "Customer Portal",
  "description": "Migrate to React",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "budget": 500000,
  "status": "active"
}
```

**Generate Document**
```javascript
POST /api/v1/generation
{
  "projectId": "proj-123",
  "templateId": "tmpl-456",
  "documentName": "Status Report - Nov 4",
  "customInstructions": "Focus on milestone X"
}
```

**Check Generation Status**
```javascript
GET /api/v1/generation/{jobId}

Response:
{
  "state": "completed",
  "document": {
    "id": "doc-789",
    "name": "Status Report - Nov 4",
    "qualityScore": 87
  }
}
```

---

## 🔌 Integration Quick Setup

### Confluence
```
1. Settings → Integrations → Confluence
2. Add Confluence URL
3. Enter OAuth credentials
4. Authorize
5. Select default space
```

### SharePoint
```
1. Settings → Integrations → SharePoint
2. Add SharePoint URL
3. Enter Azure AD app details
4. Authorize with Microsoft
5. Select document library
```

### GitHub
```
1. Settings → Integrations → GitHub
2. Enter organization name
3. Add OAuth app credentials
4. Authorize with GitHub
5. Select repository
```

---

## 🎯 AI Provider Configuration

### Add OpenAI
```
Settings → AI Providers → [+ Add Provider]

Provider: OpenAI
API Key: sk-proj-xxxxxxxxxxxxx
Model: GPT-4
Priority: 1 (primary)
Enable Failover: ☑
```

### Add Google AI
```
Provider: Google AI
API Key: AIzaSyxxxxxxxxxxxxxxx
Model: Gemini Pro
Priority: 2 (fallback)
```

### Failover Strategy
```
Primary: OpenAI (GPT-4)
  ↓ (if fails)
Secondary: Google AI (Gemini Pro)
  ↓ (if fails)
Tertiary: Ollama (local)
```

---

## 📊 Quality Score Interpretation

```
95-100  ⭐⭐⭐⭐⭐  Excellent
85-94   ⭐⭐⭐⭐    Very Good
75-84   ⭐⭐⭐      Good
65-74   ⭐⭐        Needs Improvement
<65     ⭐          Regenerate Recommended
```

### Quality Components
- **Completeness**: All sections present, adequate length
- **Accuracy**: Context properly used, data correct
- **Compliance**: Standards followed, structure correct
- **Readability**: Clear language, appropriate tone

---

## ⚠️ Troubleshooting Quick Fixes

### Generation Failed
```
1. Check AI provider status
2. Verify template configuration
3. Ensure context data available
4. Retry with different AI provider
5. Check error logs
```

### Integration Not Syncing
```
1. Settings → Integrations
2. Check connection status
3. Re-authenticate if needed
4. Verify permissions
5. Test connection
```

### Low Quality Score
```
1. Review quality report details
2. Improve system prompts
3. Add more context data
4. Regenerate specific sections
5. Edit manually if needed
```

### Slow Performance
```
1. Check system health dashboard
2. Clear cache (Settings → Performance)
3. Reduce concurrent jobs
4. Optimize database queries
5. Contact admin if persists
```

---

## 🔒 Security Checklist

**For Users:**
- [ ] Use strong password
- [ ] Enable 2FA if available
- [ ] Don't share credentials
- [ ] Log out when finished
- [ ] Review document permissions

**For Administrators:**
- [ ] Enforce HTTPS
- [ ] Enable rate limiting
- [ ] Regular security audits
- [ ] Rotate API keys quarterly
- [ ] Monitor audit logs
- [ ] Keep backups current

**For Developers:**
- [ ] Store API keys in env variables
- [ ] Never commit secrets to git
- [ ] Verify webhook signatures
- [ ] Implement retry logic
- [ ] Handle errors gracefully
- [ ] Use HTTPS for all calls

---

## 📈 Performance Tips

### Template Optimization
- Keep system prompts focused (< 500 words)
- Only include necessary context
- Use clear, specific instructions
- Avoid overly complex logic

### API Optimization
- Implement request caching
- Use pagination for large datasets
- Batch requests when possible
- Implement exponential backoff

### Database Optimization
- Add indexes for frequent queries
- Archive old documents
- Clean up failed jobs
- Regular maintenance

---

## 🎨 Markdown Formatting Guide

### Headers
```markdown
# Heading 1
## Heading 2
### Heading 3
```

### Lists
```markdown
- Bullet item
- Another item
  - Nested item

1. Numbered item
2. Another item
```

### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### Emphasis
```markdown
**Bold text**
*Italic text*
`Code text`
```

### Links
```markdown
[Link text](https://example.com)
```

### Code Blocks
````markdown
```javascript
const example = "code";
```
````

---

## 🔔 Webhook Events Reference

```
document.generated   → Document creation complete
document.updated     → Document modified
project.created      → New project added
generation.failed    → Generation error occurred
integration.synced   → Third-party sync complete
```

### Webhook Payload Example
```json
{
  "event": "document.generated",
  "timestamp": "2025-11-04T14:23:45Z",
  "data": {
    "documentId": "doc-789",
    "documentName": "Status Report",
    "projectId": "proj-123",
    "qualityScore": 87
  }
}
```

---

## 📞 Support Resources

### In-App Help
- 💬 Help button (bottom right)
- 📧 Support ticket system
- 📚 Knowledge base

### Documentation
- 📖 User Guide
- 🔧 API Documentation
- 👨‍💼 Admin Guide
- 👨‍💻 Developer Guide

### Community
- 💬 User forum
- 🐛 Bug reports
- 💡 Feature requests
- 📺 Video tutorials

### Contact
- **End Users**: support@adpa.example.com
- **Administrators**: admin-support@adpa.example.com
- **Developers**: dev-support@adpa.example.com

---

## 📋 Keyboard Shortcuts

```
Ctrl/Cmd + K         → Quick search
Ctrl/Cmd + N         → New document
Ctrl/Cmd + S         → Save
Ctrl/Cmd + P         → Print/Export
Esc                  → Close dialog
```

---

## 🎓 Training Certification Levels

### End User (2 hours)
- Template usage
- Document generation
- Quality review

### Administrator (4 hours)
- System configuration
- User management
- Integration setup
- Performance monitoring

### Developer (3 hours)
- API integration
- Webhook handling
- Custom context sources

---

## 📊 System Status Indicators

```
🟢 Green    → Operational
🟡 Yellow   → Degraded performance
🔴 Red      → Service disruption
⚪ Gray     → Maintenance mode
```

---

## 🗂️ File Format Support

### Import Formats
- Markdown (.md)
- Word (.docx)
- PDF (.pdf) - text extraction
- Plain Text (.txt)

### Export Formats
- Markdown (.md)
- PDF (.pdf)
- Word (.docx)
- HTML (.html)
- JSON (.json)

---

## 💡 Pro Tips

1. **Use Templates Consistently**: Create templates for recurring documents
2. **Leverage Context**: More context = better quality
3. **Review Before Publishing**: Always check generated content
4. **Version Control**: Keep versions of important templates
5. **Regular Backups**: Export critical documents periodically
6. **Monitor Quality**: Track quality scores over time
7. **Optimize Prompts**: Iterate on system prompts for better results
8. **Use Webhooks**: Automate workflows with event notifications
9. **Cache Data**: Reduce API calls with intelligent caching
10. **Stay Updated**: Check release notes for new features

---

**Quick Reference Version:** 1.0.0  
**Last Updated:** November 4, 2025  
**Print-Friendly:** Yes - Designed for desk reference

💡 **Tip**: Print this guide and keep it handy for quick lookups!
