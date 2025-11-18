# Review Scheduling & Compliance Workflow

## Overview

The Review Scheduling system enables organizations to establish and maintain regular review cadences for portfolios and programs, ensuring compliance with PMI Portfolio Performance Management standards. The system tracks monthly and quarterly reviews, monitors compliance, and provides visibility into review history and upcoming meetings.

---

## System Components

### 1. **Review Types**

The system supports four standard review types:

- **Portfolio Performance Review**: High-level portfolio health, alignment with strategic objectives, and resource allocation
- **Program Performance Review**: Program-level progress, milestone achievement, and risk management
- **Strategic Review**: Strategic alignment, business value delivery, and long-term planning (see detailed guide below)
- **Governance Review**: Governance processes, decision-making effectiveness, and compliance with standards

**📋 Architectural Note**: In ADPA, **Programs = Portfolios** (there is no separate portfolios entity). Therefore, Portfolio Performance reviews are scheduled at the program level. This is intentional and aligns with the current data model. When a separate portfolios entity is implemented in the future, Portfolio Performance reviews will migrate to the portfolio level.

### 2. **Review Frequency Options**

- **Monthly**: For active portfolios/programs requiring frequent oversight
- **Quarterly**: Standard cadence for stable portfolios/programs
- **Bi-Annually**: Semi-annual reviews for low-risk initiatives
- **Annually**: Annual reviews for long-term strategic initiatives

**PMI Recommendation**: Monthly for active portfolios, quarterly for stable ones.

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVIEW SCHEDULING WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

1. CONFIGURE SCHEDULE
   └─> Define Review Type, Frequency, Day/Time
       └─> Set Reminders & Auto-Generate Agenda (optional)

2. SCHEDULE MEETINGS
   └─> Create Individual Review Meetings
       └─> Set Date, Time, Duration, Attendees

3. CONDUCT REVIEWS
   └─> Hold Review Meeting
       └─> Document Decisions & Action Items

4. TRACK COMPLIANCE
   └─> Mark Reviews as Completed
       └─> Monitor On-Time Rate & Completion Rate
           └─> Achieve PMI Compliance (3+ completed reviews)
```

---

## Detailed Workflow Steps

### **Step 1: Configure Review Schedule**

**Location**: Reviews Tab → Schedule Sub-tab

**Purpose**: Establish the recurring review cadence for a program.

**Process**:

1. **Select Review Type**
   - Choose from: Portfolio Performance, Program Performance, Strategic, or Governance
   - Each program can have multiple review types (e.g., monthly Program Performance + quarterly Strategic)
   - **Note**: Portfolio Performance reviews are scheduled at the program level because Programs serve as Portfolios in ADPA's current architecture

2. **Set Frequency**
   - Select: Monthly, Quarterly, Bi-Annually, or Annually
   - **PMI Best Practice**: Monthly for active programs, quarterly for stable ones

3. **Configure Schedule Timing**
   - **Option A - Day of Month**: Specify day (1-31), e.g., "15th of each month"
   - **Option B - Day of Week**: Specify weekday, e.g., "First Monday of each month"
   - ⚠️ **Note**: You must specify either day of month OR day of week (not both)

4. **Set Duration**
   - Default: 60 minutes
   - Adjust based on review complexity (15-480 minutes)

5. **Configure Reminders** (Optional)
   - Enable email reminders
   - Set reminder days: e.g., "7 days before" and "1 day before"
   - Multiple reminders supported (comma-separated: `7, 1`)

6. **Additional Options**
   - **Auto-generate Agenda**: Automatically create agenda items for each review
   - **Active Schedule**: Enable/disable the schedule (disable to pause reviews)

7. **Save Schedule**
   - Click "Save Schedule"
   - Schedule is now active and will appear in Compliance dashboard

8. **Generate Upcoming Meetings** (Optional - Automatic Scheduling)
   - After saving a schedule, click "Generate Upcoming Meetings" button
   - System automatically creates meetings for the next 3 months based on:
     - Frequency (monthly = 3 meetings, quarterly = 1 meeting, etc.)
     - Day of month or day of week settings
     - Duration from schedule
   - Meetings are created with status "Scheduled"
   - Skips dates where meetings already exist
   - **Note**: This is a manual trigger - automatic daily generation can be configured

**Example Configuration**:
```
Review Type: Program Performance
Frequency: Monthly
Day of Month: 15
Duration: 60 minutes
Reminders: 7 days, 1 day before
Auto-generate Agenda: Yes
Active: Yes
```

---

### **Step 2: Schedule Review Meetings**

**Location**: Reviews Tab → Calendar Sub-tab (or Schedule Tab → Generate Button)

**Purpose**: Create individual review meeting instances based on the schedule.

**Two Methods to Schedule Meetings**:

### **Method A: Automatic Generation (Recommended)**

1. **After Configuring Schedule**
   - Go to Schedule Tab
   - Click "Generate Upcoming Meetings" button
   - System automatically creates meetings for next 3 months based on:
     - Frequency (monthly = 3 meetings, quarterly = 1 meeting)
     - Day of month (e.g., 15th) or day of week (e.g., Monday)
     - Duration from schedule
   - Meetings appear in Calendar view automatically
   - **Advantage**: Fast, consistent, follows schedule exactly

### **Method B: Manual Scheduling**

1. **Access Calendar View**
   - Navigate to Reviews Tab → Calendar
   - View monthly calendar with scheduled reviews

2. **Create New Review Meeting**
   - Click "Schedule Review" button (top right)
   - **Note**: Button is enabled when at least one schedule exists

3. **Select Review Type** (Required for new meetings)
   - **Review Type Dropdown**: Select which review schedule this meeting belongs to
   - Options show: "Review Type (Frequency)", e.g., "Program Performance (Monthly)"
   - Only shows schedules that are configured and active
   - **Why this matters**: Each review type has its own compliance tracking
   - Duration automatically updates based on selected schedule

4. **Fill Meeting Details**
   - **Scheduled Date**: Select date (defaults to today)
   - **Start Time**: Set meeting start time (default: 9:00 AM)
   - **Duration**: Meeting duration in minutes (defaults to selected schedule duration)
   - **End Time**: Auto-calculated from start time + duration
   - **Status**: Defaults to "Scheduled"
   - **Notes**: Optional meeting notes or agenda items

5. **Save Meeting**
   - Click "Create Meeting" (disabled until review type is selected)
   - Meeting appears on calendar
   - Meeting is associated with the selected review type's schedule

**How Review Type Selection Works**:
- When you have multiple review schedules (e.g., Monthly Program Performance + Quarterly Strategic), you must select which type of review you're scheduling
- The system uses this to:
  - Associate the meeting with the correct schedule
  - Track compliance separately for each review type
  - Apply the correct duration and settings from that schedule
- **Important**: Each review type maintains its own compliance metrics independently

**Meeting Status Options**:
- **Scheduled**: Meeting is planned but not yet held
- **In Progress**: Meeting is currently happening
- **Completed**: Meeting has been held
- **Cancelled**: Meeting was cancelled
- **Postponed**: Meeting was rescheduled

---

### **Step 3: Conduct Review Meeting**

**Location**: Reviews Tab → Calendar Sub-tab → Click on Meeting

**Purpose**: Hold the actual review meeting and document outcomes.

**Process**:

1. **Before the Meeting**
   - Review agenda (if auto-generated)
   - Prepare materials (reports, dashboards, metrics)
   - Confirm attendees

2. **During the Meeting**
   - Discuss agenda items
   - Review program/project status
   - Make decisions
   - Identify action items

3. **After the Meeting**
   - Open the meeting in Calendar view
   - Update meeting details:
     - **Status**: Change to "Completed"
     - **Actual Date**: If different from scheduled date
     - **Was On Time**: Mark Yes/No (was meeting held on scheduled date?)
     - **Was Complete**: Mark Yes/No (were all agenda items covered?)
     - **Notes**: Document key decisions, outcomes, action items
   - **Create Decisions** (optional):
     - Click "Add Decision" (if implemented)
     - Record decision type (approve, reject, defer, modify, escalate)
     - Document affected projects/programs
   - **Create Action Items** (optional):
     - Click "Add Action Item"
     - Assign to team member
     - Set due date and priority

4. **Save Changes**
   - Click "Update Meeting"
   - Compliance metrics automatically update

---

### **Step 4: Track Compliance**

**Location**: Reviews Tab → Compliance Sub-tab

**Purpose**: Monitor review cadence compliance and PMI standards adherence.

**What You'll See**:

1. **Compliance Cards** (one per review type)
   - **Review Type**: e.g., "Program Performance Reviews"
   - **Frequency**: e.g., "Monthly"
   - **Status Badge**: 
     - 🟢 **On Track**: Reviews are being held on schedule
     - 🔴 **Overdue**: Last review was beyond the frequency window
     - ⚪ **No Reviews**: No reviews have been scheduled yet

2. **Key Metrics**
   - **Total Reviews**: Number of review meetings scheduled
   - **On-Time Rate**: Percentage of reviews held on scheduled date
   - **Completion Rate**: Percentage of reviews marked as completed
   - **Completed Reviews**: Count of reviews with status = "completed"

3. **Date Tracking**
   - **Last Review Date**: Date of most recent completed review
   - **Next Review Due**: Calculated based on frequency and last review date

4. **PMI Compliance Status**
   - **Compliant** (Green Badge): 
     - Status = "on-track"
     - Total reviews ≥ 3
     - Completed reviews ≥ 3
   - **Needs Reviews** (Gray Badge): 
     - Less than 3 completed reviews
     - Or reviews not being held on schedule

**Progress Indicator**:
- Shows progress bar: "X / 3 completed reviews"
- Indicates how many more completed reviews needed for PMI compliance

---

## Tab-by-Tab Guide

### **Schedule Tab**

**Purpose**: Configure recurring review schedules.

**Key Actions**:
- Create/edit review schedules
- Set frequency and timing
- Configure reminders
- Enable/disable schedules

**When to Use**:
- Initial setup for a new program
- Changing review frequency
- Adding new review types
- Modifying schedule settings

---

### **Calendar Tab**

**Purpose**: View and manage individual review meetings.

**Key Features**:
- Monthly calendar view
- Color-coded status indicators
- Click to view/edit meetings
- Schedule new meetings

**When to Use**:
- Scheduling upcoming reviews
- Viewing review history
- Updating meeting details
- Marking reviews as completed

**Calendar Legend**:
- 🔵 **Blue**: Today's date
- 🟢 **Green**: Completed reviews
- 🟡 **Yellow**: Scheduled/in-progress reviews
- ⚪ **Gray**: Past dates

---

### **Compliance Tab**

**Purpose**: Monitor compliance with review cadence requirements.

**Key Features**:
- Compliance status per review type
- On-time and completion rates
- PMI compliance tracking
- Progress indicators
- Actionable guidance

**When to Use**:
- Monitoring compliance status
- Identifying overdue reviews
- Tracking progress toward PMI compliance
- Reviewing metrics and trends

---

## Complete Workflow Example

### **Scenario**: Setting up Monthly Program Performance Reviews

**Step 1: Configure Schedule**
1. Navigate to Program → Reviews Tab → Schedule
2. Select Review Type: "Program Performance"
3. Set Frequency: "Monthly"
4. Set Day of Month: "15"
5. Set Duration: "60 minutes"
6. Enable Reminders: "7 days, 1 day before"
7. Click "Save Schedule"

**Step 2: Schedule First Review**
1. Go to Calendar Tab
2. Click "Schedule Review"
3. Set Date: "January 15, 2025"
4. Set Time: "9:00 AM"
5. Set Duration: "60 minutes"
6. Click "Create Meeting"

**Step 3: Conduct Review**
1. Hold meeting on January 15
2. Go to Calendar → Click on January 15 meeting
3. Change Status: "Completed"
4. Mark "Was On Time": Yes
5. Mark "Was Complete": Yes
6. Add notes: "Discussed Q1 progress, approved budget increase"
7. Click "Update Meeting"

**Step 4: Schedule Next Review**
1. Go to Calendar Tab
2. Click "Schedule Review"
3. Set Date: "February 15, 2025"
4. Set Time: "9:00 AM"
5. Click "Create Meeting"

**Step 5: Monitor Compliance**
1. Go to Compliance Tab
2. View "Program Performance Reviews" card:
   - Status: "On Track" ✅
   - Total Reviews: 2
   - Completed Reviews: 1
   - On-Time Rate: 100%
   - Completion Rate: 50%
   - Progress: "1 / 3 completed reviews"
3. Continue scheduling and completing reviews until you reach 3+ completed reviews for PMI compliance

---

## Best Practices

### **Scheduling Best Practices**

1. **Set Realistic Frequencies**
   - Monthly for critical/active programs
   - Quarterly for stable programs
   - Don't over-schedule (leads to meeting fatigue)

2. **Consistent Timing**
   - Use same day/time each period (e.g., "3rd Monday at 2 PM")
   - Makes scheduling predictable for attendees

3. **Buffer Time**
   - Schedule reviews with buffer before major deadlines
   - Allows time to address issues before they become critical

4. **Multiple Review Types**
   - Use different frequencies for different types
   - Example: Monthly Program Performance + Quarterly Strategic

### **Meeting Management Best Practices**

1. **Always Mark as Completed**
   - Update status immediately after meeting
   - Accurate compliance tracking depends on this

2. **Document Outcomes**
   - Add notes with key decisions
   - Create action items with owners and due dates
   - Record decisions affecting projects/programs

3. **Track On-Time Performance**
   - Honest assessment of whether reviews were held on schedule
   - Helps identify scheduling issues

4. **Use Actual Date**
   - If meeting was rescheduled, update actual date
   - Helps track true review cadence

### **Compliance Best Practices**

1. **Aim for 3+ Completed Reviews**
   - PMI compliance requires at least 3 completed reviews
   - Shows consistent review cadence

2. **Maintain On-Time Rate**
   - Target 80%+ on-time rate
   - Indicates schedule adherence

3. **Regular Monitoring**
   - Check Compliance tab monthly
   - Address overdue reviews promptly

4. **Review Schedule Adjustments**
   - If reviews consistently overdue, consider adjusting frequency
   - Better to have realistic schedule than constant delays

---

## Common Scenarios

### **Scenario 1: New Program Setup**

**Goal**: Establish monthly program performance reviews.

**Steps**:
1. Configure schedule (Monthly, Day 15, 60 min)
2. Schedule first review for next month
3. Set reminders (7 days, 1 day)
4. Enable auto-generate agenda

**Result**: System will track compliance after first review is completed.

---

### **Scenario 2: Quarterly Strategic Review**

**Goal**: Add quarterly strategic reviews to existing monthly program reviews.

**Steps**:
1. Go to Schedule tab
2. Create new schedule:
   - Type: Strategic Review
   - Frequency: Quarterly
   - Day of Month: 1 (first of quarter)
3. Schedule first review for next quarter
4. Both schedules now tracked separately in Compliance tab

**Result**: Two independent review cadences tracked simultaneously.

---

### **Scenario 3: Review Was Postponed**

**Goal**: Handle a review that was rescheduled.

**Steps**:
1. Go to Calendar → Find original meeting
2. Change status to "Postponed"
3. Create new meeting with new date
4. After new meeting, mark as "Completed"
5. Update "Actual Date" to when it was actually held

**Result**: Compliance tracking reflects actual review cadence.

---

### **Scenario 4: Achieving PMI Compliance**

**Goal**: Reach PMI compliance status.

**Steps**:
1. Complete 3+ reviews (mark as "Completed")
2. Ensure reviews are held on schedule (mark "Was On Time")
3. Check Compliance tab:
   - Status should show "On Track"
   - Completed Reviews ≥ 3
   - PMI Compliance Badge turns green "Compliant"

**Result**: Program meets PMI Portfolio Performance Management standards.

---

## Troubleshooting

### **Issue: "Schedule Review" Button is Disabled**

**Cause**: No review schedule configured.

**Solution**:
1. Go to Schedule tab
2. Configure at least one review schedule
3. Save the schedule
4. Button will be enabled

---

### **Issue: Compliance Shows 0% On-Time Rate**

**Cause**: Reviews not marked as "Was On Time".

**Solution**:
1. Go to Calendar → Open completed reviews
2. Mark "Was On Time" = Yes (if held on scheduled date)
3. Save changes
4. Compliance metrics update automatically

---

### **Issue: PMI Compliance Still Shows "Needs Reviews"**

**Cause**: Less than 3 completed reviews.

**Solution**:
1. Complete at least 3 reviews
2. Mark each as "Completed"
3. Ensure status is "On Track"
4. Compliance badge updates automatically

---

### **Issue: Next Review Due Shows "Not Scheduled"**

**Cause**: No reviews have been completed yet, or last review date is missing.

**Solution**:
1. Complete at least one review
2. Ensure "Actual Date" is set
3. System calculates next due date based on frequency

---

## Integration Points

### **With Other ADPA Features**

1. **Projects**: Review decisions can reference affected projects
2. **Programs**: Review decisions can reference affected programs
3. **Action Items**: Review action items can be tracked separately
4. **Analytics**: Review compliance metrics feed into program analytics
5. **Notifications**: Reminders sent via email notification system

---

## PMI Compliance Requirements

### **PMI Portfolio Performance Management Standards**

**Requirement**: Regular review cadence (monthly/quarterly)

**ADPA Implementation**:
- ✅ Configurable monthly/quarterly schedules
- ✅ Tracking of review frequency adherence
- ✅ Compliance status monitoring
- ✅ On-time rate tracking
- ✅ Completion rate tracking

**Compliance Criteria**:
- At least 3 completed reviews
- Reviews held on schedule (on-time rate)
- Consistent cadence maintained
- Status = "On Track"

**Compliance Badge**:
- 🟢 **Compliant**: Meets all criteria
- ⚪ **Needs Reviews**: Working toward compliance

---

## Summary

The Review Scheduling system provides a complete workflow for:

1. **Configuring** recurring review schedules
2. **Scheduling** individual review meetings
3. **Conducting** and documenting reviews
4. **Tracking** compliance with PMI standards

By following this workflow, organizations can:
- Maintain consistent review cadences
- Track compliance automatically
- Meet PMI Portfolio Performance Management requirements
- Improve program governance and oversight

---

---

## Strategic Review Meetings - Detailed Guide

### **Purpose & Objectives**

Strategic Review meetings are high-level governance sessions focused on ensuring programs and portfolios remain aligned with organizational strategy and deliver expected business value. These reviews answer critical questions:

- **Are we doing the right things?** (Strategic alignment)
- **Are we delivering value?** (Business value realization)
- **Should we continue, pivot, or terminate?** (Portfolio optimization)
- **What's our long-term direction?** (Strategic planning)

### **Typical Frequency**

- **Quarterly** (Recommended): Standard cadence for most programs
- **Bi-Annually**: For stable, low-risk programs
- **Annually**: For long-term strategic initiatives
- **Monthly**: Only for high-stakes, rapidly changing strategic programs

**PMI Best Practice**: Quarterly reviews provide the right balance between oversight and operational efficiency.

---

### **Expected Agenda Items**

#### **1. Strategic Alignment Assessment** (15-20 minutes)

**Discussion Topics**:
- Review program's alignment with organizational strategic objectives
- Assess changes in organizational priorities since last review
- Evaluate strategic fit score (if tracked)
- Identify any misalignment or drift

**Key Questions**:
- Does this program still support our strategic goals?
- Have organizational priorities changed?
- Is the program's strategic justification still valid?

**Expected Outcomes**:
- Decision: Continue / Modify / Escalate / Terminate
- Updated alignment score
- Strategic fit assessment

---

#### **2. Business Value Delivery** (20-25 minutes)

**Discussion Topics**:
- **Expected vs. Realized Benefits**: Compare planned benefits to actual outcomes
- **ROI Analysis**: Financial return on investment
- **Value Metrics**: Customer satisfaction, market impact, competitive advantage
- **Benefit Realization Rate**: Percentage of expected benefits achieved

**Key Questions**:
- What value has this program delivered?
- Are we on track to meet benefit targets?
- What's the actual ROI vs. projected ROI?
- Are stakeholders satisfied with outcomes?

**Expected Outcomes**:
- Benefit realization report
- ROI assessment
- Value delivery scorecard
- Recommendations for value optimization

---

#### **3. Long-Term Planning & Roadmap** (15-20 minutes)

**Discussion Topics**:
- **Future State Vision**: Where should this program be in 6-12 months?
- **Strategic Roadmap**: Upcoming milestones and strategic initiatives
- **Resource Planning**: Long-term resource needs and allocation
- **Market Trends**: External factors affecting strategic direction

**Key Questions**:
- What's the strategic roadmap for the next 6-12 months?
- Are there new opportunities or threats to consider?
- What resources will be needed to achieve strategic goals?
- Should we accelerate, maintain, or decelerate pace?

**Expected Outcomes**:
- Updated strategic roadmap
- Resource allocation decisions
- Strategic initiative prioritization
- Long-term planning decisions

---

#### **4. Portfolio Optimization** (10-15 minutes)

**Discussion Topics**:
- **Program Health**: Overall program status and risk level
- **Resource Conflicts**: Competing demands for resources
- **Dependencies**: Inter-program dependencies and impacts
- **Portfolio Balance**: Is the portfolio well-balanced?

**Key Questions**:
- Should this program continue, be modified, or be terminated?
- Are there resource conflicts with other programs?
- How does this program fit within the overall portfolio?
- Should we reallocate resources to/from this program?

**Expected Outcomes**:
- Go/No-Go / Continue/Modify/Terminate decision
- Resource reallocation decisions
- Portfolio optimization recommendations

---

### **Key Participants**

**Required Attendees**:
- **Program Sponsor** (Executive): Strategic decision-maker
- **Program Manager**: Program status and execution
- **Portfolio Manager**: Portfolio-level perspective
- **Business Owner**: Value delivery and stakeholder perspective

**Optional Attendees**:
- **Strategic Planning Office**: Strategic alignment perspective
- **Finance Representative**: ROI and budget analysis
- **Key Stakeholders**: Business value recipients

---

### **Expected Decisions & Outcomes**

#### **1. Strategic Decisions** (Recorded in `review_decisions` table)

**Decision Types**:
- **Approve**: Continue program as-is
- **Modify**: Change scope, timeline, or resources
- **Defer**: Postpone strategic decisions
- **Escalate**: Raise to executive level
- **Terminate**: End program (strategic misalignment or poor value)

**Decision Criteria**:
- Strategic alignment score
- Business value delivery rate
- ROI and financial performance
- Resource availability
- Market conditions

---

#### **2. Action Items** (Recorded in `review_action_items` table)

**Common Action Items**:
- **Strategic Alignment**: "Update strategic objectives mapping by [date]"
- **Value Optimization**: "Improve benefit realization rate to 80% by [date]"
- **Resource Planning**: "Secure additional resources for Q2 strategic initiative"
- **Stakeholder Engagement**: "Schedule stakeholder value review session"
- **Roadmap Updates**: "Revise strategic roadmap based on market analysis"

**Action Item Tracking**:
- Assigned to specific owner
- Due date set
- Priority level (High/Medium/Low)
- Status tracking (Open/In Progress/Completed)

---

#### **3. Strategic Insights & Recommendations**

**Documented in Meeting Notes**:
- Key strategic insights
- Market trends and implications
- Competitive intelligence
- Risk factors affecting strategy
- Opportunities for strategic advantage

---

### **Success Metrics**

**Strategic Review Effectiveness**:
- **Alignment Score**: Program alignment with strategic objectives (target: ≥80%)
- **Value Delivery Rate**: Benefits realized vs. expected (target: ≥75%)
- **Decision Quality**: Timeliness and impact of strategic decisions
- **Stakeholder Satisfaction**: Satisfaction with strategic direction

**Review Meeting Quality**:
- **On-Time Rate**: Reviews held on scheduled date (target: ≥90%)
- **Completion Rate**: Reviews completed vs. scheduled (target: 100%)
- **Decision Clarity**: Clear, actionable decisions made
- **Action Item Completion**: Action items completed on time (target: ≥80%)

---

### **Documentation Requirements**

**Meeting Documentation**:
1. **Meeting Notes**: Strategic discussion points and insights
2. **Decisions Log**: All strategic decisions with rationale
3. **Action Items**: Assigned actions with owners and due dates
4. **Strategic Assessment**: Alignment and value delivery assessment
5. **Roadmap Updates**: Changes to strategic roadmap

**System Tracking**:
- Meeting status: `scheduled` → `in-progress` → `completed`
- `was_on_time`: Was the review held on the scheduled date?
- `was_complete`: Were all agenda items covered?
- Decisions and action items automatically tracked in database

---

### **Best Practices**

1. **Prepare in Advance**:
   - Review strategic objectives and alignment data
   - Gather benefit realization metrics
   - Prepare ROI analysis
   - Review market trends and competitive landscape

2. **Focus on Strategy, Not Operations**:
   - Avoid diving into project-level details
   - Keep focus on strategic alignment and value
   - Defer operational issues to Program Performance reviews

3. **Make Clear Decisions**:
   - Don't defer decisions unnecessarily
   - Document decision rationale
   - Set clear action items with owners and dates

4. **Track Follow-Through**:
   - Review action items from previous Strategic Review
   - Hold accountable for completion
   - Update strategic roadmap based on decisions

5. **Communicate Outcomes**:
   - Share strategic decisions with stakeholders
   - Update strategic documentation
   - Communicate changes to program teams

---

## How to Prepare a Detailed Strategic Review Agenda

### **Pre-Meeting Preparation Checklist** (1-2 weeks before meeting)

#### **Week 1: Data Gathering**

**Strategic Alignment Data**:
- [ ] Current strategic objectives document
- [ ] Program's strategic objectives mapping
- [ ] Strategic fit/alignment score (if tracked)
- [ ] Changes in organizational priorities since last review
- [ ] Strategic themes and initiatives

**Business Value Data**:
- [ ] Expected benefits register (planned benefits)
- [ ] Realized benefits report (actual benefits achieved)
- [ ] Benefit realization rate calculation
- [ ] ROI analysis (projected vs. actual)
- [ ] Financial performance metrics
- [ ] Stakeholder satisfaction surveys/results
- [ ] Value delivery scorecard

**Performance Data**:
- [ ] Program health dashboard
- [ ] Key performance indicators (KPIs)
- [ ] Milestone achievement status
- [ ] Risk register (strategic risks)
- [ ] Resource utilization reports

**Market & Competitive Intelligence**:
- [ ] Market trends analysis
- [ ] Competitive landscape updates
- [ ] Industry benchmarks
- [ ] External factors affecting strategy

**Portfolio Context**:
- [ ] Portfolio-level metrics
- [ ] Resource conflicts with other programs
- [ ] Inter-program dependencies
- [ ] Portfolio balance assessment

---

#### **Week 2: Analysis & Agenda Preparation**

**Analysis Tasks**:
- [ ] Compare expected vs. realized benefits
- [ ] Calculate ROI variance (actual vs. projected)
- [ ] Assess strategic alignment changes
- [ ] Identify strategic risks and opportunities
- [ ] Review action items from previous Strategic Review

**Agenda Preparation**:
- [ ] Draft agenda items based on data analysis
- [ ] Prioritize discussion topics
- [ ] Allocate time for each agenda item
- [ ] Prepare presentation materials
- [ ] Distribute pre-read materials to attendees

---

### **Strategic Review Agenda Template**

#### **Meeting Header**

```
STRATEGIC REVIEW MEETING
Program: [Program Name]
Date: [Meeting Date]
Time: [Start Time] - [End Time]
Location: [Meeting Location / Video Link]
Duration: [60-90 minutes]

Attendees:
- [Program Sponsor] - Chair
- [Program Manager] - Presenter
- [Portfolio Manager]
- [Business Owner]
- [Other Key Stakeholders]
```

---

#### **Agenda Item 1: Opening & Review of Previous Actions** (5 minutes)

**Purpose**: Set context and review follow-up from last Strategic Review

**Discussion Points**:
- [ ] Welcome and introductions
- [ ] Review of previous Strategic Review action items
  - [ ] Action item status: Completed / In Progress / Not Started
  - [ ] Key outcomes from previous actions
  - [ ] Any blockers or issues

**Expected Outcome**: Clear understanding of progress since last review

**Materials Needed**:
- Previous Strategic Review minutes
- Action item tracking report

---

#### **Agenda Item 2: Strategic Alignment Assessment** (15-20 minutes)

**Purpose**: Evaluate program's alignment with organizational strategy

**Discussion Points**:

**2.1 Current Strategic Objectives** (5 min)
- [ ] Review organizational strategic objectives
- [ ] Identify which objectives this program supports
- [ ] Assess changes in organizational priorities
- [ ] Strategic themes alignment

**2.2 Program Strategic Fit** (5 min)
- [ ] Review strategic fit score (if available)
- [ ] Assess alignment strength (Strong / Moderate / Weak)
- [ ] Identify any strategic drift or misalignment
- [ ] Strategic justification validation

**2.3 Strategic Changes Impact** (5 min)
- [ ] Have organizational priorities changed?
- [ ] Impact of priority changes on program
- [ ] Need for program adjustments

**2.4 Strategic Alignment Decision** (5 min)
- [ ] Continue program as-is?
- [ ] Modify program to improve alignment?
- [ ] Escalate strategic concerns?
- [ ] Consider termination due to misalignment?

**Expected Outcome**: 
- Strategic alignment assessment
- Decision: Continue / Modify / Escalate / Terminate
- Updated alignment score (if applicable)

**Materials Needed**:
- Strategic objectives document
- Program strategic objectives mapping
- Strategic fit scorecard
- Organizational priority changes document

**Key Questions to Answer**:
- ✅ Does this program still support our strategic goals?
- ✅ Have organizational priorities changed?
- ✅ Is the program's strategic justification still valid?
- ✅ What is the strategic alignment score?

---

#### **Agenda Item 3: Business Value Delivery** (20-25 minutes)

**Purpose**: Assess actual value delivered vs. expected value

**Discussion Points**:

**3.1 Benefit Realization Review** (8 min)
- [ ] Expected benefits register (planned benefits)
- [ ] Realized benefits report (actual benefits)
- [ ] Benefit realization rate calculation
- [ ] Benefits variance analysis
- [ ] Reasons for variance (if any)

**3.2 Financial Performance** (7 min)
- [ ] ROI analysis (projected vs. actual)
- [ ] Budget performance (planned vs. spent)
- [ ] Financial value delivered
- [ ] Cost-benefit analysis

**3.3 Value Metrics** (5 min)
- [ ] Customer satisfaction scores
- [ ] Market impact metrics
- [ ] Competitive advantage achieved
- [ ] Stakeholder value perception

**3.4 Value Delivery Decision** (5 min)
- [ ] Is value delivery on track?
- [ ] What actions needed to improve value?
- [ ] Should value targets be adjusted?
- [ ] Continue based on value delivery?

**Expected Outcome**:
- Benefit realization report
- ROI assessment
- Value delivery scorecard
- Recommendations for value optimization

**Materials Needed**:
- Expected benefits register
- Realized benefits report
- ROI analysis spreadsheet
- Financial performance dashboard
- Stakeholder satisfaction survey results
- Value metrics dashboard

**Key Questions to Answer**:
- ✅ What value has this program delivered?
- ✅ Are we on track to meet benefit targets?
- ✅ What's the actual ROI vs. projected ROI?
- ✅ Are stakeholders satisfied with outcomes?

---

#### **Agenda Item 4: Long-Term Planning & Strategic Roadmap** (15-20 minutes)

**Purpose**: Review and update strategic direction for next 6-12 months

**Discussion Points**:

**4.1 Future State Vision** (5 min)
- [ ] Where should this program be in 6 months?
- [ ] Where should this program be in 12 months?
- [ ] Strategic vision alignment
- [ ] Long-term objectives

**4.2 Strategic Roadmap Review** (5 min)
- [ ] Current strategic roadmap
- [ ] Upcoming strategic milestones
- [ ] Strategic initiatives planned
- [ ] Roadmap timeline validation

**4.3 Market Trends & Opportunities** (5 min)
- [ ] Market trends affecting program
- [ ] New opportunities identified
- [ ] Threats or risks from market changes
- [ ] Competitive landscape changes

**4.4 Resource Planning** (5 min)
- [ ] Long-term resource needs
- [ ] Resource allocation decisions
- [ ] Resource availability assessment
- [ ] Resource conflicts resolution

**Expected Outcome**:
- Updated strategic roadmap
- Resource allocation decisions
- Strategic initiative prioritization
- Long-term planning decisions

**Materials Needed**:
- Strategic roadmap document
- Market trends analysis
- Competitive intelligence report
- Resource planning forecast
- Strategic initiatives backlog

**Key Questions to Answer**:
- ✅ What's the strategic roadmap for the next 6-12 months?
- ✅ Are there new opportunities or threats to consider?
- ✅ What resources will be needed to achieve strategic goals?
- ✅ Should we accelerate, maintain, or decelerate pace?

---

#### **Agenda Item 5: Portfolio Optimization** (10-15 minutes)

**Purpose**: Assess program's fit within portfolio and optimize resource allocation

**Discussion Points**:

**5.1 Program Health Assessment** (3 min)
- [ ] Overall program status (Green / Amber / Red)
- [ ] Strategic risk level
- [ ] Program health scorecard

**5.2 Resource Conflicts** (3 min)
- [ ] Resource conflicts with other programs
- [ ] Competing resource demands
- [ ] Resource optimization opportunities

**5.3 Portfolio Balance** (4 min)
- [ ] How does this program fit within portfolio?
- [ ] Portfolio balance assessment
- [ ] Inter-program dependencies
- [ ] Portfolio composition optimization

**5.4 Portfolio Optimization Decision** (5 min)
- [ ] Continue program?
- [ ] Modify program (scope/timeline/resources)?
- [ ] Terminate program?
- [ ] Reallocate resources to/from program?

**Expected Outcome**:
- Go/No-Go / Continue/Modify/Terminate decision
- Resource reallocation decisions
- Portfolio optimization recommendations

**Materials Needed**:
- Program health dashboard
- Portfolio resource allocation report
- Resource conflict analysis
- Portfolio balance assessment
- Inter-program dependency map

**Key Questions to Answer**:
- ✅ Should this program continue, be modified, or be terminated?
- ✅ Are there resource conflicts with other programs?
- ✅ How does this program fit within the overall portfolio?
- ✅ Should we reallocate resources to/from this program?

---

#### **Agenda Item 6: Decisions & Action Items** (10 minutes)

**Purpose**: Document decisions and assign action items

**Discussion Points**:

**6.1 Strategic Decisions Summary** (5 min)
- [ ] Review all decisions made during meeting
- [ ] Document decision rationale
- [ ] Assign decision owners
- [ ] Set decision implementation timeline

**6.2 Action Items Assignment** (5 min)
- [ ] Identify action items from each agenda section
- [ ] Assign action item owners
- [ ] Set due dates
- [ ] Assign priority levels
- [ ] Document action item descriptions

**Expected Outcome**:
- Decisions log (recorded in `review_decisions` table)
- Action items list (recorded in `review_action_items` table)
- Follow-up plan

**Materials Needed**:
- Decisions template
- Action items template
- Action item tracking system

---

#### **Agenda Item 7: Closing & Next Steps** (5 minutes)

**Purpose**: Summarize outcomes and confirm next steps

**Discussion Points**:
- [ ] Summary of key decisions
- [ ] Summary of action items
- [ ] Next Strategic Review date confirmation
- [ ] Communication plan for outcomes
- [ ] Meeting evaluation (optional)

**Expected Outcome**:
- Meeting summary
- Next steps confirmed
- Communication plan agreed

---

### **Agenda Preparation Best Practices**

#### **1. Customize Agenda Based on Program Context**

**For High-Stakes Programs**:
- Add more time for risk assessment
- Include detailed market analysis
- Add competitive intelligence review

**For Stable Programs**:
- Focus on value delivery
- Emphasize strategic alignment
- Streamline portfolio optimization

**For Programs in Transition**:
- Add change management discussion
- Include stakeholder impact assessment
- Review transition roadmap

---

#### **2. Prioritize Agenda Items**

**Must-Have Items** (Always include):
- Strategic alignment assessment
- Business value delivery
- Key decisions

**Should-Have Items** (Include if relevant):
- Long-term planning
- Portfolio optimization
- Market trends

**Nice-to-Have Items** (Include if time permits):
- Detailed competitive analysis
- Stakeholder feedback review
- Lessons learned

---

#### **3. Time Management**

**Recommended Time Allocation**:
- Opening & Previous Actions: 5 min (6%)
- Strategic Alignment: 15-20 min (20-25%)
- Business Value: 20-25 min (25-30%)
- Long-Term Planning: 15-20 min (20-25%)
- Portfolio Optimization: 10-15 min (12-18%)
- Decisions & Actions: 10 min (12%)
- Closing: 5 min (6%)

**Total**: 80-100 minutes

**Time-Saving Tips**:
- Distribute pre-read materials 1 week in advance
- Use dashboards instead of detailed reports
- Focus on decisions, not detailed analysis
- Defer operational details to Program Performance reviews

---

#### **4. Pre-Read Materials**

**Send 1 Week Before Meeting**:
- [ ] Strategic objectives document
- [ ] Benefit realization report
- [ ] ROI analysis summary
- [ ] Program health dashboard
- [ ] Previous Strategic Review minutes

**Purpose**: 
- Allow attendees to review data in advance
- Enable focused discussion during meeting
- Save time on data presentation

---

#### **5. Presentation Materials**

**Prepare Visual Aids**:
- [ ] Strategic alignment scorecard (visual)
- [ ] Benefit realization chart (expected vs. actual)
- [ ] ROI comparison chart
- [ ] Strategic roadmap (visual timeline)
- [ ] Portfolio balance diagram
- [ ] Key decisions summary slide

**Benefits**:
- Faster comprehension
- Better engagement
- Clearer decision-making

---

### **Agenda Item Checklist Template**

Use this checklist when preparing each agenda item:

```
AGENDA ITEM: [Item Name]
Time Allocated: [X minutes]

PREPARATION:
[ ] Data gathered
[ ] Analysis completed
[ ] Materials prepared
[ ] Key questions identified
[ ] Expected outcomes defined

DURING MEETING:
[ ] Discussion points covered
[ ] Key questions answered
[ ] Decisions made
[ ] Action items identified
[ ] Outcomes documented

AFTER MEETING:
[ ] Decisions recorded in system
[ ] Action items assigned
[ ] Follow-up scheduled
[ ] Materials archived
```

---

### **Example: Complete Strategic Review Agenda**

```
STRATEGIC REVIEW MEETING
Program: Digital Transformation Initiative
Date: March 15, 2025
Time: 2:00 PM - 3:30 PM
Duration: 90 minutes

AGENDA:

1. Opening & Review of Previous Actions (5 min)
   - Review Q4 2024 action items
   - Status update on strategic initiatives

2. Strategic Alignment Assessment (20 min)
   - Review organizational strategic objectives
   - Assess program alignment with "Digital First" strategy
   - Evaluate impact of new CEO priorities
   - Strategic alignment decision

3. Business Value Delivery (25 min)
   - Benefit realization: Expected $2M vs. Actual $1.5M
   - ROI: Projected 15% vs. Actual 12%
   - Customer satisfaction: 85% (target: 90%)
   - Value delivery recommendations

4. Long-Term Planning & Roadmap (20 min)
   - Q2-Q4 2025 strategic roadmap review
   - Market trends: AI adoption acceleration
   - Resource needs: Additional 5 FTE for Q3
   - Strategic initiative prioritization

5. Portfolio Optimization (15 min)
   - Program health: Amber (at risk)
   - Resource conflict: 2 developers needed by Program B
   - Portfolio balance: Continue with modifications
   - Resource reallocation decision

6. Decisions & Action Items (10 min)
   - Document strategic decisions
   - Assign action items with owners and dates

7. Closing & Next Steps (5 min)
   - Summary of outcomes
   - Next Strategic Review: June 15, 2025
```

---

### **Using ADPA to Prepare Agenda**

**System Features to Leverage**:

1. **Review Schedule Configuration**:
   - Set up Strategic Review schedule (quarterly/bi-annually)
   - Enable auto-generate agenda (if implemented)
   - Configure reminder notifications

2. **Meeting Preparation**:
   - Access program strategic objectives (if stored)
   - Review benefit realization data
   - Pull ROI and financial metrics
   - Access previous Strategic Review decisions and action items

3. **During Meeting**:
   - Use meeting dialog to document notes
   - Record decisions in `review_decisions` table
   - Create action items in `review_action_items` table
   - Update meeting status to "in-progress" → "completed"

4. **After Meeting**:
   - Mark meeting as completed
   - Set `was_on_time` and `was_complete` flags
   - Review compliance dashboard for updated metrics
   - Track action items to completion

---

### **Relationship to Other Review Types**

**Strategic Review vs. Portfolio Performance Review**:
- **Strategic Review**: Focus on "Are we doing the right things?" (strategic alignment)
- **Portfolio Performance Review**: Focus on "How are we performing?" (portfolio health)

**Strategic Review vs. Program Performance Review**:
- **Strategic Review**: High-level strategic direction and value (quarterly/bi-annually)
- **Program Performance Review**: Program execution and milestones (monthly/quarterly)

**Strategic Review vs. Governance Review**:
- **Strategic Review**: Strategic decisions and alignment
- **Governance Review**: Process effectiveness and compliance

**Recommended Review Cadence**:
- **Monthly**: Program Performance Review
- **Quarterly**: Strategic Review + Portfolio Performance Review
- **Bi-Annually**: Governance Review

---

**Last Updated**: 2025-01-17  
**Version**: 1.0  
**Related Documentation**: 
- [PMI Portfolio Performance Management](../roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md)
- [Program Management](../06-features/PROGRAM_MANAGEMENT.md)

