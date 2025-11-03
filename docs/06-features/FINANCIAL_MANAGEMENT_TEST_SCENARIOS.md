# Financial Management System - Test Scenarios

## Test Environment

**Program**: Digital Transformation Initiative  
**Budget**: $10,450,000  
**5 Projects**: Customer Portal, Data Analytics, Mobile App, Infrastructure, Training  

**Test URL**: http://localhost:3000/programs/ce6e2a0e-7e2a-4872-8d8f-032e571adc1d

---

## 🎯 Scenario 1: Weekly Cost Update (COMMON)

**Goal**: Simulate weekly project status update by PM

### **Setup**
- Project: **Customer Portal Migration**
- Current Status: 60% complete, $2.1M spent
- URL: http://localhost:3000/projects/d031a664-3613-4f7d-a29a-7435735cb008

### **Test Steps**

1. **Navigate** to Customer Portal Migration project
2. **Click** "💵 Financials" tab
3. **Verify** starting values:
   - Budget: $3,500,000
   - Actual Cost: $2,100,000
   - % Complete: 60%
   - Internal Labor: $840,000

4. **Update costs** (week's activity):
   - Internal Labor: $840,000 → **$910,000** (+$70K, 1 week dev team)
   - Cloud Infrastructure: $420,000 → **$425,000** (+$5K AWS costs)
   - AI Services: $168,000 → **$173,000** (+$5K OpenAI usage)

5. **Update progress**:
   - % Complete: 60% → **65%** (slider)
   - Watch Earned Value update: $2.1M → $2.275M

6. **Click** "Save All Changes"

### **Expected Results**
- ✅ Toast: "Project financials updated successfully"
- ✅ Total Actual Cost: $2,100,000 → $2,180,000
- ✅ Remaining Budget: $1,400,000 → $1,320,000
- ✅ Earned Value: $2,100,000 → $2,275,000

### **Verify Program Dashboard**
7. **Navigate** to Program Finances tab
8. **Verify** program totals updated:
   - Spent to Date: $6,100,000 → **$6,180,000** (+$80K)
   - CPI should **improve** (more EV, similar AC)
   - SPI should **improve** (65% > 60%)

### **Success Criteria**
- [ ] All cost updates saved correctly
- [ ] EV recalculated automatically
- [ ] Program dashboard reflects changes within 2 seconds
- [ ] No console errors

---

## 🚨 Scenario 2: Budget Overrun Detection (CRITICAL)

**Goal**: Test system behavior when project goes over budget

### **Setup**
- Project: **Training Platform** (smallest, easiest to push over)
- Budget: $400,000
- Current Actual: $200,000
- URL: http://localhost:3000/projects/e453a512-07bf-4bbf-841a-173840ac53d1

### **Test Steps**

1. **Navigate** to Training Platform → Financials tab
2. **Verify** starting state:
   - Budget: $400,000
   - Actual: $200,000
   - Remaining: $200,000 (50% left)

3. **Simulate major cost increase**:
   - Internal Labor: $80,000 → **$180,000** (+$100K contractor surge)
   - External Labor: $50,000 → **$120,000** (+$70K consultants)
   - Cloud: $40,000 → **$50,000** (+$10K scaling costs)
   
4. **Calculate**:
   - New Total: $80K + $120K + $50K + other categories = **$420,000**
   - **OVER BUDGET** by $20,000! 🚨

5. **Update % Complete**: 45% → **85%** (project nearing completion despite overrun)

6. **Save** and observe

### **Expected Results**
- ✅ Remaining Budget shows **-$20,000** (red text)
- ✅ Budget utilization: **105%** (over 100%)
- ✅ Progress bar shows red/orange color
- ⚠️ System should show warning indicator

### **Verify EVM Metrics**
7. **Go to Program Finances** tab
8. **Check EVM status**:
   - CPI should **decrease** (overspending)
   - Status may change to "At Risk" or "In Trouble"
   - EAC (Estimate at Completion) should increase

### **Management Action**
9. **Update Forecast**:
   - Go to "Forecasting" tab
   - Set Forecast: $400,000 → **$450,000** (realistic new estimate)
   - See Variance: +$50,000 overrun
   - Document why (contractor surge + scope creep)

### **Success Criteria**
- [ ] System clearly indicates over-budget status (red color)
- [ ] CPI reflects poor cost performance
- [ ] Forecast update saves correctly
- [ ] Program dashboard shows updated risk

---

## 📈 Scenario 3: Multi-Project Update (PROGRAM MANAGER)

**Goal**: Update all 5 projects in one session, see program-level impact

### **Test Steps**

1. **Update Project 1: Customer Portal**
   - % Complete: 60% → 70%
   - Internal Labor +$50K
   - Expected: EV increases, CPI stable

2. **Update Project 2: Data Analytics**
   - % Complete: 55% → 60%
   - AI Services: +$20K (new model testing)
   - Expected: EV increases, slight CPI decrease

3. **Update Project 3: Mobile App**
   - % Complete: 50% → 65% (major sprint completion)
   - External Labor +$100K (contractor team)
   - Expected: Big EV jump, CPI may drop

4. **Update Project 4: Infrastructure**
   - % Complete: 65% → 75%
   - Cloud: +$30K (migration costs)
   - Expected: Steady progress

5. **Update Project 5: Training**
   - % Complete: 45% → 50%
   - Materials: +$10K (course materials)
   - Expected: On track

### **After All Updates**

6. **Go to Program Finances Dashboard**
7. **Observe cumulative impact**:
   - Total Spent: $6.10M → **$6.31M** (+$210K)
   - Total EV: $5.93M → **$6.85M** (+$920K) 🎉
   - **CPI should IMPROVE** (more value delivered per dollar)
   - **SPI should IMPROVE** (catching up on schedule)

### **Expected Program Metrics**
- CPI: 0.97 → **1.05+** (excellent performance!)
- SPI: 0.95 → **1.08+** (ahead of schedule!)
- Status: "At Risk" → **"On Track"** (green) ✅

### **Success Criteria**
- [ ] All 5 projects save successfully
- [ ] Program dashboard aggregates all changes
- [ ] CPI/SPI calculations are accurate
- [ ] Status indicator changes color appropriately
- [ ] No performance issues with multiple updates

---

## 💰 Scenario 4: Cost Category Deep Dive (FINANCE MANAGER)

**Goal**: Analyze and optimize specific cost categories across all projects

### **Focus: AI Services Cost Optimization**

1. **Record current AI costs** for all 5 projects:
   ```
   Customer Portal:     $168,000
   Data Analytics:      $132,000
   Mobile App:          $96,000
   Infrastructure:      $76,000
   Training:            $16,000
   ─────────────────────────────
   Total AI Spend:      $488,000
   ```

2. **Simulate optimization** (switched to cheaper provider):
   - Customer Portal: $168K → **$140,000** (-17% with Mistral)
   - Data Analytics: $132K → **$110,000** (-17%)
   - Mobile App: $96K → **$80,000** (-17%)
   - Infrastructure: $76K → **$63,000** (-17%)
   - Training: $16K → **$13,000** (-17%)

3. **Save all projects** with reduced AI costs

4. **Verify savings**:
   - Total AI reduction: ~$82,000 saved
   - Program Actual Cost decreases
   - CPI improves (same work, lower cost)
   - ROI increases

### **Success Criteria**
- [ ] Can update same category across multiple projects
- [ ] Program totals reflect cumulative savings
- [ ] CPI improves with cost reduction
- [ ] Could export this data for finance report

---

## 🎭 Scenario 5: Project Lifecycle Simulation (END-TO-END)

**Goal**: Simulate full project from start to finish

### **Use: Mobile Application Project**
- Start: 50% complete, $1.2M spent
- Goal: Complete to 100%

### **Phase 1: Mid-Project (Week 1)**
- % Complete: 50% → 60%
- Internal Labor +$80K
- Cloud +$20K
- EV: $1.075M → $1.29M

### **Phase 2: Testing Phase (Week 2-3)**
- % Complete: 60% → 75%
- External Labor +$100K (QA contractors)
- AI Services +$30K (testing with AI)
- EV: $1.29M → $1.6125M

### **Phase 3: Final Push (Week 4)**
- % Complete: 75% → 90%
- Internal Labor +$50K (final sprint)
- Software +$10K (licenses)
- EV: $1.6125M → $1.935M

### **Phase 4: Project Closure (Week 5)**
- % Complete: 90% → **100%** 🎉
- Overhead +$20K (closeout documentation)
- **EV = Budget** ($2.15M)
- **Verify**: Total Actual vs Budget

### **Final Analysis**
- Did project finish under/over budget?
- What was final CPI?
- Lessons learned from cost tracking

### **Success Criteria**
- [ ] Can track project from 50% → 100%
- [ ] EV reaches exactly budget at 100%
- [ ] System handles 100% completion state
- [ ] Final costs reconcile correctly

---

## ⚡ Scenario 6: Emergency Budget Adjustment (URGENT)

**Goal**: Test forecast adjustment when unexpected costs arise

### **Setup: Infrastructure Upgrade Project**
- Budget: $1,600,000
- Actual: $950,000 (at 65% complete)
- Projected to finish on budget

### **Crisis Event**: Critical security vulnerability found

1. **Cost Impact**:
   - External Labor: $237,500 → **$400,000** (+$162.5K security team)
   - Software: $28,500 → **$80,000** (+$51.5K security tools)
   - Equipment: $19,000 → **$50,000** (+$31K hardware upgrades)
   
2. **New Actual Cost**: $950K → **$1,195K** (+$245K)

3. **Update Forecast**:
   - Go to "Forecasting" tab
   - Original: $1,580,000
   - New Forecast: **$1,850,000** (based on new burn rate)
   - Variance: +$250,000 overrun 🚨

4. **Update % Complete**: 65% → 68% (work on security adds 3%)

5. **Save** and verify

### **Program Manager Review**
6. **Go to Program Dashboard**
7. **Check impact**:
   - Program Forecast: increased by $245K
   - Program CPI: decreased (overspending)
   - Program VAC: increased (bigger overrun)
   - **Decision needed**: Reallocate budget or accept overrun?

### **Success Criteria**
- [ ] Forecast adjustment reflects reality
- [ ] System tracks both actual and forecast clearly
- [ ] Program dashboard shows increased risk
- [ ] Could justify overrun to stakeholders with this data

---

## 🔄 Scenario 7: Cost Reallocation (OPTIMIZATION)

**Goal**: Move budget between projects based on performance

### **Observation**
- Customer Portal: Over budget, needs +$150K
- Training Platform: Under budget, has $150K surplus

### **Test Reallocation**

1. **Training Platform**:
   - Current Budget: $400,000
   - Reduce to: **$300,000** (edit project budget field)
   - Freed up: $100,000

2. **Customer Portal**:
   - Current Budget: $3,500,000  
   - Increase to: **$3,600,000** (add freed budget)
   - Verify Remaining Budget improves

3. **Verify Program Level**:
   - Total Budget: $10.45M (unchanged)
   - But allocation shifted between projects
   - CPI should improve for Customer Portal
   - Training Platform status still "On Track"

### **Success Criteria**
- [ ] Budget changes don't break calculations
- [ ] Program total remains constant
- [ ] Individual project metrics recalculate
- [ ] Realistic budget governance scenario

---

## 📊 Scenario 8: Monthly Executive Report (REPORTING)

**Goal**: Generate data for monthly executive review

### **Test Monthly Workflow**

1. **Update all 5 projects** with month-end actuals:
   - Enter all invoices received this month
   - Update labor costs from timesheets
   - Record cloud/AI usage costs
   - Update % complete for each project

2. **Review Program Dashboard**:
   - Screenshot Budget Summary
   - Screenshot EVM Metrics
   - Screenshot ROI Analysis
   - Note: CPI, SPI, VAC trends

3. **Key Questions to Answer**:
   - [ ] Is program on track? (CPI > 0.95, SPI > 0.95)
   - [ ] Will we finish under budget? (VAC positive?)
   - [ ] What's the ROI? (79.4% expected)
   - [ ] Which projects are at risk?
   - [ ] What corrective actions needed?

4. **Test Forecasting**:
   - Review EAC (Estimate at Completion)
   - Compare to manual forecasts
   - Adjust forecasts if needed
   - Document variances

### **Expected Deliverables**
- Program status: Green/Yellow/Red
- Cost performance trend
- Schedule performance trend
- Forecast accuracy
- Action items for next month

### **Success Criteria**
- [ ] All metrics calculate correctly
- [ ] Data tells clear story (on track vs at risk)
- [ ] Could present this to executives
- [ ] Identifies problems early

---

## 🎓 Scenario 9: New Project Manager Onboarding (UX TEST)

**Goal**: Test if new user can understand and use the system

### **Persona**: Junior PM, first time using ADPA financials

1. **Navigate** to Mobile Application project (50% complete)
2. **Click** "Financials" tab
3. **Questions to answer** (without instructions):
   - What's my budget? _(Should be obvious: $2.15M)_
   - How much have I spent? _(Should be clear: $1.2M)_
   - How much is left? _(Auto-calculated: $950K)_
   - Am I on track? _(Need to see CPI/SPI indicators)_

4. **Try updating costs**:
   - Can they figure out where to enter new costs?
   - Is it clear what each category means?
   - Do they understand % complete slider?
   - Can they find the save button?

5. **Try forecasting**:
   - Can they set a forecast?
   - Do they understand forecast vs actual?
   - Is the variance clear?

### **UX Evaluation Questions**
- [ ] Is the UI intuitive without training?
- [ ] Are labels clear and self-explanatory?
- [ ] Are calculations transparent (can see formulas)?
- [ ] Are error messages helpful?
- [ ] Is the workflow efficient?

### **Success Criteria**
- [ ] New user can update costs in < 5 minutes
- [ ] No confusion about which fields to edit
- [ ] Clear visual feedback on changes
- [ ] Tooltips/help text adequate

---

## 🔬 Scenario 10: Edge Cases & Validation (QA TEST)

**Goal**: Test boundary conditions and error handling

### **Test A: Zero Costs**
1. Set all cost categories to **$0**
2. Save
3. **Expected**: Total Actual = $0, no errors
4. % Complete still works
5. EV still calculates

### **Test B: 100% Complete**
1. Move slider to **100%**
2. **Expected**: 
   - EV = Budget exactly
   - CPI calculation still works
   - No division by zero errors

### **Test C: 0% Complete**
1. Move slider to **0%**
2. **Expected**:
   - EV = $0
   - SPI calculation handles it
   - No crashes

### **Test D: Negative Variance**
1. Set Forecast < Budget
2. **Expected**:
   - Variance shows negative (green)
   - "Under budget" indicator
   - No UI weirdness

### **Test E: Huge Numbers**
1. Enter $50,000,000 in Internal Labor
2. **Expected**:
   - Formats correctly
   - No number overflow
   - Saves properly
   - Program dashboard handles it

### **Test F: Rapid Changes**
1. Change multiple fields quickly
2. Don't save
3. Refresh page
4. **Expected**: Changes lost (unsaved)
5. No corrupted state

### **Test G: Concurrent Edits** (Advanced)
1. Open project in 2 browser tabs
2. Edit costs in Tab 1, save
3. Edit different costs in Tab 2, save
4. **Expected**: Last write wins (no data loss)

### **Success Criteria**
- [ ] No crashes on edge cases
- [ ] Validation prevents invalid data
- [ ] Error messages are clear
- [ ] System handles extreme values
- [ ] Data integrity maintained

---

## 🎯 Scenario 11: Cost vs Schedule Trade-off (STRATEGIC)

**Goal**: Test adjusting schedule to reduce costs

### **Setup: Data Analytics Platform**
- Budget: $2,800,000
- Current: 55% complete, $1,650,000 spent
- Burning through budget too fast (CPI = 0.93)

### **Scenario**: Reduce contractor usage to save money

1. **Current State**:
   - External Labor: $412,500
   - % Complete: 55%
   - On pace to overspend

2. **Decision**: Reduce external contractors, slow down

3. **Update (Month 1)**:
   - External Labor: $412,500 → **$450,000** (+$37.5K final sprint)
   - Internal Labor: $660,000 → **$680,000** (+$20K overtime)
   - % Complete: 55% → **58%** (slower progress)

4. **Forecast Adjustment**:
   - New burn rate is sustainable
   - Forecast: $2,900,000 → **$2,850,000** (will finish closer to budget)
   - Trade-off: 2 weeks later, but under budget

### **Analysis**
- **Before**: Fast pace, over budget
- **After**: Slower pace, on budget
- CPI improves: 0.93 → 0.98
- SPI decreases: 1.10 → 1.02
- **Trade-off accepted**: Cost control > Speed

### **Success Criteria**
- [ ] System shows impact of strategic decisions
- [ ] Trade-offs are visible in metrics
- [ ] Can model "what-if" scenarios
- [ ] Supports data-driven decision making

---

## 🚀 Scenario 12: Project Acceleration (CRISIS MODE)

**Goal**: Crash schedule by adding resources

### **Setup: Infrastructure Upgrade**
- Behind schedule (SPI = 0.88)
- Need to catch up fast

### **Strategy**: Add contractors to accelerate

1. **Baseline**:
   - % Complete: 65%
   - External Labor: $237,500
   - Timeline: 3 months remaining

2. **Acceleration Plan**:
   - External Labor: $237,500 → **$450,000** (+$212.5K contractor surge)
   - Equipment: $19,000 → **$50,000** (+$31K additional servers)
   - % Complete: 65% → **80%** (2 weeks of intensive work)

3. **Update Forecast**:
   - Will finish early but over budget
   - Forecast: $1,580,000 → **$1,720,000** (+$140K overrun)
   - But delivers 2 weeks early (schedule value)

### **Program Decision**
- Overrun acceptable to meet critical deadline
- Document in Forecasting tab rationale
- Track in Program Dashboard

### **Success Criteria**
- [ ] Can model resource acceleration
- [ ] Cost vs schedule trade-off visible
- [ ] Justifiable to stakeholders
- [ ] Actual results trackable

---

## 🔍 Scenario 13: Audit Trail & Compliance (GOVERNANCE)

**Goal**: Ensure changes are traceable for audits

### **Test Audit Requirements**

1. **Make a series of changes** to Customer Portal:
   - Week 1: Update costs, save
   - Week 2: Update costs again, save
   - Week 3: Update % complete, save

2. **Questions an auditor would ask**:
   - [ ] Who made each change?
   - [ ] When were changes made?
   - [ ] What was changed (before/after)?
   - [ ] Why was it changed?
   - [ ] Was change approved?

3. **Check audit_logs table** (via SQL or admin panel):
   ```sql
   SELECT * FROM audit_logs 
   WHERE resource_type = 'project' 
   AND resource_id = 'd031a664-3613-4f7d-a29a-7435735cb008'
   ORDER BY created_at DESC;
   ```

4. **Verify audit trail captures**:
   - Timestamp of change
   - User who made change
   - Old values
   - New values
   - Action type (update)

### **Success Criteria**
- [ ] All financial updates are logged
- [ ] Audit trail is complete and accurate
- [ ] Could reconstruct change history
- [ ] Meets compliance requirements

---

## 🎨 Scenario 14: UI/UX Stress Test (PERFORMANCE)

**Goal**: Test responsiveness and user experience

### **Test A: Rapid Input**
1. Open Financials tab
2. Type numbers quickly in all 8 fields
3. **Expected**: No lag, responsive

### **Test B: Large Data Set**
1. Enter max values ($99,999,999)
2. **Expected**: Formats correctly, no overflow

### **Test C: Mobile Responsiveness** (if applicable)
1. Open on mobile device or narrow browser
2. **Expected**: Layout adapts, usable

### **Test D: Tab Switching**
1. Switch between Cost/Progress/Forecasting tabs rapidly
2. **Expected**: No data loss, smooth transitions

### **Test E: Refresh During Edit**
1. Make changes (don't save)
2. Refresh page
3. **Expected**: Unsaved changes lost (expected)
4. No corrupted state

### **Success Criteria**
- [ ] Fast, responsive UI
- [ ] No visual glitches
- [ ] Data persists correctly
- [ ] Good user experience

---

## 🎯 Recommended Test Order

### **Phase 1: Validation (30 min)**
1. ✅ Scenario 1: Weekly Update (basic functionality)
2. ✅ Scenario 9: UX Test (usability)
3. ✅ Scenario 10: Edge Cases (stability)

### **Phase 2: Business Scenarios (45 min)**
4. ✅ Scenario 2: Budget Overrun (critical path)
5. ✅ Scenario 3: Multi-Project (program view)
6. ✅ Scenario 5: Project Lifecycle (realistic)

### **Phase 3: Advanced (30 min)**
7. ✅ Scenario 4: Category Optimization (analysis)
8. ✅ Scenario 6: Strategic Trade-offs (decision support)
9. ✅ Scenario 12: Project Acceleration (crisis)

### **Phase 4: Compliance (15 min)**
10. ✅ Scenario 8: Monthly Reporting (routine)
11. ✅ Scenario 13: Audit Trail (governance)

---

## 📋 Test Results Template

```markdown
## Test Session: [Date/Time]

### Scenario Tested: [Name]

**Starting State**:
- Project: [Name]
- Budget: $X
- Actual: $Y
- % Complete: Z%

**Actions Taken**:
1. Updated [field] from $A to $B
2. Updated [field] from C% to D%
3. Saved changes

**Results**:
- ✅ Expected: [What should happen]
- ✅ Actual: [What did happen]
- ✅ Match: YES/NO

**Issues Found**:
- [List any bugs, UX issues, or unexpected behavior]

**Suggestions**:
- [Any improvements or enhancements]

**Overall Rating**: ⭐⭐⭐⭐⭐ (1-5 stars)
```

---

## 🎯 **Quick Start: Top 3 Critical Tests**

### **Test 1: Basic Update** (5 min)
Customer Portal → Financials → Change one cost → Save → Verify

### **Test 2: Progress Update** (3 min)  
Any project → Financials → Move % slider → Save → Check EV

### **Test 3: Program Impact** (5 min)
Update 2 projects → Go to Program Finances → Verify totals updated

---

**Which scenario would you like to start with? Or should I guide you through Scenario 1 (Weekly Cost Update) step-by-step?** 🎯

I'm ready to help you test and can provide specific instructions for each scenario! Let me know which one interests you most or if you'd like to try something different.
