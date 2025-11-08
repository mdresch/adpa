# Programmatic GitHub Issues Import Guide

## Overview

This guide explains how to use the **programmatic GitHub Issues importer** to automatically create issues from the 1,606 extracted roadmap tasks. The importer is built with TypeScript and uses the GitHub REST API via Octokit.

## Features

- ✅ **Batch Import**: Create issues in predefined batches (Sprint 1, entity types, portfolio, etc.)
- ✅ **Flexible Filtering**: Filter by priority, status, labels, or custom criteria
- ✅ **Rate Limit Handling**: Automatic rate limiting and batch processing
- ✅ **Dry Run Mode**: Preview what will be created without making changes
- ✅ **Rich Metadata**: Issues include task ID, source file, effort estimates, and acceptance criteria
- ✅ **Cross-Platform**: Works on Windows (PowerShell), macOS, and Linux
- ✅ **Statistics**: View task distribution before importing

## Prerequisites

### 1. GitHub Personal Access Token

Create a token at: https://github.com/settings/tokens/new

**Required Scopes**:
- `repo` (Full control of private repositories)

**Optional Scopes** (for advanced features):
- `project` (if using GitHub Projects)

### 2. Environment Setup

```bash
# Set your GitHub token (required)
export GITHUB_TOKEN=ghp_your_token_here

# Optional: Override repository settings
export GITHUB_OWNER=your-username
export GITHUB_REPO=your-repo-name
```

**PowerShell (Windows)**:
```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
$env:GITHUB_OWNER = "your-username"
$env:GITHUB_REPO = "your-repo-name"
```

### 3. Install Dependencies

```bash
# Install Octokit (if not already installed)
npm install

# Or install tsx globally for direct script execution
npm install -g tsx
```

## Quick Start

### Option 1: Using npm Scripts (Recommended)

```bash
# View statistics
npm run import-issues:stats

# Dry run (preview without creating)
npm run import-issues:dry-run -- --batch sprint-1

# Import Sprint 1 tasks
npm run import-issues -- --batch sprint-1

# Import high priority tasks (limit 50)
npm run import-issues -- --priority high --status planned --limit 50

# Import entity type tasks with milestone
npm run import-issues -- --batch entity-types --milestone 1
```

### Option 2: Using PowerShell (Windows)

```powershell
# View statistics
.\scripts\import-github-issues.ps1 -Stats

# Dry run
.\scripts\import-github-issues.ps1 -Batch "sprint-1" -DryRun

# Import Sprint 1 tasks
.\scripts\import-github-issues.ps1 -Batch "sprint-1"

# Import with filters
.\scripts\import-github-issues.ps1 -Priority "high" -Status "planned" -Limit 50

# Import with milestone and assignee
.\scripts\import-github-issues.ps1 -Batch "entity-types" -Milestone "1" -Assignee "username"
```

### Option 3: Direct Execution

```bash
# Using tsx directly
tsx scripts/import-github-issues.ts --stats
tsx scripts/import-github-issues.ts --batch sprint-1 --dry-run
tsx scripts/import-github-issues.ts --priority high --status planned --limit 50
```

## Command Reference

### Global Options

| Option | Description | Example |
|--------|-------------|---------|
| `--help`, `-h` | Show help message | `npm run import-issues -- --help` |
| `--stats` | Show task statistics only | `npm run import-issues:stats` |
| `--dry-run` | Preview without creating issues | `npm run import-issues:dry-run` |

### Filtering Options

| Option | Description | Values | Example |
|--------|-------------|--------|---------|
| `--batch <name>` | Import predefined batch | `sprint-1`, `critical-high`, `entity-types`, `portfolio`, `ai-search`, `baseline`, `testing` | `--batch sprint-1` |
| `--priority <level>` | Filter by priority (comma-separated) | `high`, `medium`, `low` | `--priority high,medium` |
| `--status <status>` | Filter by status (comma-separated) | `planned`, `completed`, `backlog` | `--status planned` |
| `--labels <labels>` | Filter by labels (comma-separated) | `documentation`, `ai`, `testing`, `backend`, `frontend`, etc. | `--labels "ai,search"` |
| `--limit <number>` | Limit number of issues | Any positive integer | `--limit 50` |

### Assignment Options

| Option | Description | Example |
|--------|-------------|---------|
| `--milestone <id>` | Assign to milestone | `--milestone 1` |
| `--assignee <username>` | Assign to user | `--assignee johndoe` |

## Predefined Batches

The importer includes predefined batches optimized for sprint planning:

### 1. `sprint-1` - Core Features
**Criteria**: High priority, planned status, documentation/backend/frontend labels  
**Recommended for**: First sprint, foundational features  
**Typical size**: 30-50 tasks

```bash
npm run import-issues -- --batch sprint-1
```

### 2. `critical-high` - High Priority Tasks
**Criteria**: Critical or high priority, planned status  
**Recommended for**: Emergency fixes, urgent features  
**Typical size**: 50-100 tasks

```bash
npm run import-issues -- --batch critical-high --limit 50
```

### 3. `entity-types` - Entity Development
**Criteria**: Entity-types label, planned status  
**Recommended for**: PMBOK entity implementation sprints  
**Typical size**: 40-60 tasks

```bash
npm run import-issues -- --batch entity-types
```

### 4. `portfolio` - Portfolio Management
**Criteria**: Portfolio-management label, planned status  
**Recommended for**: Enterprise PM features  
**Typical size**: 70-100 tasks

```bash
npm run import-issues -- --batch portfolio --limit 70
```

### 5. `ai-search` - AI & Search Features
**Criteria**: AI or search labels, planned status  
**Recommended for**: Advanced AI integration sprints  
**Typical size**: 30-40 tasks

```bash
npm run import-issues -- --batch ai-search
```

### 6. `baseline` - Baseline Management
**Criteria**: Baseline-management label, planned status  
**Recommended for**: Drift detection and baseline features  
**Typical size**: 30-40 tasks

```bash
npm run import-issues -- --batch baseline
```

### 7. `testing` - Testing Tasks
**Criteria**: Testing label, planned status  
**Recommended for**: QA sprints, test coverage improvement  
**Typical size**: 50-100 tasks

```bash
npm run import-issues -- --batch testing
```

## Usage Examples

### Example 1: Sprint Planning Workflow

```bash
# Step 1: Review available tasks
npm run import-issues:stats

# Step 2: Preview Sprint 1 tasks
npm run import-issues:dry-run -- --batch sprint-1

# Step 3: Create Sprint 1 issues and assign to milestone
npm run import-issues -- --batch sprint-1 --milestone 1

# Step 4: Create high-priority issues for next sprint
npm run import-issues -- --priority high --status planned --limit 30 --milestone 2
```

### Example 2: Feature-Specific Import

```bash
# Import all entity type tasks
npm run import-issues -- --batch entity-types

# Import AI-related tasks with custom label
npm run import-issues -- --labels "ai" --status planned --labels "sprint-3"

# Import backend tasks for current sprint
npm run import-issues -- --labels "backend" --priority high,medium --limit 20
```

### Example 3: Team Assignment

```bash
# Assign entity type tasks to developer
npm run import-issues -- --batch entity-types --assignee alice

# Assign frontend tasks to team
npm run import-issues -- --labels "frontend" --status planned --limit 15 --assignee bob

# Assign critical tasks to lead
npm run import-issues -- --priority high --limit 10 --assignee tech-lead
```

### Example 4: Gradual Import

```bash
# Week 1: Import critical tasks only
npm run import-issues -- --batch critical-high --limit 20

# Week 2: Import high priority tasks
npm run import-issues -- --priority high --status planned --limit 30

# Week 3: Import medium priority tasks for specific area
npm run import-issues -- --priority medium --labels "documentation" --limit 50
```

## Issue Format

Each created issue includes:

### Title
The task title from the roadmap (e.g., "Professional PDF templates")

### Body Structure
```markdown
## Task Details

**Task ID**: `TASK-123`
**Source**: CORE_FEATURES_PRIORITY.md
**Section**: Core Features Priority
**Priority**: High
**Status**: Planned
**Effort Estimate**: 3-5 days

---

## Description

[Original task description from roadmap]

---

## Acceptance Criteria

- [ ] Task implementation complete
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

_Generated from ADPA Roadmap Task Extraction_
_Source file: `docs/roadmap/CORE_FEATURES_PRIORITY.md`_
```

### Labels
- Task labels (e.g., `documentation`, `backend`, `ai`)
- Priority label (e.g., `high`, `medium`, `low`)
- Status label (e.g., `status:planned`, `status:completed`)
- `roadmap` label (for all imported tasks)
- Custom labels (if specified)

## Statistics

Run the statistics command to see task distribution:

```bash
npm run import-issues:stats
```

**Sample Output**:
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

By Label:
   general: 823
   portfolio-management: 379
   documentation: 121
   testing: 91
   backend: 70
   entity-types: 57
   frontend: 56
   ai: 58
   search: 40
   baseline-management: 33

Available Batches:
   sprint-1: Core features (high priority, planned)
   critical-high: Critical and high priority tasks
   entity-types: Entity type development
   portfolio: Portfolio management features
   ai-search: AI and search features
   baseline: Baseline management
   testing: Testing tasks
```

## Best Practices

### 1. Always Start with Dry Run
```bash
# Preview before creating
npm run import-issues:dry-run -- --batch sprint-1
```

### 2. Use Limits for Gradual Import
```bash
# Import in smaller batches
npm run import-issues -- --priority high --limit 20
npm run import-issues -- --priority high --limit 20 --offset 20
```

### 3. Tag Issues Appropriately
```bash
# Add sprint labels
npm run import-issues -- --batch sprint-1 --labels "sprint-1,Q1-2025"
```

### 4. Assign to Milestones
```bash
# Create milestone first in GitHub, then:
npm run import-issues -- --batch sprint-1 --milestone 1
```

### 5. Monitor Rate Limits
The importer automatically handles rate limits with batching (10 issues per batch, 1-second delay). For large imports (100+ issues), monitor GitHub API rate limits.

## Troubleshooting

### Issue: "GITHUB_TOKEN environment variable is required"

**Solution**: Set your token:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### Issue: "Failed to create issue: 401 Unauthorized"

**Causes**:
- Token expired
- Token doesn't have `repo` scope
- Token is invalid

**Solution**: Create a new token with correct scopes

### Issue: "Rate limit exceeded"

**Solution**: Wait for rate limit to reset (shown in error message) or reduce batch size

### Issue: "Failed to create issue: 422 Validation Failed"

**Causes**:
- Milestone doesn't exist
- Assignee doesn't have repo access
- Labels don't exist

**Solution**: 
- Create milestone first
- Verify assignee has access
- Pre-create custom labels

### Issue: "tsx: command not found"

**Solution**: Install tsx globally:
```bash
npm install -g tsx
```

## Advanced Usage

### Custom Filtering with Multiple Criteria

```bash
# High priority AI tasks not yet started
npm run import-issues -- \
  --priority high \
  --status planned \
  --labels "ai,backend" \
  --limit 30 \
  --milestone 2

# Documentation tasks for specific source file
npm run import-issues -- \
  --labels "documentation" \
  --status planned \
  --limit 50
```

### Integration with GitHub CLI

After importing, you can use GitHub CLI for additional operations:

```bash
# List all roadmap issues
gh issue list --label roadmap

# View specific issue
gh issue view 123

# Update issue
gh issue edit 123 --add-label "in-progress"

# Close completed issues
gh issue close 123
```

### Bulk Operations

```bash
# Import all planned high-priority tasks in batches
npm run import-issues -- --priority high --status planned --limit 50
npm run import-issues -- --priority medium --status planned --limit 100
npm run import-issues -- --priority low --status planned --limit 50
```

## Migration from Shell Scripts

If you previously used the shell scripts (`create-sprint-1-issues.sh`, etc.), the programmatic importer offers:

### Advantages:
- ✅ No bash/shell required (cross-platform)
- ✅ Better error handling and retry logic
- ✅ Flexible filtering without editing scripts
- ✅ Dry run mode for safety
- ✅ Structured issue bodies with acceptance criteria
- ✅ Progress tracking and batch processing

### Migration Steps:

1. **Inventory existing issues** to avoid duplicates:
```bash
gh issue list --label roadmap --limit 1000 > existing-issues.txt
```

2. **Use dry run** to preview:
```bash
npm run import-issues:dry-run -- --batch sprint-1
```

3. **Import incrementally**:
```bash
npm run import-issues -- --batch sprint-1 --limit 10
# Verify, then continue
npm run import-issues -- --batch sprint-1 --limit 20
```

## Related Documentation

- [IMPORT_GUIDE.md](./IMPORT_GUIDE.md) - CSV import and manual methods
- [ROADMAP_TASKS_SUMMARY.md](./ROADMAP_TASKS_SUMMARY.md) - Strategic overview
- [GITHUB_ISSUES_GENERATION_GUIDE.md](./GITHUB_ISSUES_GENERATION_GUIDE.md) - Original shell script approach
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Complete project summary

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review existing issues: `gh issue list --label roadmap`
3. Create a new issue with details about your problem

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-11-04

