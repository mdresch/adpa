# 🧪 Local Feature Testing Guide

## ✅ System Status
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database: Supabase (Connected)
- Redis: Railway (Connected)
- AI: Google Gemini (Working)

---

## 📋 Features to Test

### 1. ✅ **AI Document Generation** (Already Tested)
**Status: WORKING**
- ✅ Generated Project Charter with metadata
- ✅ Tokens tracked: 11,539
- ✅ Provider: Google Gemini
- ✅ Model: gemini-2.5-pro

---

### 2. 📝 **Templates Management**

**Test:** Navigate to **Templates** page
- URL: http://localhost:3000/templates
- **What to check:**
  - [ ] Can you see all 64 templates?
  - [ ] Can you create a new template?
  - [ ] Can you edit an existing template?
  - [ ] Can you delete a template?
  - [ ] Can you filter by framework (PMBOK, BABOK, DMBOK)?

**Create a Test Template:**
1. Click "New Template"
2. Fill in:
   - Name: "Test Risk Register"
   - Framework: PMBOK 7
   - Description: "Custom risk register template"
   - Content: (Add some markdown)
3. Save and verify it appears in the list

---

### 3. 🤖 **AI Provider Management**

**Test:** Navigate to **AI Providers** page
- URL: http://localhost:3000/ai-providers
- **What to check:**
  - [ ] Can you see all 6 AI providers?
  - [ ] Provider status (Active/Inactive)
  - [ ] Usage statistics displayed?
  - [ ] Can you test a provider connection?
  - [ ] Can you configure provider settings?

**Providers to verify:**
1. Google Gemini (should be active and working)
2. OpenAI (needs API key)
3. Mistral (needs API key)
4. Groq (needs API key)
5. Anthropic Claude (needs API key)
6. Azure OpenAI (needs config)

---

### 4. 📊 **Analytics Dashboard**

**Test:** Navigate to **Analytics** page
- URL: http://localhost:3000/analytics
- **What to check:**
  - [ ] System-wide metrics displayed?
  - [ ] Document generation statistics?
  - [ ] AI usage by provider?
  - [ ] User activity metrics?
  - [ ] Charts and graphs rendering?

**Expected Metrics:**
- Total documents generated
- AI tokens consumed
- Most used templates
- Provider performance comparison

---

### 5. 🤖 **AI Analytics**

**Test:** Navigate to **AI Analytics** page
- URL: http://localhost:3000/ai-analytics
- **What to check:**
  - [ ] Provider usage breakdown?
  - [ ] Token consumption over time?
  - [ ] Cost estimates?
  - [ ] Performance metrics (response time, success rate)?
  - [ ] Model comparison?

---

### 6. 💼 **Jobs Monitoring**

**Test:** Navigate to **Jobs** page
- URL: http://localhost:3000/jobs
- **What to check:**
  - [ ] Can you see recent jobs?
  - [ ] Job status (completed, failed, processing)?
  - [ ] Job details (template, provider, model)?
  - [ ] Can you retry failed jobs?
  - [ ] Can you cancel running jobs?

**Your recent job should show:**
- Job ID: db58768e-bb3d-4a6f-90a1-0ca3e0874ce5
- Status: Completed
- Document: Project Charter
- Provider: Google Gemini
- Model: gemini-2.5-pro

---

### 7. 🔗 **Integrations**

#### a) **Confluence Integration**
- URL: http://localhost:3000/integrations/confluence
- **Test:**
  - [ ] Can you connect to Confluence?
  - [ ] Can you list available spaces?
  - [ ] Can you sync a document to Confluence?

#### b) **SharePoint Integration**
- URL: http://localhost:3000/integrations/sharepoint
- **Test:**
  - [ ] Can you authenticate with SharePoint?
  - [ ] Can you browse SharePoint sites?
  - [ ] Can you upload documents?

#### c) **GitHub Integration**
- URL: http://localhost:3000/integrations/github
- **Test:**
  - [ ] Can you connect GitHub account?
  - [ ] Can you list repositories?
  - [ ] Can you sync project documentation to GitHub?

---

### 8. 🔐 **Security Dashboard**

**Test:** Navigate to **Security** page
- URL: http://localhost:3000/security
- **What to check:**
  - [ ] Security events logged?
  - [ ] Audit trail visible?
  - [ ] User access logs?
  - [ ] Failed login attempts tracked?
  - [ ] API key management?

---

### 9. 👥 **User Management** (Admin Only)

**Test:** Navigate to **Users** page
- URL: http://localhost:3000/users
- **What to check:**
  - [ ] Can you see all users?
  - [ ] Can you create a new user?
  - [ ] Can you edit user roles?
  - [ ] Can you deactivate users?
  - [ ] Role-based permissions working?

**Roles to test:**
- Admin (full access)
- Manager (project management)
- User (document creation)
- Viewer (read-only)

---

### 10. ⚙️ **Settings**

**Test:** Navigate to **Settings** page
- URL: http://localhost:3000/settings
- **What to check:**
  - [ ] Can you update profile?
  - [ ] Can you change preferences?
  - [ ] Can you configure notifications?
  - [ ] Can you manage API keys?
  - [ ] System settings accessible (admin)?

---

### 11. 🔍 **Search Functionality**

**Test:** Global search
- **What to check:**
  - [ ] Can you search for documents?
  - [ ] Can you search for projects?
  - [ ] Can you search for templates?
  - [ ] Search results relevant?
  - [ ] Filters working?

---

### 12. 📄 **Document Export**

**Test:** Export generated documents
- **What to check:**
  - [ ] Can you export to PDF?
  - [ ] Can you export to DOCX?
  - [ ] Can you export to Markdown?
  - [ ] Formatting preserved?
  - [ ] Metadata included?

**Test with:** Your generated "Project Charter" document

---

### 13. 🔄 **Process Flow Visualization**

**Test:** Navigate to **Process Flow** page
- URL: http://localhost:3000/process-flow
- **What to check:**
  - [ ] Visual pipeline displayed?
  - [ ] Can you see workflow stages?
  - [ ] Progress tracking working?
  - [ ] Can you manage workflows?

---

### 14. 📱 **Responsive Design**

**Test:** Resize browser window
- **What to check:**
  - [ ] Mobile view working?
  - [ ] Tablet view working?
  - [ ] Desktop view working?
  - [ ] Navigation adapts?
  - [ ] All features accessible on mobile?

---

## 🐛 **Bug Reporting Template**

If you find any issues, note them down:

```
Feature: [Feature name]
Issue: [What's broken?]
Expected: [What should happen?]
Actual: [What actually happened?]
Steps to reproduce:
1. 
2. 
3. 

Browser: [Chrome/Firefox/Safari]
Console errors: [Any errors?]
```

---

## ✅ **Testing Checklist Summary**

Once you've tested everything, check off:

- [ ] 1. AI Document Generation ✓ (Already working)
- [ ] 2. Templates Management
- [ ] 3. AI Provider Management
- [ ] 4. Analytics Dashboard
- [ ] 5. AI Analytics
- [ ] 6. Jobs Monitoring
- [ ] 7. Integrations (Confluence, SharePoint, GitHub)
- [ ] 8. Security Dashboard
- [ ] 9. User Management
- [ ] 10. Settings
- [ ] 11. Search Functionality
- [ ] 12. Document Export (PDF, DOCX, Markdown)
- [ ] 13. Process Flow Visualization
- [ ] 14. Responsive Design

---

## 🎯 **Next Steps After Testing**

Once you've tested everything and are satisfied:

1. **Note any bugs** - We'll fix them
2. **List missing features** - We'll add them
3. **Ready for production?** - We'll deploy to Railway
4. **Need improvements?** - We'll iterate

---

## 💡 **Tips**

- **Keep backend running** in the terminal
- **Watch backend logs** for errors
- **Check browser console** for frontend errors
- **Test with different data** to ensure robustness
- **Try edge cases** (empty fields, special characters, etc.)

---

**Happy Testing!** 🎉

When you're done, just let me know what you found and we'll fix any issues before deploying!

