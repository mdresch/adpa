# 🎯 Agent [NUMBER]: [Feature Name]

**Mission:** [One sentence describing the core objective]  
**Priority:** 🟢 HIGH | 🟡 MEDIUM | 🟠 LOW | 🔴 CRITICAL  
**Timeline:** [Duration, e.g., "1 week", "3 days", "2 weeks"]  
**Effort Estimate:** [Hours, e.g., "20-25 hours", "40-50 hours"]  
**Status:** Ready to start | In Progress | Blocked | Complete  
**Branch:** `feature/[feature-name]`

---

## 📋 **Executive Summary**

[2-3 paragraph overview of the task. Explain WHAT needs to be built, WHY it's important, and WHO will use it.]

**Current State:**
- ✅ [What's already working]
- ✅ [What's already working]
- ⏳ [What needs to be built]
- ⏳ [What needs to be built]

---

## 🎯 **Your Mission**

[Detailed description of the task. Be specific about what success looks like.]

**End Goal:** [Specific, measurable outcome that defines success]

**Key Objectives:**
1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

---

## 📦 **Deliverables**

### **Day 1-2: [Phase Name]**
- [ ] [Specific deliverable with acceptance criteria]
- [ ] [Specific deliverable with acceptance criteria]
- [ ] [Specific deliverable with acceptance criteria]

### **Day 3-4: [Phase Name]**
- [ ] [Specific deliverable with acceptance criteria]
- [ ] [Specific deliverable with acceptance criteria]

### **Day 5-6: [Phase Name]**
- [ ] [Specific deliverable with acceptance criteria]
- [ ] [Specific deliverable with acceptance criteria]

---

## 📂 **Files You'll Modify**

### **Existing Files to Enhance:**
```
path/to/existing/file.tsx                 # Description of changes
path/to/another/file.ts                   # Description of changes
```

### **New Files to Create:**
```
app/new-feature/page.tsx                  # New page description
components/NewComponent.tsx               # New component description
server/src/routes/newRoutes.ts            # New API routes
server/src/services/newService.ts         # New service
```

---

## 🔌 **API Endpoints to Implement**

```typescript
// Get [resource]
GET /api/[resource]?param=value
Response: {
  success: true,
  data: [...]
}

// Create [resource]
POST /api/[resource]
Body: { field: "value" }
Response: { success: true, id: "uuid" }

// Update [resource]
PUT /api/[resource]/:id
Body: { field: "updated value" }
Response: { success: true }

// Delete [resource]
DELETE /api/[resource]/:id
Response: { success: true, message: "Deleted" }
```

---

## 🎨 **UI Components**

### **1. [Component Name]**
```tsx
export default function ComponentName() {
  return (
    <div className="space-y-6">
      {/* Component structure */}
      <Card>
        <CardHeader>
          <CardTitle>[Title]</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### **2. [Another Component]**
```tsx
// Component code example
```

---

## 🧪 **Testing Checklist**

### **Manual Testing:**
- [ ] [Specific user action to test]
- [ ] [Expected result to verify]
- [ ] [Edge case to check]
- [ ] [Error scenario to validate]

### **Automated Tests:**
```typescript
describe('[Feature Name]', () => {
  it('should [expected behavior]', async () => {
    // Test code
    expect(result).toBe(expected)
  })
  
  it('should [handle error case]', async () => {
    // Error test code
    expect(() => action()).toThrow()
  })
})
```

---

## 🎯 **Success Criteria**

- ✅ [Measurable criterion 1]
- ✅ [Measurable criterion 2]
- ✅ [Measurable criterion 3]
- ✅ All UI polished and responsive
- ✅ Zero critical bugs
- ✅ All tests passing
- ✅ Documentation complete

---

## 🔗 **Dependencies & Integration**

### **Use These (Already Built):**
```typescript
// Existing service to import
import { existingService } from './services/existingService'

// Existing component to use
import { ExistingComponent } from '@/components/ExistingComponent'
```

### **Coordinate With:**
- **Agent X:** [How this work relates to other agents]
- **Team Y:** [Any coordination needed]

### **Dependencies:**
```json
{
  "backend": {
    "package-name": "^version"
  },
  "frontend": {
    "package-name": "^version"
  }
}
```

---

## 🗓️ **Timeline**

**Day 1:** [Specific tasks]  
**Day 2:** [Specific tasks]  
**Day 3:** [Specific tasks]  
**Day 4:** [Specific tasks]  
**Day 5:** [Specific tasks]  
**Day 6:** [Specific tasks]  
**Day 7:** [Final polish and testing]

**Milestone:** Week 1 complete = [Major deliverable]

---

## 📞 **Communication**

**Daily Update Template:**
```
Agent [X] Update - Day [N]:
✅ Completed: [What you finished]
🔄 In Progress: [What you're working on]
⏳ Next: [What's coming next]
🚨 Blockers: [Any issues or none]
```

---

## 📚 **Resources**

**Documentation:**
- `docs/path/to/architecture.md` - [Description]
- `docs/path/to/api-spec.md` - [Description]
- `path/to/existing-code.ts` - [Description]

**Existing Patterns:**
- `app/similar-feature/page.tsx` - Similar UI implementation
- `server/src/routes/similar.ts` - Similar API pattern

**External References:**
- [Library Documentation](https://example.com)
- [Design System](https://example.com)

---

## ✅ **Pre-Start Checklist**

- [ ] Review all linked documentation
- [ ] Test current system to understand baseline
- [ ] Set up development environment
- [ ] Create feature branch: `feature/[feature-name]`
- [ ] Confirm coordination with dependent teams

---

## 🎊 **Final Notes**

**Key Focus:**
1. **[Focus Area 1]** - [Why it's important]
2. **[Focus Area 2]** - [Why it's important]
3. **[Focus Area 3]** - [Why it's important]

**Good luck, Agent [X]! 🚀**

---

**Prepared for:** Agent [X]  
**Date:** [YYYY-MM-DD]  
**Status:** [Ready to start | In progress | Completed]  
**Questions?** Tag @[TeamLead] or @[TechLead]

