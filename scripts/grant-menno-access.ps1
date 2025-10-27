# Quick fix: Grant Menno access to all projects
# Run this to fix 403 Forbidden errors

Write-Host "=== Granting Access to menno.drescher@gmail.com ===" -ForegroundColor Cyan
Write-Host ""

# Load DATABASE_URL from server/.env
$envFile = "server\.env"
if(Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if($_ -match '^DATABASE_URL=(.+)$') {
            $env:DATABASE_URL = $matches[1].Trim('"')
            Write-Host "✓ Loaded DATABASE_URL from server/.env" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✗ server/.env not found!" -ForegroundColor Red
    exit 1
}

if(-not $env:DATABASE_URL) {
    Write-Host "✗ DATABASE_URL not set!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Connecting to database..." -ForegroundColor Green
Write-Host ""

# SQL to grant access
$sql = @"
-- Find Menno's user ID
SELECT id, email, name FROM users WHERE email = 'menno.drescher@gmail.com';

-- Grant owner access to ALL projects
UPDATE projects 
SET owner_id = (SELECT id FROM users WHERE email = 'menno.drescher@gmail.com')
WHERE owner_id IS NULL OR owner_id != (SELECT id FROM users WHERE email = 'menno.drescher@gmail.com');

-- Show results
SELECT 
    COUNT(*) as total_projects_you_own 
FROM projects 
WHERE owner_id = (SELECT id FROM users WHERE email = 'menno.drescher@gmail.com');

SELECT 
    id, 
    name, 
    status,
    created_at
FROM projects 
WHERE owner_id = (SELECT id FROM users WHERE email = 'menno.drescher@gmail.com')
ORDER BY created_at DESC
LIMIT 10;
"@

# Save SQL to temp file
$sqlFile = "temp-grant-access.sql"
$sql | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "Running SQL to grant access..." -ForegroundColor Yellow
Write-Host ""

# Run SQL
psql $env:DATABASE_URL -f $sqlFile

# Clean up
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== DONE! ===" -ForegroundColor Green
Write-Host ""
Write-Host "✓ You should now have access to all projects!" -ForegroundColor Green
Write-Host "✓ Refresh your browser (Ctrl+F5)" -ForegroundColor Green
Write-Host "✓ Navigate to: http://localhost:3000/projects" -ForegroundColor Green
Write-Host "✓ Documents should now be visible!" -ForegroundColor Green
Write-Host ""

