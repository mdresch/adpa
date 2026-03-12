# GitHub Issues Setup Guide

## Quick Start

### Prerequisites

1. **GitHub CLI installed**
   ```bash
   # macOS
   brew install gh
   
   # Linux
   sudo apt-get install gh
   
   # Windows
   choco install gh
   ```

2. **Authenticated with GitHub**
   ```bash
   gh auth login
   # Follow prompts to authenticate
   ```

3. **In your project root directory**
   ```bash
   cd /path/to/adpa
   ```

### Create All Issues

```bash
# Make script executable
chmod +x scripts/create-issues.sh

# Run in dry-run mode first (preview without creating)
./scripts/create-issues.sh --dry-run

# Create all issues
./scripts/create-issues.sh

# Or with custom repository
./scripts/create-issues.sh --repo myorg/adpa-project
```

### Create Issues Verbosely

```bash
# Show detailed output for each issue
./scripts/create-issues.sh --verbose

# Combine options
./scripts/create-issues.sh --dry-run --verbose
```

---

## Manual Alternative: Copy-Paste Issues

If you prefer to create issues manually, copy the JSON from the section below and paste into GitHub's New Issue form.

### Issue 1.1: Startup Dependency Graph

**Title**: `[Phase 1.1] Implement Startup Dependency Graph & Fail-Fast Mode`

**Labels**: `type:infrastructure`, `priority:critical`, `phase:1`

**Body**:
```
## Description
Implement a deterministic initialization order for server startup to prevent race conditions (e.g., workers starting before DB is ready).

## Implementation Notes
- Create `server/src/startup/dependencyGraph.ts`
- Implement `Dependency` interface with `init`, `validate`, and `critical` flag
- Add `FAIL_FAST_MODE` environment variable logic
- Support 6 dependencies: database, redis, neo4j, rabbitmq, ai-providers, workers

## Acceptance Criteria
- [ ] Server refuses to boot if a `critical: true` dependency fails validation
- [ ] Startup summary is printed to console on boot
- [ ] Timeouts are enforced for each dependency initialization (configurable)
- [ ] `npm run dev` completes without 'waiting...' logs
- [ ] Tests passing for dependency graph logic

## Definition of Done
- [ ] Code review approved
- [ ] Tests passing
- [ ] Merged to main
- [ ] Verified in local development

## Story Points: 3
```

---

## GitHub Project Board Setup

After creating issues, organize them into a GitHub Project:

### Option 1: Create Project Board via CLI

```bash
# Create new project
gh project create --owner $(gh repo view --json owner --q .owner.login) \
  --title "ADPA Implementation Plan" \
  --description "12-week technical improvements"

# Get project number
gh project list --owner $(gh repo view --json owner --q .owner.login)

# Add issues to project (bulk)
for issue in {1..34}; do
  gh issue edit $issue --add-project <PROJECT_NUMBER>
done
```

### Option 2: Create Project Board via GitHub UI

1. Go to your repository
2. Click **Projects** tab
3. Click **New project**
4. Name it: "ADPA Implementation Plan"
5. Select **Table** view
6. Add custom fields:
   - Phase (1-5)
   - Story Points (1-12)
   - Status (Todo, In Progress, Done)

### Bulk-Add Issues to Project

```bash
# After creating project, get its number
PROJECT_ID=$(gh project list --json number -q '.[0].number')

# Add all issues
for issue_num in {1..34}; do
  gh project item-add "$PROJECT_ID" --issue "$issue_num"
done
```

---

## Sprint Planning

### Sprint Structure (2 weeks each)

**Sprint 1: Weeks 1-2 (Stabilization)**
- Issues: 1.1, 1.2, 1.3

**Sprint 2: Weeks 3-4 (Test Harness)**
- Issues: 2.1, 2.2, 2.3

**Sprint 3: Weeks 5-6 (Module Refactoring - Part 1)**
- Issues: 3.1, 3.2

**Sprint 4: Weeks 7-8 (Module Refactoring - Part 2 + Observability Start)**
- Issues: 3.3, 4.1, 4.2

**Sprint 5: Weeks 9-10 (Observability Complete + Deployment)**
- Issues: 4.3, 4.4, 4.5

**Sprint 6: Weeks 11-12 (Performance & Polish)**
- Issues: 5.1, 5.2, 5.3, 5.4

### Create GitHub Milestones for Each Sprint

```bash
# Sprint 1: Stabilization
gh milestone create --title "Sprint 1: Stabilization (W1-2)" \
  --description "Weeks 1-2: Startup dependency graph, TLS hardening, health checks"

# Sprint 2: Test Harness
gh milestone create --title "Sprint 2: Test Harness (W3-4)" \
  --description "Weeks 3-4: Jest setup, test doubles, 25-35 critical tests"

# Sprint 3: Module Refactoring Part 1
gh milestone create --title "Sprint 3: Module Refactoring (W5-6)" \
  --description "Weeks 5-6: Route registry, module structure"

# Sprint 4: Module Refactoring Part 2 + Observability Start
gh milestone create --title "Sprint 4: Refactoring + Observability (W7-8)" \
  --description "Weeks 7-8: Repositories, unified health system, logging"

# Sprint 5: Observability + Deployment
gh milestone create --title "Sprint 5: Deployment Pipeline (W9-10)" \
  --description "Weeks 9-10: Prometheus, Pino logging, canary deployment, staging env"

# Sprint 6: Polish
gh milestone create --title "Sprint 6: Performance & Polish (W11-12)" \
  --description "Weeks 11-12: Query optimization, frontend restructure, test coverage"
```

### Assign Issues to Milestones

```bash
# List milestones
gh milestone list

# Assign issue to milestone (example)
gh issue edit 1 --milestone "Sprint 1: Stabilization (W1-2)"
```

---

## Label Management

### Create Custom Labels

```bash
# Phase labels
gh label create phase:1 --color "0052cc" --description "Phase 1: Stabilization"
gh label create phase:2 --color "1f6feb" --description "Phase 2: Test Harness"
gh label create phase:3 --color "a371f7" --description "Phase 3: Module Refactoring"
gh label create phase:4 --color "f85149" --description "Phase 4: Observability"
gh label create phase:5 --color "d1242f" --description "Phase 5: Optimization"

# Type labels
gh label create type:infrastructure --color "0052cc" --description "Infrastructure/Setup"
gh label create type:testing --color "34adc8" --description "Testing related"
gh label create type:refactor --color "a2eeef" --description "Code refactoring"
gh label create type:ops --color "d4c5f9" --description "Operations/DevOps"
gh label create type:devops --color "c5def5" --description "DevOps related"
gh label create type:security --color "d73a49" --description "Security related"
gh label create type:frontend --color "7057ff" --description "Frontend work"
gh label create type:performance --color "ffb500" --description "Performance optimization"

# Priority labels
gh label create priority:critical --color "d73a49" --description "Blocks other work"
gh label create priority:high --color "f85149" --description "Should do soon"
gh label create priority:medium --color "ffb500" --description "Regular priority"
```

---

## Verification & Validation

### Run Validation Script

```bash
chmod +x scripts/validate-issues.sh
./scripts/validate-issues.sh
```

Expected output:
```
✅ All 21 issues created successfully
✅ Phase 1: 3 issues
✅ Phase 2: 3 issues
✅ Phase 3: 3 issues
✅ Phase 4: 5 issues
✅ Phase 5: 4 issues
✅ All issues have proper labels
✅ All issues have story points
```

### Manually Verify Issues

```bash
# List all issues
gh issue list --label phase:1

# Show specific issue
gh issue view 1

# Count issues by phase
gh issue list --label phase:1 --json number | jq length
gh issue list --label phase:2 --json number | jq length
# ... etc
```

---

## Troubleshooting

### Issue: "Not authenticated"
```bash
gh auth logout
gh auth login
# Select "GitHub.com" and authenticate
```

### Issue: "Repository not found"
```bash
# Ensure you're in the correct directory
pwd
cd /path/to/adpa

# Verify Git remote
git remote -v

# Manually specify repo
./scripts/create-issues.sh --repo myorg/adpa-project
```

### Issue: "Permission denied"
```bash
chmod +x scripts/create-issues.sh
```

### Issue: Some issues failed to create
```bash
# Check GitHub API rate limits
gh api rate-limit

# Retry with verbose output
./scripts/create-issues.sh --verbose

# Create issues one at a time if needed
./scripts/create-issues-one-by-one.sh
```

---

## GitHub Workflow Integration

### Automatically Label Issues by Phase

Create `.github/workflows/auto-label.yml`:

```yaml
name: Auto-Label Issues

on:
  issues:
    types: [opened]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v6
        with:
          script: |
            const title = context.payload.issue.title;
            let phase = '';
            
            if (title.includes('[Phase 1')) phase = 'phase:1';
            else if (title.includes('[Phase 2')) phase = 'phase:2';
            else if (title.includes('[Phase 3')) phase = 'phase:3';
            else if (title.includes('[Phase 4')) phase = 'phase:4';
            else if (title.includes('[Phase 5')) phase = 'phase:5';
            
            if (phase) {
              github.rest.issues.addLabels({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                labels: [phase]
              });
            }
```

### Track Project Progress

Create `.github/workflows/progress.yml`:

```yaml
name: Track Progress

on:
  issues:
    types: [closed]
  pull_request:
    types: [closed]

jobs:
  progress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v6
        with:
          script: |
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'all'
            });
            
            const phases = {
              'phase:1': 0,
              'phase:2': 0,
              'phase:3': 0,
              'phase:4': 0,
              'phase:5': 0
            };
            
            issues.data.forEach(issue => {
              issue.labels.forEach(label => {
                if (phases.hasOwnProperty(label.name)) {
                  phases[label.name]++;
                }
              });
            });
            
            console.log('Phase Progress:', phases);
```

---

## Next Steps After Creating Issues

1. ✅ Create all issues using `./scripts/create-issues.sh`
2. ✅ Create GitHub Project board
3. ✅ Add custom labels
4. ✅ Assign issues to sprints/milestones
5. ✅ Organize into project board columns (Todo, In Progress, Done)
6. ✅ Start Sprint 1 planning with team
7. ✅ Assign issues to team members
8. ✅ Set due dates based on Gantt chart
9. ✅ Monitor progress weekly
10. ✅ Update burndown chart

---

## Templates

### Weekly Status Update

Post this as a comment on your project board or wiki:

```markdown
## Weekly Status Update - Week X

### Completed
- ✅ Issue 1.1: Startup Dependency Graph
- ✅ Issue 1.2: TLS Hardening

### In Progress
- 🔄 Issue 1.3: Health Endpoints (80%)
- 🔄 Issue 2.1: Jest Setup (60%)

### Blockers
- 🚫 Issue 3.1 waiting on Issue 3.2 review

### Next Week
- [ ] Complete Phase 1
- [ ] Start Phase 2 testing setup

### Metrics
- Issues Closed: 2/3 (67%)
- Velocity: 8 story points
- Burndown: On track
```

---

## Resources

- **GitHub CLI Docs**: https://cli.github.com
- **GitHub API Docs**: https://docs.github.com/en/rest
- **Project Management**: https://docs.github.com/en/issues/planning-and-tracking-with-projects
- **Issue Templates**: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Ready to use
