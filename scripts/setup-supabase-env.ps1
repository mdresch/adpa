# Setup Supabase Environment for ADPA
# Run this after creating Supabase project

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl
)

Write-Host "🚀 ADPA Supabase Environment Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Your Supabase project details
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"

Write-Host "📋 Supabase Project Details:" -ForegroundColor Yellow
Write-Host "   Organization: CBA" -ForegroundColor White
Write-Host "   Project: ADPA" -ForegroundColor White
Write-Host "   Project Ref: $SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor White
Write-Host ""

# Prompt for database connection string if not provided
if (-not $DatabaseUrl) {
    Write-Host "🔗 Get your database connection string:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/database" -ForegroundColor Cyan
    Write-Host "2. Scroll to 'Connection string' section" -ForegroundColor White
    Write-Host "3. Select 'URI' tab" -ForegroundColor White
    Write-Host "4. Copy the 'Connection pooling' string (port 6543)" -ForegroundColor White
    Write-Host "5. Replace [YOUR-PASSWORD] with: $DATABASE_PASSWORD" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected format:" -ForegroundColor Yellow
    $exampleUrl = "postgresql://postgres.${SUPABASE_PROJECT_REF}:${DATABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    Write-Host $exampleUrl -ForegroundColor Gray
    Write-Host ""
    
    $DatabaseUrl = Read-Host "Paste your connection string here"
}

# Validate connection string
if ($DatabaseUrl -notmatch "supabase\.com") {
    Write-Host "❌ Invalid connection string! Must contain 'supabase.com'" -ForegroundColor Red
    exit 1
}

if ($DatabaseUrl -notmatch ":6543/") {
    Write-Host "⚠️  Warning: Connection string should use port 6543 (pooling), not 5432" -ForegroundColor Yellow
    Write-Host "   You provided: $DatabaseUrl" -ForegroundColor Gray
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Connection string validated" -ForegroundColor Green
Write-Host ""

# Update server/.env
Write-Host "📝 Updating server/.env..." -ForegroundColor Cyan

$envPath = "server\.env"
$envContent = ""

# Read existing .env if it exists
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    Write-Host "   Found existing .env file" -ForegroundColor White
    
    # Comment out old DATABASE_URL
    $envContent = $envContent -replace "^DATABASE_URL=", "# DATABASE_URL="
    $envContent = $envContent -replace "`nDATABASE_URL=", "`n# DATABASE_URL="
} else {
    Write-Host "   Creating new .env file" -ForegroundColor White
}

# Add Supabase configuration
$supabaseConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Project: CBA/ADPA
# Region: US East (N. Virginia)

# Backend Database Connection (PostgreSQL)
DATABASE_URL=$DatabaseUrl

# Frontend Supabase Configuration (for optional direct access)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Supabase Project Reference
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ================================================================
"@

$envContent += $supabaseConfig

# Write to file
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ server\.env updated" -ForegroundColor Green
Write-Host ""

# Display what was added
Write-Host "📋 Configuration added:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL: $DatabaseUrl" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   SUPABASE_PROJECT_REF: $SUPABASE_PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# Offer to update frontend .env as well
Write-Host "🎨 Update frontend environment?" -ForegroundColor Cyan
$updateFrontend = Read-Host "Add Supabase config to .env.local? (y/n)"

if ($updateFrontend -eq "y") {
    $frontendEnvPath = ".env.local"
    $frontendContent = ""
    
    if (Test-Path $frontendEnvPath) {
        $frontendContent = Get-Content $frontendEnvPath -Raw
    }
    
    $frontendConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# ================================================================
"@
    
    $frontendContent += $frontendConfig
    Set-Content -Path $frontendEnvPath -Value $frontendContent
    Write-Host "✅ .env.local updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify tables:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Test connection:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "5. View Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Environment Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""



param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl
)

Write-Host "🚀 ADPA Supabase Environment Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Your Supabase project details
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"

Write-Host "📋 Supabase Project Details:" -ForegroundColor Yellow
Write-Host "   Organization: CBA" -ForegroundColor White
Write-Host "   Project: ADPA" -ForegroundColor White
Write-Host "   Project Ref: $SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor White
Write-Host ""

# Prompt for database connection string if not provided
if (-not $DatabaseUrl) {
    Write-Host "🔗 Get your database connection string:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/database" -ForegroundColor Cyan
    Write-Host "2. Scroll to 'Connection string' section" -ForegroundColor White
    Write-Host "3. Select 'URI' tab" -ForegroundColor White
    Write-Host "4. Copy the 'Connection pooling' string (port 6543)" -ForegroundColor White
    Write-Host "5. Replace [YOUR-PASSWORD] with: $DATABASE_PASSWORD" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected format:" -ForegroundColor Yellow
    $exampleUrl = "postgresql://postgres.${SUPABASE_PROJECT_REF}:${DATABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    Write-Host $exampleUrl -ForegroundColor Gray
    Write-Host ""
    
    $DatabaseUrl = Read-Host "Paste your connection string here"
}

# Validate connection string
if ($DatabaseUrl -notmatch "supabase\.com") {
    Write-Host "❌ Invalid connection string! Must contain 'supabase.com'" -ForegroundColor Red
    exit 1
}

if ($DatabaseUrl -notmatch ":6543/") {
    Write-Host "⚠️  Warning: Connection string should use port 6543 (pooling), not 5432" -ForegroundColor Yellow
    Write-Host "   You provided: $DatabaseUrl" -ForegroundColor Gray
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Connection string validated" -ForegroundColor Green
Write-Host ""

# Update server/.env
Write-Host "📝 Updating server/.env..." -ForegroundColor Cyan

$envPath = "server\.env"
$envContent = ""

# Read existing .env if it exists
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    Write-Host "   Found existing .env file" -ForegroundColor White
    
    # Comment out old DATABASE_URL
    $envContent = $envContent -replace "^DATABASE_URL=", "# DATABASE_URL="
    $envContent = $envContent -replace "`nDATABASE_URL=", "`n# DATABASE_URL="
} else {
    Write-Host "   Creating new .env file" -ForegroundColor White
}

# Add Supabase configuration
$supabaseConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Project: CBA/ADPA
# Region: US East (N. Virginia)

# Backend Database Connection (PostgreSQL)
DATABASE_URL=$DatabaseUrl

# Frontend Supabase Configuration (for optional direct access)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Supabase Project Reference
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ================================================================
"@

$envContent += $supabaseConfig

# Write to file
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ server\.env updated" -ForegroundColor Green
Write-Host ""

# Display what was added
Write-Host "📋 Configuration added:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL: $DatabaseUrl" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   SUPABASE_PROJECT_REF: $SUPABASE_PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# Offer to update frontend .env as well
Write-Host "🎨 Update frontend environment?" -ForegroundColor Cyan
$updateFrontend = Read-Host "Add Supabase config to .env.local? (y/n)"

if ($updateFrontend -eq "y") {
    $frontendEnvPath = ".env.local"
    $frontendContent = ""
    
    if (Test-Path $frontendEnvPath) {
        $frontendContent = Get-Content $frontendEnvPath -Raw
    }
    
    $frontendConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# ================================================================
"@
    
    $frontendContent += $frontendConfig
    Set-Content -Path $frontendEnvPath -Value $frontendContent
    Write-Host "✅ .env.local updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify tables:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Test connection:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "5. View Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Environment Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""



param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl
)

Write-Host "🚀 ADPA Supabase Environment Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Your Supabase project details
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"

Write-Host "📋 Supabase Project Details:" -ForegroundColor Yellow
Write-Host "   Organization: CBA" -ForegroundColor White
Write-Host "   Project: ADPA" -ForegroundColor White
Write-Host "   Project Ref: $SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor White
Write-Host ""

# Prompt for database connection string if not provided
if (-not $DatabaseUrl) {
    Write-Host "🔗 Get your database connection string:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/database" -ForegroundColor Cyan
    Write-Host "2. Scroll to 'Connection string' section" -ForegroundColor White
    Write-Host "3. Select 'URI' tab" -ForegroundColor White
    Write-Host "4. Copy the 'Connection pooling' string (port 6543)" -ForegroundColor White
    Write-Host "5. Replace [YOUR-PASSWORD] with: $DATABASE_PASSWORD" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected format:" -ForegroundColor Yellow
    $exampleUrl = "postgresql://postgres.${SUPABASE_PROJECT_REF}:${DATABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    Write-Host $exampleUrl -ForegroundColor Gray
    Write-Host ""
    
    $DatabaseUrl = Read-Host "Paste your connection string here"
}

# Validate connection string
if ($DatabaseUrl -notmatch "supabase\.com") {
    Write-Host "❌ Invalid connection string! Must contain 'supabase.com'" -ForegroundColor Red
    exit 1
}

if ($DatabaseUrl -notmatch ":6543/") {
    Write-Host "⚠️  Warning: Connection string should use port 6543 (pooling), not 5432" -ForegroundColor Yellow
    Write-Host "   You provided: $DatabaseUrl" -ForegroundColor Gray
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Connection string validated" -ForegroundColor Green
Write-Host ""

# Update server/.env
Write-Host "📝 Updating server/.env..." -ForegroundColor Cyan

$envPath = "server\.env"
$envContent = ""

# Read existing .env if it exists
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    Write-Host "   Found existing .env file" -ForegroundColor White
    
    # Comment out old DATABASE_URL
    $envContent = $envContent -replace "^DATABASE_URL=", "# DATABASE_URL="
    $envContent = $envContent -replace "`nDATABASE_URL=", "`n# DATABASE_URL="
} else {
    Write-Host "   Creating new .env file" -ForegroundColor White
}

# Add Supabase configuration
$supabaseConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Project: CBA/ADPA
# Region: US East (N. Virginia)

# Backend Database Connection (PostgreSQL)
DATABASE_URL=$DatabaseUrl

# Frontend Supabase Configuration (for optional direct access)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Supabase Project Reference
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ================================================================
"@

$envContent += $supabaseConfig

# Write to file
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ server\.env updated" -ForegroundColor Green
Write-Host ""

# Display what was added
Write-Host "📋 Configuration added:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL: $DatabaseUrl" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   SUPABASE_PROJECT_REF: $SUPABASE_PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# Offer to update frontend .env as well
Write-Host "🎨 Update frontend environment?" -ForegroundColor Cyan
$updateFrontend = Read-Host "Add Supabase config to .env.local? (y/n)"

if ($updateFrontend -eq "y") {
    $frontendEnvPath = ".env.local"
    $frontendContent = ""
    
    if (Test-Path $frontendEnvPath) {
        $frontendContent = Get-Content $frontendEnvPath -Raw
    }
    
    $frontendConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# ================================================================
"@
    
    $frontendContent += $frontendConfig
    Set-Content -Path $frontendEnvPath -Value $frontendContent
    Write-Host "✅ .env.local updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify tables:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Test connection:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "5. View Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Environment Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""



param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl
)

Write-Host "🚀 ADPA Supabase Environment Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Your Supabase project details
$SUPABASE_URL = "https://blxzjbxczpmmgiwbtmdo.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM"
$SUPABASE_PROJECT_REF = "blxzjbxczpmmgiwbtmdo"
$DATABASE_PASSWORD = "QueIQ4Klopman$"

Write-Host "📋 Supabase Project Details:" -ForegroundColor Yellow
Write-Host "   Organization: CBA" -ForegroundColor White
Write-Host "   Project: ADPA" -ForegroundColor White
Write-Host "   Project Ref: $SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor White
Write-Host ""

# Prompt for database connection string if not provided
if (-not $DatabaseUrl) {
    Write-Host "🔗 Get your database connection string:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/database" -ForegroundColor Cyan
    Write-Host "2. Scroll to 'Connection string' section" -ForegroundColor White
    Write-Host "3. Select 'URI' tab" -ForegroundColor White
    Write-Host "4. Copy the 'Connection pooling' string (port 6543)" -ForegroundColor White
    Write-Host "5. Replace [YOUR-PASSWORD] with: $DATABASE_PASSWORD" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected format:" -ForegroundColor Yellow
    $exampleUrl = "postgresql://postgres.${SUPABASE_PROJECT_REF}:${DATABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    Write-Host $exampleUrl -ForegroundColor Gray
    Write-Host ""
    
    $DatabaseUrl = Read-Host "Paste your connection string here"
}

# Validate connection string
if ($DatabaseUrl -notmatch "supabase\.com") {
    Write-Host "❌ Invalid connection string! Must contain 'supabase.com'" -ForegroundColor Red
    exit 1
}

if ($DatabaseUrl -notmatch ":6543/") {
    Write-Host "⚠️  Warning: Connection string should use port 6543 (pooling), not 5432" -ForegroundColor Yellow
    Write-Host "   You provided: $DatabaseUrl" -ForegroundColor Gray
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Connection string validated" -ForegroundColor Green
Write-Host ""

# Update server/.env
Write-Host "📝 Updating server/.env..." -ForegroundColor Cyan

$envPath = "server\.env"
$envContent = ""

# Read existing .env if it exists
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    Write-Host "   Found existing .env file" -ForegroundColor White
    
    # Comment out old DATABASE_URL
    $envContent = $envContent -replace "^DATABASE_URL=", "# DATABASE_URL="
    $envContent = $envContent -replace "`nDATABASE_URL=", "`n# DATABASE_URL="
} else {
    Write-Host "   Creating new .env file" -ForegroundColor White
}

# Add Supabase configuration
$supabaseConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Project: CBA/ADPA
# Region: US East (N. Virginia)

# Backend Database Connection (PostgreSQL)
DATABASE_URL=$DatabaseUrl

# Frontend Supabase Configuration (for optional direct access)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Supabase Project Reference
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF

# ================================================================
"@

$envContent += $supabaseConfig

# Write to file
Set-Content -Path $envPath -Value $envContent
Write-Host "✅ server\.env updated" -ForegroundColor Green
Write-Host ""

# Display what was added
Write-Host "📋 Configuration added:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL: $DatabaseUrl" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   SUPABASE_PROJECT_REF: $SUPABASE_PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# Offer to update frontend .env as well
Write-Host "🎨 Update frontend environment?" -ForegroundColor Cyan
$updateFrontend = Read-Host "Add Supabase config to .env.local? (y/n)"

if ($updateFrontend -eq "y") {
    $frontendEnvPath = ".env.local"
    $frontendContent = ""
    
    if (Test-Path $frontendEnvPath) {
        $frontendContent = Get-Content $frontendEnvPath -Raw
    }
    
    $frontendConfig = @"

# ==================== SUPABASE CONFIGURATION ====================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# ================================================================
"@
    
    $frontendContent += $frontendConfig
    Set-Content -Path $frontendEnvPath -Value $frontendContent
    Write-Host "✅ .env.local updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node scripts/apply-baseline-migration.js" -ForegroundColor White
Write-Host "   node scripts/create-change-request-template.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify tables:" -ForegroundColor Yellow
Write-Host "   node scripts/check-baseline-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start backend:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Test connection:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "5. View Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Environment Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

