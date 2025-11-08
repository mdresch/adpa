# Programmatic Import - Real-World Examples

Comprehensive examples demonstrating how to use the programmatic GitHub Issues importer for various scenarios.

## Prerequisites

All examples assume:
```bash
export GITHUB_TOKEN=ghp_your_token_here
npm install  # Octokit and dependencies installed
```

---

## Example 1: First-Time Sprint Planning

**Scenario**: You're starting fresh with Sprint 1 and want to populate your backlog.

### Step 1: Understand What's Available
```bash
npm run import-issues:stats
```

**Output**:
```
📊 Task Statistics:

By Status:
   Completed: 291
   Planned: 1267
   Backlog: 48

By Priority:
   High: 278
   Medium: 1280
   Low: 48
```

### Step 2: Preview Sprint 1 Tasks
```bash
npm run import-issues:dry-run -- --batch sprint-1
```

**Output**:
```
📋 Import Summary:
   Total tasks in file: 1606
   Filtered tasks: 45
   Target repository: mdresch/adpa
   Dry run: YES

[DRY RUN] Would create issue: TASK-61 - Regression tests: Template output snapshots
[DRY RUN] Would create issue: TASK-64 - UAT scenarios: Template creation
...
```

### Step 3: Create Sprint 1 Milestone in GitHub
```bash
# Using GitHub CLI
gh milestone create "Sprint 1 - Core Features" \
  --description "Foundation features for ADPA" \
  --due-date "2025-12-15"
```

### Step 4: Import to Milestone
```bash
npm run import-issues -- --batch sprint-1 --milestone 1
```

**Result**: 45 issues created and assigned to Sprint 1 milestone.

---

## Example 2: Gradual Backlog Population

**Scenario**: You want to populate your backlog gradually over several days/weeks.

### Week 1: Critical Issues Only
```bash
# Import top 20 critical/high priority tasks
npm run import-issues -- --batch critical-high --limit 20
```

### Week 2: Documentation Sprint
```bash
# Import documentation tasks for a documentation sprint
npm run import-issues -- \
  --labels documentation \
  --status planned \
  --limit 30 \
  --milestone 2
```

### Week 3: Backend Development Focus
```bash
# Import backend tasks with high/medium priority
npm run import-issues -- \
  --labels backend \
  --priority high,medium \
  --status planned \
  --limit 25 \
  --milestone 3
```

### Week 4: Entity Types Implementation
```bash
# Import all entity type development tasks
npm run import-issues -- --batch entity-types --milestone 4
```

---

## Example 3: Team-Based Assignment

**Scenario**: Assign tasks to specific team members based on their expertise.

### Frontend Developer
```bash
# Assign frontend tasks to Alice
npm run import-issues -- \
  --labels frontend \
  --priority high,medium \
  --status planned \
  --limit 15 \
  --assignee alice \
  --milestone 1
```

### Backend Developer
```bash
# Assign backend tasks to Bob
npm run import-issues -- \
  --labels backend \
  --priority high \
  --status planned \
  --limit 20 \
  --assignee bob \
  --milestone 1
```

### AI/ML Engineer
```bash
# Assign AI and search tasks to Charlie
npm run import-issues -- \
  --batch ai-search \
  --limit 15 \
  --assignee charlie \
  --milestone 2
```

### QA Engineer
```bash
# Assign testing tasks to Diana
npm run import-issues -- \
  --batch testing \
  --limit 25 \
  --assignee diana \
  --milestone 1
```

### Tech Lead (Unassigned Review)
```bash
# Create high-priority tasks without assignment for review
npm run import-issues -- \
  --priority high \
  --status planned \
  --limit 30 \
  --milestone 1
# Tech lead assigns manually in GitHub
```

---

## Example 4: Sprint-by-Sprint Rollout

**Scenario**: Plan 6 sprints in advance with progressive feature development.

### Sprint 1: Foundation (2 weeks)
```bash
# Milestone 1: Core features
gh milestone create "Sprint 1: Foundation" --due-date "2025-12-15"

npm run import-issues -- \
  --batch sprint-1 \
  --milestone 1 \
  --labels "sprint-1"
```

### Sprint 2: Entity Types (2 weeks)
```bash
# Milestone 2: Entity development
gh milestone create "Sprint 2: Entity Types" --due-date "2025-12-29"

npm run import-issues -- \
  --batch entity-types \
  --milestone 2 \
  --labels "sprint-2"
```

### Sprint 3: Baseline & Drift (2 weeks)
```bash
# Milestone 3: Baseline management
gh milestone create "Sprint 3: Baseline & Drift" --due-date "2026-01-12"

npm run import-issues -- \
  --batch baseline \
  --milestone 3 \
  --labels "sprint-3"
```

### Sprint 4: AI & Search (3 weeks)
```bash
# Milestone 4: AI features
gh milestone create "Sprint 4: AI & Search" --due-date "2026-02-02"

npm run import-issues -- \
  --batch ai-search \
  --milestone 4 \
  --labels "sprint-4"
```

### Sprint 5: Portfolio (3 weeks)
```bash
# Milestone 5: Portfolio management
gh milestone create "Sprint 5: Portfolio" --due-date "2026-02-23"

npm run import-issues -- \
  --batch portfolio \
  --limit 70 \
  --milestone 5 \
  --labels "sprint-5"
```

### Sprint 6: Testing & Polish (2 weeks)
```bash
# Milestone 6: Production readiness
gh milestone create "Sprint 6: Testing & Polish" --due-date "2026-03-09"

npm run import-issues -- \
  --batch testing \
  --priority high,medium \
  --limit 50 \
  --milestone 6 \
  --labels "sprint-6"
```

---

## Example 5: Feature-Specific Workflow

**Scenario**: You're focusing on a specific feature area and want all related tasks.

### PDF Export Enhancement
```bash
# Find all documentation export tasks
npm run import-issues -- \
  --labels documentation \
  --status planned \
  --priority high \
  --limit 20 \
  --labels "pdf-export"
```

### Template Builder MVP
```bash
# Find all template-related tasks
npm run import-issues -- \
  --labels general \
  --status planned \
  --priority high,medium \
  --limit 30 \
  --labels "template-builder"
```

### Performance Optimization
```bash
# Find all performance-related tasks
npm run import-issues -- \
  --labels backend,frontend \
  --priority high \
  --status planned \
  --limit 15 \
  --labels "performance"
```

---

## Example 6: Emergency Hotfix Sprint

**Scenario**: Critical bugs or urgent features need immediate attention.

### Step 1: Create Emergency Milestone
```bash
gh milestone create "Hotfix Sprint" \
  --description "Critical bugs and urgent features" \
  --due-date "2025-11-20"
```

### Step 2: Import Critical Tasks Only
```bash
npm run import-issues -- \
  --batch critical-high \
  --limit 15 \
  --milestone 7 \
  --labels "hotfix,urgent"
```

### Step 3: Assign to Available Developers
```bash
# View the created issues
gh issue list --milestone "Hotfix Sprint"

# Manually assign or use bulk assignment
gh issue edit 123 --add-assignee alice,bob
```

---

## Example 7: Multi-Repository Deployment

**Scenario**: You have separate repos for frontend, backend, and infrastructure.

### Frontend Repository
```bash
export GITHUB_REPO=adpa-frontend

npm run import-issues -- \
  --labels frontend \
  --status planned \
  --priority high,medium \
  --limit 50
```

### Backend Repository
```bash
export GITHUB_REPO=adpa-backend

npm run import-issues -- \
  --labels backend \
  --status planned \
  --priority high,medium \
  --limit 70
```

### Infrastructure Repository
```bash
export GITHUB_REPO=adpa-infrastructure

npm run import-issues -- \
  --labels security,general \
  --status planned \
  --priority high \
  --limit 20
```

---

## Example 8: Quarterly Planning

**Scenario**: Plan an entire quarter (Q1 2026) with 3-month roadmap.

### January: Foundation
```bash
# Core features + entity types
npm run import-issues -- --batch sprint-1 --milestone 1 --labels "Q1-2026,January"
npm run import-issues -- --batch entity-types --milestone 2 --labels "Q1-2026,January"
```

### February: Advanced Features
```bash
# Baseline + AI
npm run import-issues -- --batch baseline --milestone 3 --labels "Q1-2026,February"
npm run import-issues -- --batch ai-search --milestone 4 --labels "Q1-2026,February"
```

### March: Enterprise & Polish
```bash
# Portfolio + testing
npm run import-issues -- --batch portfolio --limit 70 --milestone 5 --labels "Q1-2026,March"
npm run import-issues -- --batch testing --limit 50 --milestone 6 --labels "Q1-2026,March"
```

---

## Example 9: Selective Import with Custom Filtering

**Scenario**: You need very specific tasks that don't fit predefined batches.

### High-Priority Backend AI Tasks
```bash
npm run import-issues -- \
  --labels "ai,backend" \
  --priority high \
  --status planned \
  --limit 10 \
  --assignee charlie \
  --milestone 2
```

### Medium-Priority Documentation and Testing
```bash
npm run import-issues -- \
  --labels "documentation,testing" \
  --priority medium \
  --status planned \
  --limit 40 \
  --milestone 3
```

### Low-Priority Backlog Items
```bash
npm run import-issues -- \
  --priority low \
  --status backlog \
  --limit 30
# No milestone - for future consideration
```

---

## Example 10: PowerShell (Windows) Workflow

**Scenario**: Windows developer using PowerShell for all operations.

### Setup
```powershell
# Set token permanently in PowerShell profile
notepad $PROFILE
# Add: $env:GITHUB_TOKEN = "ghp_your_token_here"
```

### Daily Workflow
```powershell
# Morning: Check statistics
.\scripts\import-github-issues.ps1 -Stats

# Review what Sprint 1 would create
.\scripts\import-github-issues.ps1 -Batch "sprint-1" -DryRun

# Import Sprint 1
.\scripts\import-github-issues.ps1 -Batch "sprint-1" -Milestone "1"

# Import high-priority tasks for next sprint
.\scripts\import-github-issues.ps1 `
  -Priority "high" `
  -Status "planned" `
  -Limit 30 `
  -Milestone "2"

# Import entity types and assign to team member
.\scripts\import-github-issues.ps1 `
  -Batch "entity-types" `
  -Assignee "alice" `
  -Milestone "2"
```

---

## Example 11: Integration with GitHub Projects

**Scenario**: Combine issue import with GitHub Projects for visual management.

### Step 1: Create Project
```bash
# Create project in GitHub UI or via CLI
gh project create --owner mdresch --name "ADPA Roadmap"
```

### Step 2: Import Issues
```bash
npm run import-issues -- --batch sprint-1 --milestone 1
```

### Step 3: Add Issues to Project
```bash
# Get project number from GitHub
gh project item-add 1 --owner mdresch --url https://github.com/mdresch/adpa/issues/123
```

### Step 4: Organize in Project Views
- Create columns: To Do, In Progress, In Review, Done
- Filter by milestone, labels, or assignee
- Track progress with burndown charts

---

## Example 12: Continuous Import Strategy

**Scenario**: Import tasks continuously as roadmap evolves.

### Week 1: Initial Import
```bash
npm run import-issues -- --batch critical-high --limit 50
```

### Week 2: Add More Tasks
```bash
# Roadmap updated, re-run to get new tasks
npm run import-issues -- --batch sprint-1 --limit 30
```

### Week 3: Adjust Priorities
```bash
# Import newly-prioritized medium tasks
npm run import-issues -- --priority medium --status planned --limit 50
```

### Week 4: Backlog Refinement
```bash
# Import backlog items for future sprints
npm run import-issues -- --status backlog --limit 30
```

---

## Troubleshooting Common Scenarios

### Duplicate Issues
**Problem**: Running the same command twice creates duplicates.

**Solution**: Use issue IDs in titles to detect duplicates, or check existing issues first:
```bash
gh issue list --label roadmap --limit 1000 | grep "TASK-123"
```

### Rate Limiting
**Problem**: Hitting GitHub API rate limits.

**Solution**: The importer handles this automatically with delays. For large imports:
```bash
# Import in smaller batches
npm run import-issues -- --batch sprint-1 --limit 10
# Wait a minute
npm run import-issues -- --batch sprint-1 --limit 10 --offset 10
```

### Wrong Repository
**Problem**: Issues created in wrong repo.

**Solution**: Set repository explicitly:
```bash
export GITHUB_OWNER=your-org
export GITHUB_REPO=your-repo
npm run import-issues -- --batch sprint-1
```

### Milestone Not Found
**Problem**: "Milestone 1 not found" error.

**Solution**: Create milestone first:
```bash
gh milestone create "Sprint 1" --due-date "2025-12-15"
# Note the milestone number (usually 1), then:
npm run import-issues -- --batch sprint-1 --milestone 1
```

---

## Best Practices Summary

1. **Always start with `--dry-run`** to preview
2. **Use `--stats`** to understand task distribution
3. **Import in batches** with `--limit` for control
4. **Create milestones first** before assigning
5. **Tag with sprint labels** for easy filtering
6. **Assign incrementally** to team members
7. **Monitor rate limits** for large imports
8. **Check for duplicates** before re-running
9. **Use meaningful milestone names**
10. **Document your import strategy** for team

---

**Examples Version**: 1.0.0  
**Last Updated**: 2025-11-04  
**See Also**: [Programmatic Import Guide](./PROGRAMMATIC_IMPORT_GUIDE.md) | [Quick Reference](./QUICK_REFERENCE_IMPORT.md)

