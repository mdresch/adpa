# GitHub Issues Importer

Programmatic importer for ADPA roadmap tasks to GitHub Issues.

## Quick Start

```bash
# 1. Set your GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# 2. Install dependencies
npm install

# 3. View statistics
npm run import-issues:stats

# 4. Dry run
npm run import-issues:dry-run -- --batch sprint-1

# 5. Import
npm run import-issues -- --batch sprint-1
```

## Files

### `import-github-issues.ts`
Main TypeScript importer with full API integration via Octokit.

**Features**:
- Batch import with predefined filters
- Flexible filtering (priority, status, labels)
- Rate limit handling
- Dry run mode
- Progress tracking
- Rich issue metadata

### `import-github-issues.ps1`
PowerShell wrapper for Windows users.

**Features**:
- User-friendly PowerShell interface
- Automatic tsx installation check
- Colorized output
- Parameter validation

## Usage Examples

### Basic Commands

```bash
# Show help
npm run import-issues -- --help

# View statistics
npm run import-issues:stats

# Dry run
npm run import-issues:dry-run -- --batch sprint-1

# Import Sprint 1
npm run import-issues -- --batch sprint-1

# Import high priority tasks (limit 50)
npm run import-issues -- --priority high --status planned --limit 50
```

### Windows PowerShell

```powershell
# View statistics
.\scripts\import-github-issues.ps1 -Stats

# Dry run
.\scripts\import-github-issues.ps1 -Batch "sprint-1" -DryRun

# Import
.\scripts\import-github-issues.ps1 -Batch "sprint-1"

# With filters
.\scripts\import-github-issues.ps1 -Priority "high" -Status "planned" -Limit 50
```

## Available Batches

| Batch | Description | Typical Size |
|-------|-------------|--------------|
| `sprint-1` | Core features (high priority) | 30-50 tasks |
| `critical-high` | Critical/high priority tasks | 50-100 tasks |
| `entity-types` | Entity type development | 40-60 tasks |
| `portfolio` | Portfolio management | 70-100 tasks |
| `ai-search` | AI and search features | 30-40 tasks |
| `baseline` | Baseline management | 30-40 tasks |
| `testing` | Testing tasks | 50-100 tasks |

## Command Options

### Filtering
- `--batch <name>` - Predefined batch
- `--priority <level>` - Filter by priority (high, medium, low)
- `--status <status>` - Filter by status (planned, completed, backlog)
- `--labels <labels>` - Filter by labels (comma-separated)
- `--limit <number>` - Limit number of issues

### Assignment
- `--milestone <id>` - Assign to milestone
- `--assignee <username>` - Assign to user

### Control
- `--dry-run` - Preview without creating
- `--stats` - Show statistics only
- `--help` - Show help

## Data Source

Reads from: `docs/roadmap/ROADMAP_TASKS_EXTRACTED.json`

**Total Tasks**: 1,606  
**Format**: Structured JSON with metadata and task arrays

## Issue Format

Each issue includes:
- **Title**: Task title
- **Body**: 
  - Task details (ID, source, priority, status, effort)
  - Description
  - Acceptance criteria
  - Source file reference
- **Labels**: Task labels + priority + status + 'roadmap'
- **Optional**: Milestone, assignee

## Requirements

- **GitHub Token**: Personal access token with `repo` scope
- **Node.js**: v18+ with npm
- **Dependencies**: `@octokit/rest`, `tsx`

## Environment Variables

```bash
# Required
export GITHUB_TOKEN=ghp_your_token_here

# Optional (defaults provided)
export GITHUB_OWNER=mdresch
export GITHUB_REPO=adpa
```

## Best Practices

1. **Always start with stats**: `npm run import-issues:stats`
2. **Always dry run first**: `npm run import-issues:dry-run`
3. **Import in batches**: Use `--limit` for large imports
4. **Tag appropriately**: Add sprint/milestone labels
5. **Monitor rate limits**: Automatic handling, but be aware

## Troubleshooting

### "GITHUB_TOKEN not set"
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### "tsx not found"
```bash
npm install -g tsx
```

### "401 Unauthorized"
- Check token is valid
- Verify token has `repo` scope
- Ensure token hasn't expired

### "422 Validation Failed"
- Milestone doesn't exist (create first)
- Assignee doesn't have access
- Custom labels don't exist

## Documentation

- [PROGRAMMATIC_IMPORT_GUIDE.md](../docs/roadmap/PROGRAMMATIC_IMPORT_GUIDE.md) - Comprehensive guide
- [IMPORT_GUIDE.md](../docs/roadmap/IMPORT_GUIDE.md) - CSV and manual import
- [ROADMAP_TASKS_SUMMARY.md](../docs/roadmap/ROADMAP_TASKS_SUMMARY.md) - Strategic overview

## Support

For detailed documentation, see: `docs/roadmap/PROGRAMMATIC_IMPORT_GUIDE.md`

---

**Version**: 1.0.0  
**Status**: Production Ready

