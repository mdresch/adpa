# Fix Supabase IPv6 Connection Issue
# Changes port 5432 → 6543 to use pooler (better IPv4 compatibility)

Write-Host "🔧 Fixing Supabase Database Connection" -ForegroundColor Cyan
Write-Host ""

$envPath = "server\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: server\.env file not found!" -ForegroundColor Red
    Write-Host "Please create server\.env from server\.env.example" -ForegroundColor Yellow
    exit 1
}

# Read current .env
$content = Get-Content $envPath -Raw

# Backup original
$backupPath = "$envPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $envPath $backupPath
Write-Host "📋 Backup created: $backupPath" -ForegroundColor Green

# Fix DATABASE_URL (port 5432 → 6543, add pgbouncer)
$content = $content -replace 'postgresql://([^@]+)@([^:]+):5432/([^\?]+)(\?[^\r\n]*)?', 'postgresql://$1@$2:6543/$3?pgbouncer=true&sslmode=require'

# Fix POSTGRES_URL if it exists
$content = $content -replace '(POSTGRES_URL=postgresql://[^@]+@[^:]+:)5432', '$16543'

# Add pgbouncer parameter if missing
if ($content -notmatch 'pgbouncer=true') {
    $content = $content -replace '(DATABASE_URL=postgresql://[^\r\n]+)(\r?\n)', '$1&pgbouncer=true$2'
}

# Update ports in individual components
$content = $content -replace '^DB_PORT=5432', 'DB_PORT=6543'

# Save fixed .env
Set-Content $envPath $content -NoNewline

Write-Host ""
Write-Host "✅ Fixed DATABASE_URL to use Supabase pooler (port 6543)" -ForegroundColor Green
Write-Host "✅ Added pgbouncer=true parameter" -ForegroundColor Green
Write-Host "✅ Set DB_PORT=6543" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Changes made:" -ForegroundColor Cyan
Write-Host "  • Port 5432 → 6543 (uses PgBouncer pooler)" -ForegroundColor White
Write-Host "  • Added pgbouncer=true parameter" -ForegroundColor White
Write-Host "  • This fixes IPv6 timeout issues on Windows" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Next step: Restart your backend server:" -ForegroundColor Yellow
Write-Host "   cd server && npm run dev" -ForegroundColor White
Write-Host ""

