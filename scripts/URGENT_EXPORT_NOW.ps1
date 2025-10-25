# URGENT: Export from Neon NOW (You Have Access!)
# Run this immediately while you have Launch plan active

Write-Host "🚀 NEON DATA EXPORT - IMMEDIATE EXECUTION" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ You have Neon Launch plan active!" -ForegroundColor Green
Write-Host "✅ 100 GB transfer quota available" -ForegroundColor Green
Write-Host "✅ Access granted until Nov 1, 2025" -ForegroundColor Green
Write-Host ""

# Neon connection string
$NEON_HOST = "ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech"
$NEON_DATABASE = "neondb_owner"
$NEON_USER = "neondb_owner"

Write-Host "Enter your Neon database password:" -ForegroundColor Yellow
$NEON_PASSWORD = Read-Host -AsSecureString
$NEON_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($NEON_PASSWORD))

$NEON_URL = "postgresql://${NEON_USER}:${NEON_PASSWORD_PLAIN}@${NEON_HOST}:5432/${NEON_DATABASE}?sslmode=require"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "neon-backup-complete-${timestamp}.sql"

Write-Host ""
Write-Host "📦 Exporting complete database from Neon..." -ForegroundColor Cyan
Write-Host "   Source: $NEON_HOST" -ForegroundColor White
Write-Host "   Database: $NEON_DATABASE" -ForegroundColor White
Write-Host "   Backup file: $backupFile" -ForegroundColor White
Write-Host ""
Write-Host "⏳ This will take 2-5 minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    # Export using pg_dump
    $pgDumpCmd = "pg_dump `"$NEON_URL`" --no-owner --no-privileges --clean --if-exists --file=`"$backupFile`""
    
    Invoke-Expression $pgDumpCmd
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host ""
        Write-Host "=" * 60 -ForegroundColor Green
        Write-Host "✅ EXPORT SUCCESSFUL!" -ForegroundColor Green
        Write-Host "=" * 60 -ForegroundColor Green
        Write-Host ""
        Write-Host "📄 Backup file: $backupFile" -ForegroundColor Cyan
        Write-Host "📏 Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
        Write-Host ""
        
        # Create info file
        $info = @{
            exportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            sourceDatabase = "Neon (ep-royal-morning-a9j6aaq0-pooler)"
            backupFile = $backupFile
            fileSizeMB = [math]::Round($fileSize, 2)
            nextStep = "node scripts/import-to-supabase-complete.js $backupFile"
        }
        
        $infoFile = "$backupFile.info.json"
        $info | ConvertTo-Json | Set-Content $infoFile
        
        Write-Host "📋 Backup info saved: $infoFile" -ForegroundColor White
        Write-Host ""
        Write-Host "=" * 60 -ForegroundColor Cyan
        Write-Host "🎯 NEXT STEP:" -ForegroundColor Yellow
        Write-Host "=" * 60 -ForegroundColor Cyan
        Write-Host ""
        Write-Host "node scripts/import-to-supabase-complete.js $backupFile" -ForegroundColor White
        Write-Host ""
        Write-Host "This will import all your data to Supabase!" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "❌ Backup file not created!" -ForegroundColor Red
        Write-Host "Check pg_dump is installed" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Export failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Verify pg_dump is installed (PostgreSQL tools)" -ForegroundColor White
    Write-Host "2. Check password is correct" -ForegroundColor White
    Write-Host "3. Verify still have Launch plan access" -ForegroundColor White
    Write-Host ""
}

