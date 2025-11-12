# 🎯 Coordinator Quick Reference

**Your Role:** Coordinate 3 parallel development agents  
**Your Tools:** Progress tracker, daily standups, briefing documents  
**Your Goal:** Ensure 3 agents complete work in 4-6 weeks with zero conflicts

---

## 📋 **Daily Checklist (5 minutes)**

### **Morning (Start of Day):**
- [ ] Check if all 3 agents posted standup updates
- [ ] Review any blockers from previous day
- [ ] Identify coordination needs for today
- [ ] Post team coordination message if needed

### **End of Day:**
- [ ] Verify all agents made progress
- [ ] Update `AGENT_PROGRESS_TRACKER.md` if milestones reached
- [ ] Address any new blockers immediately
- [ ] Prepare tomorrow's coordination needs

---

## 👥 **Agent Status At-A-Glance**

### **Agent 1: Client Onboarding** 🔥
- **Current:** Phase 1 (Week 1-2)
- **Watch For:** PDF conversion accuracy
- **Critical Path:** Yes (longest duration)
- **Merge:** Week 6 (last)

### **Agent 2: Task Management** 📋
- **Current:** Phase 1 (Week 1)
- **Watch For:** Table render performance
- **Critical Path:** No (moderate duration)
- **Merge:** Week 4 (second)

### **Agent 3: Template Optimization** 🎨
- **Current:** Day 1-2 (Week 1)
- **Watch For:** Template conflict on merge
- **Critical Path:** No (shortest duration)
- **Merge:** Week 3 (first)

---

## 🚨 **Blocker Response Protocol**

### **When Agent Reports Blocker:**

**1. Assess Severity (< 5 min):**
- 🟢 **LOW:** Agent can work around, no delay
- 🟡 **MEDIUM:** Delays by 1 day, impacts milestone
- 🔴 **CRITICAL:** Full stop, blocks all progress

**2. Quick Actions:**
- **Technical Blocker:** Connect agent with relevant expert
- **Dependency Blocker:** Coordinate with other agent
- **Environment Blocker:** Provide credentials/access
- **Unclear Requirements:** Reference briefing doc, clarify scope

**3. Document & Track:**
```markdown
## Blocker Log
- **Date:** [date]
- **Agent:** Agent X
- **Issue:** [description]
- **Severity:** 🟡 MEDIUM
- **Resolution:** [action taken]
- **Time Lost:** X hours
- **Status:** ✅ Resolved / 🔄 In Progress
```

---

## 🔄 **Weekly Coordination Schedule**

### **Monday (Week Start):**
- [ ] Review last week's progress
- [ ] Check all agents on track for week goals
- [ ] Identify integration points for the week
- [ ] Post week objectives in team channel

### **Wednesday (Mid-Week):**
- [ ] Quick sync: Are we on track?
- [ ] Address any emerging blockers
- [ ] Adjust plans if needed
- [ ] Confirm Friday review agenda

### **Friday (Week End):**
- [ ] Review week deliverables
- [ ] Update progress tracker with percentages
- [ ] Plan next week coordination
- [ ] Celebrate wins 🎉

---

## 📊 **Progress Tracking (Weekly Update)**

### **Update Process (15 minutes):**

1. **Collect Data:**
   - Review each agent's commits
   - Check test pass rates
   - Note any blockers resolved

2. **Update Tracker:**
   - Open `AGENT_PROGRESS_TRACKER.md`
   - Update "Weekly Progress" section
   - Update "Overall Progress" table
   - Update agent-specific progress percentages

3. **Calculate Velocity:**
   ```
   Agent X Velocity = Hours Completed / Hours Planned * 100%
   
   Example:
   Agent 1: 18 hours / 20 hours planned = 90% velocity
   ```

4. **Assess Risks:**
   - Anyone falling behind? (< 80% velocity)
   - Any blockers recurring?
   - Integration points approaching?

---

## 🔀 **Merge Coordination (Critical!)**

### **Week 3: Agent 3 Merge**
**Timing:** End of Week 3 (first to merge)

**Pre-Merge Checklist:**
- [ ] Agent 3 confirms all tests passing
- [ ] Review code changes (1 file conflict possible)
- [ ] Create PR: `feature/template-optimization` → `development`
- [ ] Agent 3 resolves any conflicts
- [ ] Approve & merge
- [ ] All agents pull latest `development`

**Post-Merge:**
- [ ] Verify development branch stable
- [ ] Agent 3 celebrates completion 🎉
- [ ] Document lessons learned

---

### **Week 4: Agent 2 Merge**
**Timing:** End of Week 4 (second to merge)

**Pre-Merge Checklist:**
- [ ] Agent 2 confirms 141 tasks display correctly
- [ ] All CRUD operations working
- [ ] Tests passing
- [ ] Create PR: `feature/task-management-ui` → `development`
- [ ] Approve & merge
- [ ] Agent 1 pulls latest `development`

**Post-Merge:**
- [ ] Integration test: Upload documents + view tasks
- [ ] Agent 2 celebrates completion 🎉

---

### **Week 6: Agent 1 Merge**
**Timing:** End of Week 6 (last to merge)

**Pre-Merge Checklist:**
- [ ] 3 beta clients successfully onboarded
- [ ] All assessment features working
- [ ] PDF reports generated successfully
- [ ] Tests passing
- [ ] Create PR: `feature/client-onboarding-assessment` → `development`
- [ ] Comprehensive review (largest feature)
- [ ] Approve & merge

**Post-Merge:**
- [ ] Full system integration test
- [ ] All 3 features working together
- [ ] Production deployment preparation
- [ ] Team celebration 🎊

---

## ⚠️ **Red Flags to Watch For**

### **Agent Falling Behind:**
**Signs:**
- Velocity < 70% for 2+ weeks
- Missing daily standups
- Same blocker for 3+ days
- Tests not being written

**Action:**
1. One-on-one sync with agent
2. Identify root cause
3. Reduce scope or extend timeline
4. Consider reassigning tasks

---

### **Integration Issues:**
**Signs:**
- Merge conflicts on unexpected files
- Tests failing after merge
- Performance degradation
- API contract changes

**Action:**
1. Roll back merge if critical
2. Coordinate fix between agents
3. Re-test integration thoroughly
4. Update documentation

---

### **Scope Creep:**
**Signs:**
- Agent adding features not in briefing
- Timelines extending
- "Just one more thing..." requests

**Action:**
1. Refer back to briefing document
2. Clarify MVP vs nice-to-have
3. Create backlog for post-launch features
4. Keep scope focused

---

## 📞 **Communication Templates**

### **Blocker Notification:**
```
🚨 BLOCKER ALERT

Agent: Agent X
Issue: [brief description]
Severity: 🔴 CRITICAL / 🟡 MEDIUM / 🟢 LOW
Impact: [which milestone affected]
Help Needed: [specific ask]
ETA for Resolution: [timeframe]
```

### **Weekly Progress Update:**
```
📊 Week X Progress Report

Team Status: 🟢 On Track / 🟡 At Risk / 🔴 Blocked

Agent 1: X% complete (Y hours)
Agent 2: X% complete (Y hours)  
Agent 3: X% complete (Y hours)

Milestones This Week:
✅ [completed]
🔄 [in progress]
⏳ [upcoming]

Blockers Resolved: X
Integration Points: [if any]

Next Week Focus: [key objectives]
```

### **Merge Announcement:**
```
🎉 MERGE COMPLETE

Agent: Agent X
Feature: [feature name]
Branch: feature/xxx → development
Commits: X commits
Files Changed: X files
Tests: ✅ All passing

Impact:
- [what this enables]
- [who should pull latest]

Next: [what happens next]
```

---

## 🎯 **Success Indicators**

### **Week 1:**
✅ All agents have made first commits  
✅ Daily standup rhythm established  
✅ No critical blockers  
✅ All agents on track for Week 1 milestones

### **Week 3:**
✅ Agent 3 completes and merges  
✅ Agent 2 core UI functional  
✅ Agent 1 backend API working

### **Week 4:**
✅ Agent 2 completes and merges  
✅ Integration test successful  
✅ Agent 1 frontend development progressing

### **Week 6:**
✅ All agents complete  
✅ Full integration successful  
✅ Production-ready deployment

---

## 📚 **Quick Reference Links**

**For Agents:**
- [Agent 1 Briefing](AGENT_1_BRIEFING_CLIENT_ONBOARDING.md)
- [Agent 2 Briefing](AGENT_2_BRIEFING_TASK_MANAGEMENT.md)
- [Agent 3 Briefing](AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md)

**For Tracking:**
- [Progress Tracker](AGENT_PROGRESS_TRACKER.md) - Update weekly
- [Daily Standup Template](DAILY_STANDUP_TEMPLATE.md) - Use daily
- [Main Handover Doc](HANDOVER_DOCUMENT.md) - Technical reference

**For Context:**
- [Parallel Development Summary](PARALLEL_AGENTS_SUMMARY.md)
- [Session Handover](docs/sessions/SESSION_HANDOVER_2025-11-03.md)

---

## 💡 **Coordinator Tips**

1. **Trust the Briefings:** Agents have complete instructions, avoid micro-managing
2. **Focus on Blockers:** Your main job is removing obstacles
3. **Celebrate Wins:** Acknowledge every milestone, no matter how small
4. **Over-Communicate:** Better to coordinate too much than too little
5. **Stay Flexible:** Adjust timelines if needed, quality > speed
6. **Document Everything:** Track decisions, blockers, lessons learned
7. **Integration is Key:** Test early, test often when agents merge

---

## ⏱️ **Time Commitment**

**Daily:** 15-30 minutes
- Check standups (5 min)
- Address blockers (10 min)
- Update tracker if needed (5 min)

**Weekly:** 1-2 hours
- Week review (30 min)
- Progress update (15 min)
- Planning next week (30 min)
- Team coordination meeting (30 min)

**Total:** ~3-4 hours per week

---

## 🎊 **When Everything Goes Right**

**Week 6 Success Scenario:**

```
✅ Agent 3 merged Week 3 (template optimization working)
✅ Agent 2 merged Week 4 (141 tasks displayed, resources assigned)
✅ Agent 1 merged Week 6 (3 beta clients, assessments working)

Integration Test Results:
✅ Upload 50 documents → ✅ Assessment generated
✅ View 141 tasks → ✅ Assign resources  
✅ Generate document → ✅ Quality audit → ✅ Template improved

Production Deployment:
✅ All tests passing (unit + integration + E2E)
✅ Performance benchmarks met
✅ Security review passed
✅ Documentation complete

Business Impact:
🎯 $2.85M NPV project (Client Onboarding)
🎯 141 tasks unlocked for management
🎯 Self-improving AI templates

🎉 PARALLEL DEVELOPMENT SUCCESS!
```

---

**You've Got This!** 🚀

Remember: Your job isn't to code, it's to **coordinate**, **unblock**, and **celebrate**. The agents have everything they need in their briefings. You're here to ensure they succeed together.

**Questions?** Review the briefing documents or handover doc.

---

**Created:** November 3, 2025  
**For:** Project Coordinator  
**Managing:** 3 Parallel Development Agents  
**Goal:** Ship 3 features in 4-6 weeks

