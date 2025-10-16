# PowerShell script to generate a secure Key Encryption Key (KEK)
# This generates a cryptographically secure 32-byte (256-bit) key for envelope encryption

Write-Host ""
Write-Host "🔐 KEK (Key Encryption Key) Generator" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Generate a secure 32-byte (256-bit) random key
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$rng.GetBytes($bytes)
$kek = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
$rng.Dispose()

Write-Host "Generated KEK (keep this secure!):" -ForegroundColor Green
Write-Host ""
Write-Host "  $kek" -ForegroundColor Yellow
Write-Host ""

Write-Host "📝 Setup Instructions:" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. For Railway (Production):" -ForegroundColor White
Write-Host "   - Go to your Railway project settings" -ForegroundColor Gray
Write-Host "   - Navigate to Variables tab" -ForegroundColor Gray
Write-Host "   - Add a new variable:" -ForegroundColor Gray
Write-Host "     Name:  ENCRYPTION_KEK" -ForegroundColor Gray
Write-Host "     Value: $kek" -ForegroundColor Gray
Write-Host ""

Write-Host "2. For Local Development (.env file):" -ForegroundColor White
Write-Host "   Add this line to server/.env or server/env.local:" -ForegroundColor Gray
Write-Host ""
Write-Host "   ENCRYPTION_KEK=$kek" -ForegroundColor Yellow
Write-Host ""

Write-Host "3. For Docker (docker-compose.yml):" -ForegroundColor White
Write-Host "   environment:" -ForegroundColor Gray
Write-Host "     - ENCRYPTION_KEK=$kek" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  SECURITY WARNINGS:" -ForegroundColor Red
Write-Host "===================" -ForegroundColor Red
Write-Host "• NEVER commit this key to version control" -ForegroundColor Yellow
Write-Host "• Store it securely (password manager, secrets vault)" -ForegroundColor Yellow
Write-Host "• Losing this key means all encrypted data becomes unrecoverable" -ForegroundColor Yellow
Write-Host "• Rotate this key periodically (requires re-encryption of all data)" -ForegroundColor Yellow
Write-Host "• For enterprise deployments, use AWS KMS or Azure Key Vault instead" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Next Steps:" -ForegroundColor Green
Write-Host "=============" -ForegroundColor Green
Write-Host "1. Copy the KEK above to your environment configuration" -ForegroundColor Gray
Write-Host "2. Restart your backend server" -ForegroundColor Gray
Write-Host "3. The system will automatically:" -ForegroundColor Gray
Write-Host "   - Use the KEK to encrypt the master encryption key" -ForegroundColor Gray
Write-Host "   - Store the encrypted master key in the database" -ForegroundColor Gray
Write-Host "   - Decrypt it on startup using the KEK" -ForegroundColor Gray
Write-Host "4. Your API keys and sensitive data are now protected with envelope encryption" -ForegroundColor Gray
Write-Host ""

# Optionally copy to clipboard (if available)
try {
    $kek | Set-Clipboard
    Write-Host "📋 KEK copied to clipboard!" -ForegroundColor Magenta
    Write-Host ""
} catch {
    # Clipboard not available, ignore
}

