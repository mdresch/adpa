# Roadmap Task Extraction - Quick Start Guide

This directory contains comprehensive task breakdowns extracted from all ADPA roadmap documents, ready for import into GitHub Projects for scheduling and iterative development.

## 📦 What's Included

### Core Files

| File | Description | Size | Use Case |
|------|-------------|------|----------|
| **ROADMAP_TASKS_SUMMARY.md** | Human-readable overview with strategic guidance | 17KB | Read first - understand the roadmap |
| **ROADMAP_TASKS_IMPORT.csv** | GitHub Projects import format | 355KB | Import directly to GitHub Projects |
| **ROADMAP_TASKS_EXTRACTED.json** | Complete structured data | 640KB | Programmatic access, custom processing |
| **GITHUB_ISSUES_GENERATION_GUIDE.md** | Instructions for creating GitHub issues | 3KB | Creating issues in batches |

### Batch Creation Scripts

| Script | Tasks | Description |
|--------|-------|-------------|
| `create-critical-high-issues.sh` | 50 | Critical and high priority tasks |
| `create-sprint-1-issues.sh` | 30 | Core features for Sprint 1 |
| `create-entity-type-issues.sh` | 40 | PMBOK entity type development |
| `create-portfolio-issues.sh` | 50 | Portfolio & program management |
| `create-ai-search-issues.sh` | 30 | AI and semantic search features |

### Sample Templates

Sample GitHub issue templates in `github-issues/` directory (3 examples)

---

## 🚀 Quick Start (3 Options)

### Option 1: Import CSV to GitHub Projects (Easiest)

```bash
# 1. Go to your GitHub repository
# 2. Navigate to "Projects" tab
# 3. Create or open "ADPA Roadmap" project
# 4. Click "⋯" menu → "Settings" → "Import"
# 5. Upload: docs/roadmap/ROADMAP_TASKS_IMPORT.csv
# 6. Map fields as prompted
```

**Recommended field mapping:**
- `ID` → Custom field "Task ID"
- `Title` → Issue title
- `Description` → Issue body
- `Status` → Status field
- `Priority` → Label
- `Labels` → Labels
- `Effort` → Custom field "Effort"
- `Source` → Custom field "Source Document"

### Option 2: Create GitHub Issues via CLI (Most Flexible)

```bash
# Prerequisites: Install GitHub CLI
# https://cli.github.com/

# Authenticate
gh auth login

# Make scripts executable
chmod +x docs/roadmap/*.sh

# Create issues in priority order
bash docs/roadmap/create-critical-high-issues.sh
bash docs/roadmap/create-sprint-1-issues.sh
bash docs/roadmap/create-entity-type-issues.sh
bash docs/roadmap/create-portfolio-issues.sh
bash docs/roadmap/create-ai-search-issues.sh
```

### Option 3: Review Files First (Recommended)

```bash
# 1. Read the summary
less docs/roadmap/ROADMAP_TASKS_SUMMARY.md

# 2. Review the JSON data
jq '.metadata' docs/roadmap/ROADMAP_TASKS_EXTRACTED.json

# 3. Preview CSV
head -20 docs/roadmap/ROADMAP_TASKS_IMPORT.csv

# 4. Check a batch script
head -50 docs/roadmap/create-sprint-1-issues.sh

# 5. View sample issue template
cat docs/roadmap/github-issues/issue-task-123.md
```

---

## 📊 Statistics

**Total Tasks Extracted**: 1,606  
**From Documents**: 69 roadmap files  
**Generated**: 2025-11-04

### By Status
- **Planned**: 1,267 (78.9%)
- **Completed**: 291 (18.1%)
- **Backlog**: 48 (3.0%)

### By Priority
- **High**: 278 (17.3%)
- **Medium**: 1,280 (79.7%)
- **Low**: 48 (3.0%)

### By Technical Area
- General: 823 tasks
- Portfolio Management: 379 tasks
- Documentation: 121 tasks
- Testing: 91 tasks
- Backend: 70 tasks
- AI: 58 tasks
- Entity Types: 57 tasks
- Frontend: 56 tasks
- Search: 40 tasks
- Baseline Management: 33 tasks

---

## 🎯 Recommended Workflow

### Phase 1: Initial Setup (Week 1)

1. **Review the summary document**
   ```bash
   open docs/roadmap/ROADMAP_TASKS_SUMMARY.md
   # or
   cat docs/roadmap/ROADMAP_TASKS_SUMMARY.md
   ```

2. **Import to GitHub Projects**
   - Use CSV import for bulk import
   - Or use batch scripts for more control

3. **Configure your project**
   - Add custom fields: Task ID, Source Document, Effort
   - Set up views: By Priority, By Status, By Label
   - Create milestones: Sprint 1-12

### Phase 2: Sprint Planning (Week 2)

1. **Filter high-priority tasks**
   ```bash
   # View high priority tasks in CSV
   grep "High" docs/roadmap/ROADMAP_TASKS_IMPORT.csv | head -20
   ```

2. **Assign to Sprint 1**
   - Core features: PDF/DOCX export, Template builder
   - Estimated: 33 tasks, 10-15 days effort

3. **Create sprint milestones in GitHub**

### Phase 3: Iterative Development (Weeks 3+)

1. **Pick tasks from backlog**
   - Filter by label (backend, frontend, ai, etc.)
   - Assign to team members or Copilot

2. **Track progress**
   - Update task status in GitHub Projects
   - Monitor velocity (tasks/week)

3. **Adjust priorities**
   - Re-prioritize based on feedback
   - Add new tasks as needed

---

## 🔍 File Format Details

### CSV Format (ROADMAP_TASKS_IMPORT.csv)

```csv
ID,Title,Description,Status,Priority,Effort,Labels,Source
TASK-1,"PDF templates","From: CORE_FEATURES...",Planned,High,3-5 days,documentation,CORE_FEATURES_PRIORITY.md
```

**Fields:**
- `ID`: Unique identifier (TASK-1 through TASK-1606)
- `Title`: Short description (max 100 chars)
- `Description`: Detailed context with source info
- `Status`: Planned, In Progress, Completed, Backlog
- `Priority`: Critical, High, Medium, Low
- `Effort`: Estimated duration (1-3 days, 3-5 days, 5-10 days)
- `Labels`: Technical/feature categories (semicolon-separated)
- `Source`: Original roadmap document filename

### JSON Format (ROADMAP_TASKS_EXTRACTED.json)

```json
{
  "metadata": {
    "generated": "2025-11-04T08:04:17.089Z",
    "totalTasks": 1606,
    "statistics": { ... }
  },
  "tasks": [
    {
      "id": "TASK-1",
      "title": "...",
      "description": "...",
      "status": "...",
      "priority": "...",
      "effort": "...",
      "source": "...",
      "labels": ["..."]
    }
  ]
}
```

---

## 🏷️ Label System

### Technical Labels
- `backend` - API, services, database, migrations
- `frontend` - UI/UX, React components, pages
- `ai` - LLM, prompts, semantic features
- `testing` - Unit tests, E2E, integration
- `documentation` - Exports, templates, docs
- `security` - Auth, permissions, RBAC

### Feature Labels
- `portfolio-management` - Enterprise PM features
- `baseline-management` - Drift detection, compliance
- `entity-types` - PMBOK entity development
- `search` - Semantic search capabilities
- `integration` - Third-party integrations

### Use in GitHub
Add these as labels in your repository, then filter tasks:
```bash
gh issue list --label "backend,high" --limit 20
```

---

## 📅 Sprint Planning Guide

### Sprint 1-2 (Core Features)
**Duration**: 2-4 weeks  
**Tasks**: ~33 tasks from `create-sprint-1-issues.sh`  
**Focus**:
- PDF/DOCX export enhancement
- Template builder MVP
- Batch document generation

### Sprint 3-4 (Entity Types)
**Duration**: 3-4 weeks  
**Tasks**: ~40 tasks from `create-entity-type-issues.sh`  
**Focus**:
- Performance Actuals entity
- Team Agreements entity
- Issues Log entity
- Lessons Learned entity

### Sprint 5-6 (Baseline & Drift)
**Duration**: 2-3 weeks  
**Tasks**: Selected from baseline-management tasks  
**Focus**:
- Automatic drift detection
- Smart document versioning
- Drift resolution workflow

### Sprint 7-8 (AI & Search)
**Duration**: 3-4 weeks  
**Tasks**: ~30 tasks from `create-ai-search-issues.sh`  
**Focus**:
- RAG integration
- Universal semantic search
- Unlimited document support

### Sprint 9-10 (Portfolio Management)
**Duration**: 3-4 weeks  
**Tasks**: ~50 tasks from `create-portfolio-issues.sh`  
**Focus**:
- Portfolio strategic management
- Program activities
- Resource & cost management

---

## 🤖 Copilot-Friendly Tasks

All tasks have been sized for iterative development with GitHub Copilot:

### Task Size Distribution
- **Small (1-2 days)**: ~35% (~560 tasks)
- **Medium (3-5 days)**: ~50% (~800 tasks)
- **Large (5-10 days)**: ~15% (~240 tasks)

### Characteristics
✅ Independently implementable (low coupling)  
✅ Clear acceptance criteria (checkboxes)  
✅ Well-defined scope (single feature/component)  
✅ Testable (can write tests before/during)  
✅ Incrementally valuable (ships value)

---

## 🔧 Customization

### Filter Tasks by Criteria

```bash
# High priority backend tasks
jq '.tasks[] | select(.priority == "High" and (.labels | contains(["backend"])))' \
  docs/roadmap/ROADMAP_TASKS_EXTRACTED.json

# Planned AI/search tasks
jq '.tasks[] | select(.status == "Planned" and ((.labels | contains(["ai"])) or (.labels | contains(["search"]))))' \
  docs/roadmap/ROADMAP_TASKS_EXTRACTED.json | jq -s 'length'

# Tasks from specific source
grep "ENTITY_TYPE" docs/roadmap/ROADMAP_TASKS_IMPORT.csv
```

### Create Custom Batch Script

```bash
# Extract specific tasks to new script
cat > docs/roadmap/create-custom-batch.sh << 'EOF'
#!/bin/bash
REPO="mdresch/adpa"

# Add your custom task selection here
gh issue create --repo "$REPO" --title "..." --body "..." --label "..."
EOF

chmod +x docs/roadmap/create-custom-batch.sh
```

---

## 📚 Additional Resources

### Documentation
- **Main Roadmap**: [README.md](./README.md)
- **Task Summary**: [ROADMAP_TASKS_SUMMARY.md](./ROADMAP_TASKS_SUMMARY.md)
- **GitHub Issues Guide**: [GITHUB_ISSUES_GENERATION_GUIDE.md](./GITHUB_ISSUES_GENERATION_GUIDE.md)

### Original Roadmap Documents
All tasks were extracted from 69 roadmap files in this directory:
- Change Requests: `CR-2025-*.md`
- Entity Types: `ENTITY_TYPE_*.md`
- Features: Various feature roadmap files
- Strategic: `MASTER_STRATEGIC_PLAN_2026.md`, `PMBOK8_COMPLETE_ROADMAP.md`

### Tools Used
- **Extraction**: Node.js script analyzing markdown checkboxes
- **Format**: CSV for GitHub, JSON for programmatic access
- **Scripts**: Bash scripts using GitHub CLI

---

## ❓ FAQ

### Q: Can I modify the generated files?
**A:** Yes! These are starting points. Edit CSV/JSON as needed before import.

### Q: What if I don't want all 1,606 tasks?
**A:** Use the batch scripts to create subsets, or filter the CSV before import.

### Q: Can I regenerate with different criteria?
**A:** Yes, modify the extraction scripts in `/tmp/` and re-run.

### Q: How do I update task priorities?
**A:** Edit the CSV file or update in GitHub Projects after import.

### Q: Can I use this with other project management tools?
**A:** Yes! CSV is a standard format. Import to Jira, Asana, etc.

### Q: What about task dependencies?
**A:** Review source documents for details. Some dependencies are noted in descriptions.

---

## 🎉 Getting Started Checklist

- [ ] Read ROADMAP_TASKS_SUMMARY.md
- [ ] Review statistics and understand scope
- [ ] Choose import method (CSV, CLI, or manual)
- [ ] Set up GitHub Project with custom fields
- [ ] Import high-priority tasks first
- [ ] Create Sprint 1 milestone
- [ ] Assign first batch of tasks
- [ ] Start development!

---

## 📞 Support

For questions or issues:
1. Review the source roadmap documents in this directory
2. Check the ROADMAP_TASKS_SUMMARY.md for strategic context
3. Consult the GITHUB_ISSUES_GENERATION_GUIDE.md for technical details

---

**Generated**: 2025-11-04  
**Version**: 1.0  
**Total Tasks**: 1,606  
**Status**: Ready for Import ✅

---

*This roadmap task extraction enables iterative, Copilot-friendly development with clear priorities and manageable task sizes.*
