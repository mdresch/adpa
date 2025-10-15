#!/usr/bin/env pwsh
# Create GitHub Release for ADPA v2.0.0

$ErrorActionPreference = "Stop"

Write-Host "🚀 Creating ADPA v2.0.0 GitHub Release" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$version = "v2.0.0"
$releaseName = "ADPA v2.0.0 - Enterprise AI"
$releaseNotesFile = "RELEASE_NOTES_v2.0.0.md"
$whatsNewFile = "WHATS_NEW_v2.0.0.md"
$changelogFile = "CHANGELOG.md"

# Step 1: Verify we're in a git repository
Write-Host "1️⃣  Verifying Git Repository..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "   ❌ Not a git repository. Please run this script from the repository root." -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Git repository detected" -ForegroundColor Green

# Step 2: Check current branch
Write-Host "`n2️⃣  Checking Current Branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "   Current branch: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne "adpa-project-charter" -and $currentBranch -ne "main" -and $currentBranch -ne "master") {
    Write-Host "   ⚠️  Warning: Not on main/master branch" -ForegroundColor Yellow
    $response = Read-Host "   Continue anyway? (y/n)"
    if ($response -ne "y") {
        Write-Host "   ❌ Aborted by user" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✅ Branch validated" -ForegroundColor Green

# Step 3: Check for uncommitted changes
Write-Host "`n3️⃣  Checking for Uncommitted Changes..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "   ⚠️  Warning: You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    $response = Read-Host "`n   Commit changes before creating release? (y/n)"
    if ($response -eq "y") {
        Write-Host "   📝 Committing changes..." -ForegroundColor Cyan
        git add .
        $commitMessage = Read-Host "   Enter commit message (default: 'Prepare v2.0.0 release')"
        if ([string]::IsNullOrWhiteSpace($commitMessage)) {
            $commitMessage = "Prepare v2.0.0 release"
        }
        git commit -m $commitMessage
        Write-Host "   ✅ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ No uncommitted changes" -ForegroundColor Green
}

# Step 4: Verify required files exist
Write-Host "`n4️⃣  Verifying Release Files..." -ForegroundColor Yellow
$missingFiles = @()

if (-not (Test-Path $releaseNotesFile)) {
    $missingFiles += $releaseNotesFile
}
if (-not (Test-Path $whatsNewFile)) {
    $missingFiles += $whatsNewFile
}

if ($missingFiles.Count -gt 0) {
    Write-Host "   ❌ Missing required files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "   ✅ All required files present" -ForegroundColor Green

# Step 5: Check if tag already exists
Write-Host "`n5️⃣  Checking for Existing Tag..." -ForegroundColor Yellow
$existingTag = git tag -l $version
if ($existingTag) {
    Write-Host "   ⚠️  Tag $version already exists" -ForegroundColor Yellow
    $response = Read-Host "   Delete and recreate? (y/n)"
    if ($response -eq "y") {
        Write-Host "   🗑️  Deleting existing tag..." -ForegroundColor Cyan
        git tag -d $version
        # Delete remote tag if exists
        try {
            git push origin :refs/tags/$version 2>$null
        } catch {
            # Ignore if remote tag doesn't exist
        }
        Write-Host "   ✅ Tag deleted" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Aborted by user" -ForegroundColor Red
        exit 1
    }
}

# Step 6: Update package versions
Write-Host "`n6️⃣  Updating Package Versions..." -ForegroundColor Yellow

# Update frontend package.json
if (Test-Path "package.json") {
    Write-Host "   📦 Updating frontend package.json..." -ForegroundColor Cyan
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $oldVersion = $packageJson.version
    $packageJson.version = "2.0.0"
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
    Write-Host "      Version: $oldVersion → 2.0.0" -ForegroundColor Gray
}

# Update backend package.json
if (Test-Path "server/package.json") {
    Write-Host "   📦 Updating backend package.json..." -ForegroundColor Cyan
    $serverPackageJson = Get-Content "server/package.json" -Raw | ConvertFrom-Json
    $oldServerVersion = $serverPackageJson.version
    $serverPackageJson.version = "2.0.0"
    $serverPackageJson | ConvertTo-Json -Depth 100 | Set-Content "server/package.json"
    Write-Host "      Version: $oldServerVersion → 2.0.0" -ForegroundColor Gray
}

Write-Host "   ✅ Package versions updated" -ForegroundColor Green

# Step 7: Create git tag
Write-Host "`n7️⃣  Creating Git Tag..." -ForegroundColor Yellow

# Read release notes for tag message
$tagMessage = @"
ADPA v2.0.0 - Enterprise AI-Powered Document Generation

Major Features:
✅ Unified AI Gateway (Google, Groq, OpenAI, Mistral, Claude)
✅ Context-Aware Generation (projects, stakeholders, documents)
✅ Comprehensive Metadata Tracking (quality, cost, performance)
✅ Template Usage Analytics
✅ Enhanced Markdown Rendering
✅ 6,000+ word documents in 30 seconds

Performance:
- 750% longer documents (6K vs 500 words)
- 50% faster generation (20-30s vs 45-60s)
- 5x more AI providers
- 90-98% quality scores

See RELEASE_NOTES_v2.0.0.md for complete details.
"@

git tag -a $version -m $tagMessage
Write-Host "   ✅ Tag $version created" -ForegroundColor Green

# Step 8: Generate changelog entry
Write-Host "`n8️⃣  Updating CHANGELOG.md..." -ForegroundColor Yellow
$changelogEntry = @"
## [2.0.0] - $(Get-Date -Format "yyyy-MM-dd")

### 🎉 Major Release - Enterprise AI

#### Added
- Unified AI Gateway integration (Google, Groq, OpenAI, Mistral, Claude)
- Context-aware document generation
- Comprehensive metadata tracking (AI metrics, content metrics, quality scores)
- Template usage analytics and statistics
- Enhanced Markdown rendering with GitHub Flavored Markdown
- Real-time progress tracking during document generation
- Quality scoring system (0-100% with grades)
- Support for 50,000 character prompts
- Extended template support (100 templates)

#### Improved
- Document generation speed (50% faster)
- Document length (750% increase to 6,000+ words)
- Template loading performance
- Error handling and user feedback
- Database schema with JSONB metadata columns
- Quality and depth of AI-generated content

#### Fixed
- Template loading limit (now 100 instead of 20)
- Markdown table rendering
- Document viewer content display
- PostgreSQL UUID type casting
- Empty date field validation
- Backend hanging during provider validation
- Provider routing issues

#### Changed
- **BREAKING**: Consolidated AI API keys into single AI_GATEWAY_API_KEY
- **BREAKING**: Document content stored as TEXT instead of JSONB
- **BREAKING**: AI service API unified under aiService.generate()
- Template default limit increased from 20 to 100

See [RELEASE_NOTES_v2.0.0.md](RELEASE_NOTES_v2.0.0.md) for detailed information.

"@

# Check if CHANGELOG.md exists
if (Test-Path $changelogFile) {
    $existingChangelog = Get-Content $changelogFile -Raw
    # Insert new entry after the header
    if ($existingChangelog -match "(?s)(# Changelog.*?)(## \[)") {
        $newChangelog = $existingChangelog -replace "(# Changelog.*?)(\n## \[)", "`$1`n`n$changelogEntry`$2"
        $newChangelog | Set-Content $changelogFile -NoNewline
    } else {
        # No existing entries, add after header
        $newChangelog = $existingChangelog + "`n`n" + $changelogEntry
        $newChangelog | Set-Content $changelogFile -NoNewline
    }
    Write-Host "   ✅ CHANGELOG.md updated" -ForegroundColor Green
} else {
    # Create new CHANGELOG.md
    $newChangelog = @"
# Changelog

All notable changes to ADPA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

$changelogEntry

"@
    $newChangelog | Set-Content $changelogFile
    Write-Host "   ✅ CHANGELOG.md created" -ForegroundColor Green
}

# Step 9: Commit version updates
Write-Host "`n9️⃣  Committing Version Updates..." -ForegroundColor Yellow
$versionFiles = @()
if (Test-Path "package.json") { $versionFiles += "package.json" }
if (Test-Path "server/package.json") { $versionFiles += "server/package.json" }
if (Test-Path $changelogFile) { $versionFiles += $changelogFile }

if ($versionFiles.Count -gt 0) {
    git add $versionFiles
    $hasChanges = git diff --cached --quiet; $LASTEXITCODE -ne 0
    
    if ($hasChanges) {
        git commit -m "chore: bump version to 2.0.0 and update changelog"
        Write-Host "   ✅ Version files committed" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  No version changes to commit" -ForegroundColor Cyan
    }
}

# Step 10: Display next steps
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ RELEASE TAG CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1️⃣  Push the tag to GitHub:" -ForegroundColor Cyan
Write-Host "     git push origin $version" -ForegroundColor White
Write-Host ""
Write-Host "  2️⃣  Push the commits:" -ForegroundColor Cyan
Write-Host "     git push origin $currentBranch" -ForegroundColor White
Write-Host ""
Write-Host "  3️⃣  Create GitHub Release:" -ForegroundColor Cyan
Write-Host "     Go to: https://github.com/YOUR-ORG/adpa/releases/new" -ForegroundColor White
Write-Host "     - Tag: $version" -ForegroundColor Gray
Write-Host "     - Title: $releaseName" -ForegroundColor Gray
Write-Host "     - Description: Copy from $releaseNotesFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  4️⃣  Optional - Attach Binaries:" -ForegroundColor Cyan
Write-Host "     - Build Docker images" -ForegroundColor Gray
Write-Host "     - Export database schema" -ForegroundColor Gray
Write-Host "     - Package documentation" -ForegroundColor Gray
Write-Host ""
Write-Host "  5️⃣  Announce the Release:" -ForegroundColor Cyan
Write-Host "     - Share $whatsNewFile with stakeholders" -ForegroundColor Gray
Write-Host "     - Post to team channels" -ForegroundColor Gray
Write-Host "     - Update documentation site" -ForegroundColor Gray
Write-Host ""

# Offer to push automatically
Write-Host "=" * 60 -ForegroundColor Cyan
$autoPush = Read-Host "`nWould you like to push the tag and commits now? (y/n)"

if ($autoPush -eq "y") {
    Write-Host "`n🚀 Pushing to GitHub..." -ForegroundColor Yellow
    
    try {
        Write-Host "   Pushing commits..." -ForegroundColor Cyan
        git push origin $currentBranch
        
        Write-Host "   Pushing tag..." -ForegroundColor Cyan
        git push origin $version
        
        Write-Host "`n   ✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "`n   🌐 Create release at: https://github.com/YOUR-ORG/adpa/releases/new?tag=$version" -ForegroundColor Cyan
    } catch {
        Write-Host "`n   ❌ Failed to push: $_" -ForegroundColor Red
        Write-Host "   You can push manually using the commands above." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n   ℹ️  Remember to push manually using the commands above." -ForegroundColor Cyan
}

Write-Host "`n🎉 Release preparation complete!" -ForegroundColor Green
Write-Host ""

