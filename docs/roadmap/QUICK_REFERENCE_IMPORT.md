# GitHub Issues Import - Quick Reference

## Setup (One-Time)

```bash
# 1. Get GitHub Token
# Go to: https://github.com/settings/tokens/new
# Scopes: ✅ repo

# 2. Set Environment Variable
export GITHUB_TOKEN=ghp_your_token_here

# 3. Install Dependencies
npm install
```

## Basic Commands

| Task | Command |
|------|---------|
| **View statistics** | `npm run import-issues:stats` |
| **Preview (dry run)** | `npm run import-issues:dry-run -- --batch sprint-1` |
| **Import Sprint 1** | `npm run import-issues -- --batch sprint-1` |
| **Show help** | `npm run import-issues -- --help` |

## Quick Batches

| Batch | Command | Size |
|-------|---------|------|
| **Sprint 1** | `npm run import-issues -- --batch sprint-1` | ~30-50 |
| **High Priority** | `npm run import-issues -- --batch critical-high --limit 50` | 50 |
| **Entity Types** | `npm run import-issues -- --batch entity-types` | ~40-60 |
| **Portfolio** | `npm run import-issues -- --batch portfolio --limit 70` | 70 |
| **AI & Search** | `npm run import-issues -- --batch ai-search` | ~30-40 |
| **Testing** | `npm run import-issues -- --batch testing --limit 50` | 50 |

## Common Patterns

### By Priority
```bash
# High priority only
npm run import-issues -- --priority high --status planned --limit 50

# High and medium
npm run import-issues -- --priority high,medium --status planned --limit 100
```

### By Label
```bash
# Documentation tasks
npm run import-issues -- --labels documentation --status planned --limit 30

# Backend tasks
npm run import-issues -- --labels backend --priority high --limit 20

# AI tasks
npm run import-issues -- --labels ai,search --status planned --limit 30
```

### With Assignment
```bash
# Assign to milestone
npm run import-issues -- --batch sprint-1 --milestone 1

# Assign to user
npm run import-issues -- --batch entity-types --assignee johndoe

# Both
npm run import-issues -- --priority high --milestone 2 --assignee alice --limit 20
```

## Filters Reference

| Filter | Values | Example |
|--------|--------|---------|
| `--batch` | `sprint-1`, `critical-high`, `entity-types`, `portfolio`, `ai-search`, `baseline`, `testing` | `--batch sprint-1` |
| `--priority` | `high`, `medium`, `low` (comma-separated) | `--priority high,medium` |
| `--status` | `planned`, `completed`, `backlog` | `--status planned` |
| `--labels` | Any label (comma-separated) | `--labels "ai,backend"` |
| `--limit` | Number | `--limit 50` |
| `--milestone` | Milestone ID | `--milestone 1` |
| `--assignee` | GitHub username | `--assignee johndoe` |

## Windows PowerShell

| Task | Command |
|------|---------|
| **Statistics** | `.\scripts\import-github-issues.ps1 -Stats` |
| **Dry run** | `.\scripts\import-github-issues.ps1 -Batch "sprint-1" -DryRun` |
| **Import** | `.\scripts\import-github-issues.ps1 -Batch "sprint-1"` |
| **With filters** | `.\scripts\import-github-issues.ps1 -Priority "high" -Limit 50` |

## Workflow Example

```bash
# 1. Check what's available
npm run import-issues:stats

# 2. Preview Sprint 1 tasks
npm run import-issues:dry-run -- --batch sprint-1

# 3. Import Sprint 1 to Milestone 1
npm run import-issues -- --batch sprint-1 --milestone 1

# 4. Import high priority for next sprint
npm run import-issues -- --priority high --status planned --limit 30 --milestone 2

# 5. Import specific technical area
npm run import-issues -- --labels backend --priority high --limit 20
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Token error** | `export GITHUB_TOKEN=ghp_your_token_here` |
| **tsx not found** | `npm install -g tsx` |
| **401 error** | Check token scope (needs `repo`) |
| **422 error** | Create milestone/labels first |

## Statistics Snapshot

Run `npm run import-issues:stats` to see:

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
   ...
```

## Environment Variables

```bash
# Required
export GITHUB_TOKEN=ghp_your_token_here

# Optional (override defaults)
export GITHUB_OWNER=your-username
export GITHUB_REPO=your-repo
```

## Files Location

- **Script**: `scripts/import-github-issues.ts`
- **PowerShell**: `scripts/import-github-issues.ps1`
- **Data**: `docs/roadmap/ROADMAP_TASKS_EXTRACTED.json`
- **CSV**: `docs/roadmap/ROADMAP_TASKS_IMPORT.csv`

## Documentation Links

- 📖 [Comprehensive Guide](./PROGRAMMATIC_IMPORT_GUIDE.md)
- 📊 [Project Summary](./PROJECT_SUMMARY.md)
- 📋 [Import Options](./IMPORT_GUIDE.md)
- 🎯 [Tasks Summary](./ROADMAP_TASKS_SUMMARY.md)

## Support

Need help? Check the [Programmatic Import Guide](./PROGRAMMATIC_IMPORT_GUIDE.md) for detailed documentation.

---

**Quick Reference Version**: 1.0.0  
**Last Updated**: 2025-11-04

