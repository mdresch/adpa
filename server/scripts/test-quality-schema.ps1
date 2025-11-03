# PowerShell Script: test-quality-schema.ps1
# Description: Test and verify quality audit database schema
# Author: ADPA Development Team
# Date: 2025-11-03

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quality Audit Schema Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
}

$DATABASE_URL = $env:DATABASE_URL
if (-not $DATABASE_URL) {
    Write-Host "Error: DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

# Function to run SQL query and get results
function Run-Query {
    param([string]$query)
    
    $tempFile = [System.IO.Path]::GetTempFileName()
    $query | Out-File -FilePath $tempFile -Encoding UTF8
    
    $result = & psql $DATABASE_URL -f $tempFile -t -A 2>&1
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    return $result
}

# Test 1: Check if tables exist
Write-Host "Test 1: Checking if tables exist..." -ForegroundColor Yellow

$tables = @('quality_audits', 'template_improvement_suggestions', 'template_versions')
$allTablesExist = $true

foreach ($table in $tables) {
    $result = Run-Query "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');"
    if ($result -match 't') {
        Write-Host "  ✓ $table exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $table NOT FOUND" -ForegroundColor Red
        $allTablesExist = $false
    }
}
Write-Host ""

# Test 2: Check quality_audits table structure
Write-Host "Test 2: Validating quality_audits table structure..." -ForegroundColor Yellow

$expectedColumns = @(
    'id', 'document_id', 'audit_job_id', 
    'overall_score', 'overall_grade', 'quality_level',
    'completeness_score', 'consistency_score', 'professional_quality_score',
    'standards_compliance_score', 'accuracy_score', 'context_relevance_score',
    'findings', 'issues', 'recommendations',
    'ai_provider', 'ai_model', 'analysis_tokens', 'analysis_cost', 'analysis_time',
    'audited_at', 'audited_by', 'created_at', 'updated_at'
)

$columnsQuery = @"
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quality_audits' 
ORDER BY ordinal_position;
"@

$actualColumns = (Run-Query $columnsQuery) -split "`n" | Where-Object { $_.Trim() -ne '' }

$allColumnsPresent = $true
foreach ($col in $expectedColumns) {
    if ($actualColumns -contains $col) {
        Write-Host "  ✓ Column: $col" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Missing column: $col" -ForegroundColor Red
        $allColumnsPresent = $false
    }
}
Write-Host ""

# Test 3: Check documents table quality columns
Write-Host "Test 3: Checking documents table quality columns..." -ForegroundColor Yellow

$docQualityColumns = @('quality_audit_id', 'quality_status', 'quality_score')
$allDocColumnsPresent = $true

foreach ($col in $docQualityColumns) {
    $result = Run-Query "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = '$col');"
    if ($result -match 't') {
        Write-Host "  ✓ documents.$col exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ documents.$col NOT FOUND" -ForegroundColor Red
        $allDocColumnsPresent = $false
    }
}
Write-Host ""

# Test 4: Check indexes
Write-Host "Test 4: Checking indexes..." -ForegroundColor Yellow

$expectedIndexes = @(
    'idx_quality_audits_document',
    'idx_quality_audits_grade',
    'idx_quality_audits_score',
    'idx_template_improvements_template',
    'idx_template_versions_template'
)

foreach ($idx in $expectedIndexes) {
    $result = Run-Query "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '$idx');"
    if ($result -match 't') {
        Write-Host "  ✓ Index: $idx" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Missing index: $idx" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Check constraints
Write-Host "Test 5: Checking constraints..." -ForegroundColor Yellow

$constraintsQuery = @"
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'quality_audits'::regclass 
AND contype = 'c';
"@

$constraints = (Run-Query $constraintsQuery) -split "`n" | Where-Object { $_.Trim() -ne '' }

if ($constraints.Count -gt 0) {
    Write-Host "  ✓ Found $($constraints.Count) CHECK constraints" -ForegroundColor Green
    $constraints | ForEach-Object {
        Write-Host "    - $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ No CHECK constraints found" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Insert test record
Write-Host "Test 6: Testing insert and query operations..." -ForegroundColor Yellow

$testInsert = @"
DO `$`$
DECLARE
  test_user_id UUID;
  test_project_id UUID;
  test_document_id UUID;
  test_audit_id UUID;
BEGIN
  -- Get or create test user
  SELECT id INTO test_user_id FROM users WHERE email = 'test@adpa.dev' LIMIT 1;
  IF test_user_id IS NULL THEN
    INSERT INTO users (email, password_hash, name, role)
    VALUES ('test@adpa.dev', 'test_hash', 'Test User', 'user')
    RETURNING id INTO test_user_id;
  END IF;
  
  -- Get or create test project
  SELECT id INTO test_project_id FROM projects WHERE created_by = test_user_id LIMIT 1;
  IF test_project_id IS NULL THEN
    INSERT INTO projects (name, created_by)
    VALUES ('Test Project for Quality Audit', test_user_id)
    RETURNING id INTO test_project_id;
  END IF;
  
  -- Get or create test document
  SELECT id INTO test_document_id FROM documents WHERE project_id = test_project_id LIMIT 1;
  IF test_document_id IS NULL THEN
    INSERT INTO documents (title, content, project_id, created_by, type)
    VALUES ('Test Document', 'Test content for quality audit validation', test_project_id, test_user_id, 'project-charter')
    RETURNING id INTO test_document_id;
  END IF;
  
  -- Insert test quality audit
  INSERT INTO quality_audits (
    document_id,
    overall_score,
    overall_grade,
    quality_level,
    completeness_score,
    consistency_score,
    professional_quality_score,
    standards_compliance_score,
    accuracy_score,
    context_relevance_score,
    findings,
    issues,
    recommendations,
    ai_provider,
    ai_model
  ) VALUES (
    test_document_id,
    85,
    'B',
    'Good',
    80,
    75,
    90,
    85,
    95,
    85,
    '{"completeness": "Good overall", "consistency": "Minor issues"}'::jsonb,
    '[{"severity": "minor", "dimension": "consistency", "description": "Test issue"}]'::jsonb,
    '["Add more examples", "Improve formatting"]'::jsonb,
    'google',
    'gemini-2.5-flash'
  )
  RETURNING id INTO test_audit_id;
  
  -- Update document with quality info
  UPDATE documents
  SET quality_audit_id = test_audit_id,
      quality_status = 'passed',
      quality_score = 85
  WHERE id = test_document_id;
  
  RAISE NOTICE 'Test quality audit created: %', test_audit_id;
END `$`$;
"@

$insertResult = Run-Query $testInsert

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Test insert successful" -ForegroundColor Green
    
    # Query the test record
    $queryResult = Run-Query "SELECT COUNT(*) FROM quality_audits WHERE ai_provider = 'google' AND ai_model = 'gemini-2.5-flash';"
    $count = $queryResult.Trim()
    
    if ($count -gt 0) {
        Write-Host "  ✓ Test record found (count: $count)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Test record not found" -ForegroundColor Red
    }
    
    # Test JSONB query
    $jsonbResult = Run-Query "SELECT findings->>'completeness' as completeness_finding FROM quality_audits WHERE ai_provider = 'google' LIMIT 1;"
    if ($jsonbResult) {
        Write-Host "  ✓ JSONB query successful: $jsonbResult" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ Test insert failed" -ForegroundColor Red
    Write-Host "    $insertResult" -ForegroundColor Red
}
Write-Host ""

# Test 7: Test template improvement suggestions
Write-Host "Test 7: Testing template improvement suggestions..." -ForegroundColor Yellow

$templateTest = @"
DO `$`$
DECLARE
  test_template_id UUID;
  test_suggestion_id UUID;
BEGIN
  -- Get or create test template
  SELECT id INTO test_template_id FROM document_templates WHERE name LIKE 'Test Template%' LIMIT 1;
  IF test_template_id IS NULL THEN
    INSERT INTO document_templates (name, type, content, active)
    VALUES ('Test Template for Quality', 'project-charter', 'Test template content', true)
    RETURNING id INTO test_template_id;
  END IF;
  
  -- Insert test improvement suggestion
  INSERT INTO template_improvement_suggestions (
    template_id,
    analysis_period_start,
    analysis_period_end,
    documents_analyzed,
    current_avg_quality,
    current_completeness,
    current_consistency,
    current_professional_quality,
    current_standards_compliance,
    common_issues,
    issue_frequency,
    suggested_improvements,
    improvement_rationale,
    expected_quality_gain,
    priority,
    analyzer_ai_provider,
    analyzer_ai_model
  ) VALUES (
    test_template_id,
    NOW() - INTERVAL '30 days',
    NOW(),
    10,
    75,
    70,
    65,
    80,
    85,
    '[{"type": "consistency", "description": "Inconsistent terminology", "count": 7}]'::jsonb,
    '{"consistency": 70}'::jsonb,
    '[{"issue_addressed": "Consistency", "proposed_change": "Add terminology guidelines", "priority": "high"}]'::jsonb,
    'Improve consistency across documents',
    15,
    'high',
    'google',
    'gemini-2.5-flash'
  )
  RETURNING id INTO test_suggestion_id;
  
  RAISE NOTICE 'Test suggestion created: %', test_suggestion_id;
END `$`$;
"@

$templateResult = Run-Query $templateTest

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Template improvement suggestion insert successful" -ForegroundColor Green
    
    # Query the test record
    $suggestionCount = Run-Query "SELECT COUNT(*) FROM template_improvement_suggestions WHERE priority = 'high';"
    Write-Host "  ✓ Found $($suggestionCount.Trim()) high-priority suggestions" -ForegroundColor Green
} else {
    Write-Host "  ✗ Template improvement test failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($allTablesExist -and $allColumnsPresent -and $allDocColumnsPresent) {
    Write-Host "✓ Schema validation PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database is ready for Quality Control Gate implementation!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Implement QualityAuditService (server/src/services/qualityAuditService.ts)" -ForegroundColor White
    Write-Host "  2. Implement TemplateImprovementService (server/src/services/templateImprovementService.ts)" -ForegroundColor White
    Write-Host "  3. Add quality audit routes (server/src/routes/qualityAuditRoutes.ts)" -ForegroundColor White
    Write-Host "  4. Integrate with document generation workflow" -ForegroundColor White
} else {
    Write-Host "✗ Schema validation FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the errors above and re-run migrations" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan

