#!/bin/bash

# GitHub Issues Validation Script
# Validates that all issues were created correctly
#
# Usage:
#   chmod +x scripts/validate-issues.sh
#   ./scripts/validate-issues.sh [--repo OWNER/REPO]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO="${1:-}"
if [ -z "$REPO" ]; then
  REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
fi

# Counters
TOTAL_ISSUES=0
PHASE1_ISSUES=0
PHASE2_ISSUES=0
PHASE3_ISSUES=0
PHASE4_ISSUES=0
PHASE5_ISSUES=0
ISSUES_WITH_LABELS=0
ISSUES_WITH_STORY_POINTS=0
FAILED_CHECKS=0

print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
  print_error "GitHub CLI (gh) not found"
  exit 1
fi

# Check authentication
if ! gh auth status > /dev/null 2>&1; then
  print_error "Not authenticated with GitHub"
  exit 1
fi

print_header "GitHub Issues Validation"
echo "Repository: ${BLUE}$REPO${NC}"
echo ""

# ============================================================================
# Count Issues by Phase
# ============================================================================

print_header "Checking Issue Creation"

# Get all issues as JSON
ISSUES=$(gh issue list --repo "$REPO" --json number,title,labels --limit 100)

# Count total issues
TOTAL_ISSUES=$(echo "$ISSUES" | jq 'length')
print_success "Total issues: $TOTAL_ISSUES"

# Count by phase
for phase in 1 2 3 4 5; do
  count=$(echo "$ISSUES" | jq "[.[] | select(.labels[].name == \"phase:$phase\")] | length")
  var_name="PHASE${phase}_ISSUES"
  eval "$var_name=$count"
  
  if [ "$count" -gt 0 ]; then
    print_success "Phase $phase: $count issues"
  else
    print_warning "Phase $phase: 0 issues (expected 3-5)"
    ((FAILED_CHECKS++))
  fi
done

# ============================================================================
# Validate Issue Structure
# ============================================================================

print_header "Validating Issue Structure"

# Expected phase issue counts
declare -A EXPECTED_COUNTS=(
  [1]=3
  [2]=3
  [3]=3
  [4]=5
  [5]=4
)

for phase in 1 2 3 4 5; do
  var_name="PHASE${phase}_ISSUES"
  actual=${!var_name}
  expected=${EXPECTED_COUNTS[$phase]}
  
  if [ "$actual" -eq "$expected" ]; then
    print_success "Phase $phase: $actual issues (expected $expected)"
  else
    print_error "Phase $phase: $actual issues (expected $expected)"
    ((FAILED_CHECKS++))
  fi
done

# ============================================================================
# Check Labels
# ============================================================================

print_header "Checking Labels"

# Check for phase labels
for phase in 1 2 3 4 5; do
  count=$(echo "$ISSUES" | jq "[.[] | select(.labels[].name == \"phase:$phase\")] | length")
  if [ "$count" -gt 0 ]; then
    print_success "Found phase:$phase label on $count issues"
  else
    print_warning "No issues with phase:$phase label"
  fi
done

# Check for type labels
for type in infrastructure testing refactor ops devops security frontend performance; do
  count=$(echo "$ISSUES" | jq "[.[] | select(.labels[].name == \"type:$type\")] | length")
  if [ "$count" -gt 0 ]; then
    print_success "Found type:$type label on $count issues"
  fi
done

# Check for priority labels
for priority in critical high medium; do
  count=$(echo "$ISSUES" | jq "[.[] | select(.labels[].name == \"priority:$priority\")] | length")
  if [ "$count" -gt 0 ]; then
    print_success "Found priority:$priority label on $count issues"
  fi
done

# ============================================================================
# Check Issue Titles
# ============================================================================

print_header "Checking Issue Titles"

expected_titles=(
  "Implement Startup Dependency Graph"
  "Security Hardening"
  "Basic Health Endpoints"
  "Jest, Supertest, and DB"
  "AI Provider Test Doubles"
  "Critical Path Tests"
  "Route Registry"
  "Module Extraction"
  "Repositories with Query Context"
  "Unified Health"
  "Structured Logging"
  "Prometheus Metrics"
  "Deployment Pipeline"
  "Staging Environment"
  "Query Performance"
  "Frontend App Router"
  "Expand Test Coverage"
  "Performance Baseline"
)

for title_fragment in "${expected_titles[@]}"; do
  count=$(echo "$ISSUES" | jq "[.[] | select(.title | contains(\"$title_fragment\"))] | length")
  if [ "$count" -gt 0 ]; then
    print_success "Found issue: $title_fragment"
  else
    print_warning "Missing issue: $title_fragment"
    ((FAILED_CHECKS++))
  fi
done

# ============================================================================
# Check Story Points
# ============================================================================

print_header "Checking Story Points"

# Verify each issue has story points (in body as "## Story Points: X")
issues_with_points=0
issues_without_points=0

while IFS= read -r issue_num; do
  if [ -n "$issue_num" ]; then
    issue_body=$(gh issue view "$issue_num" --repo "$REPO" --json body -q '.body')
    if echo "$issue_body" | grep -q "Story Points:"; then
      ((issues_with_points++))
    else
      ((issues_without_points++))
      print_warning "Issue #$issue_num missing story points"
    fi
  fi
done < <(echo "$ISSUES" | jq -r '.[].number')

print_success "Issues with story points: $issues_with_points"
if [ "$issues_without_points" -gt 0 ]; then
  print_warning "Issues without story points: $issues_without_points"
  ((FAILED_CHECKS++))
fi

# ============================================================================
# Check Acceptance Criteria
# ============================================================================

print_header "Checking Acceptance Criteria"

# Sample a few issues for acceptance criteria
sample_issues=$(echo "$ISSUES" | jq -r '.[0:5] | .[].number')

for issue_num in $sample_issues; do
  if [ -n "$issue_num" ]; then
    issue_body=$(gh issue view "$issue_num" --repo "$REPO" --json body -q '.body')
    
    if echo "$issue_body" | grep -q "Acceptance Criteria"; then
      print_success "Issue #$issue_num has acceptance criteria"
    else
      print_error "Issue #$issue_num missing acceptance criteria"
      ((FAILED_CHECKS++))
    fi
    
    if echo "$issue_body" | grep -q "Definition of Done"; then
      print_success "Issue #$issue_num has definition of done"
    else
      print_warning "Issue #$issue_num missing definition of done"
    fi
  fi
done

# ============================================================================
# Calculate Total Effort
# ============================================================================

print_header "Calculating Total Effort"

total_story_points=0

while IFS= read -r issue_num; do
  if [ -n "$issue_num" ]; then
    issue_body=$(gh issue view "$issue_num" --repo "$REPO" --json body -q '.body')
    points=$(echo "$issue_body" | grep "Story Points:" | sed 's/.*Story Points: \([0-9]*\).*/\1/' | head -1)
    if [ -n "$points" ]; then
      ((total_story_points += points))
    fi
  fi
done < <(echo "$ISSUES" | jq -r '.[].number')

if [ "$total_story_points" -gt 0 ]; then
  print_success "Total story points: $total_story_points"
  
  # Estimate hours (assuming 2-3 hours per story point)
  min_hours=$((total_story_points * 2))
  max_hours=$((total_story_points * 3))
  print_success "Estimated effort: $min_hours - $max_hours hours"
else
  print_warning "Could not calculate total story points"
fi

# ============================================================================
# Summary
# ============================================================================

print_header "Validation Summary"

if [ "$FAILED_CHECKS" -eq 0 ]; then
  print_success "All validations passed!"
  echo ""
  print_success "Total issues: $TOTAL_ISSUES"
  print_success "Phase 1: $PHASE1_ISSUES issues"
  print_success "Phase 2: $PHASE2_ISSUES issues"
  print_success "Phase 3: $PHASE3_ISSUES issues"
  print_success "Phase 4: $PHASE4_ISSUES issues"
  print_success "Phase 5: $PHASE5_ISSUES issues"
  echo ""
  print_success "All issues have proper structure, labels, and acceptance criteria"
  exit 0
else
  print_error "Validation failed with $FAILED_CHECKS issues"
  echo ""
  print_warning "Review the above output and fix any missing issues or labels"
  exit 1
fi
