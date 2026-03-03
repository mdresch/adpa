# Phase 3.1 Assisted Search - PowerShell Test Script
# Run this from PowerShell: . .\scripts\test-phase-3-1-prompts.ps1

# Set your token here or from environment
$Token = $env:ADPA_TOKEN
if (-not $Token) {
    Write-Host "❌ Error: ADPA_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:ADPA_TOKEN = 'your-token-here'" -ForegroundColor Yellow
    exit 1
}

$BackendUrl = "http://localhost:5000"
$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Phase 3.1 Assisted Search - PowerShell Test       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Test helper function
function Test-ContextAssembly {
    param(
        [string]$Query,
        [int]$TestNumber
    )
    
    Write-Host "Test $TestNumber - Context Assembly" -ForegroundColor Green
    Write-Host "Query: $Query" -ForegroundColor White
    Write-Host "─" * 50
    
    try {
        $Body = @{
            query = $Query
            limit = 10
            offset = 0
            includeRelationships = $true
            relationshipDepth = 2
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri "$BackendUrl/api/rag/context-assembly" `
            -Method POST `
            -Headers $Headers `
            -Body $Body
        
        Write-Host "✅ Success - Found $($Response.totalResults) results" -ForegroundColor Green
        
        if ($Response.sources) {
            Write-Host "`n📊 Top Sources:" -ForegroundColor Cyan
            $Response.sources | Select-Object -First 3 | ForEach-Object {
                $rel = [math]::Round($_.relevance * 100, 0)
                Write-Host "  • $($_.title) ($rel% relevance, $($_.relationshipCount) relationships)" -ForegroundColor Gray
            }
        }
        
        if ($Response.followUpSuggestions) {
            Write-Host "`n💡 Suggested Follow-ups:" -ForegroundColor Cyan
            $Response.followUpSuggestions | Select-Object -First 2 | ForEach-Object {
                Write-Host "  • $($_.text)" -ForegroundColor Gray
            }
        }
        
        Write-Host "`n📝 Context Preview (first 200 chars):" -ForegroundColor Cyan
        $preview = $Response.contextPrompt.Substring(0, [Math]::Min(200, $Response.contextPrompt.Length))
        Write-Host "  $preview..." -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
    Write-Host ""
}

function Test-AssistedSearchJson {
    param(
        [string]$Query,
        [int]$TestNumber
    )
    
    Write-Host "Test $TestNumber - Assisted Search (JSON Mode)" -ForegroundColor Magenta
    Write-Host "Query: $Query" -ForegroundColor White
    Write-Host "─" * 50
    
    try {
        $Body = @{
            query = $Query
            limit = 8
            offset = 0
            includeAnswer = $true
            stream = $false
            includeRelationships = $true
            relationshipDepth = 2
        } | ConvertTo-Json
        
        $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $Response = Invoke-RestMethod -Uri "$BackendUrl/api/rag/assisted-search" `
            -Method POST `
            -Headers $Headers `
            -Body $Body
        
        $Stopwatch.Stop()
        
        Write-Host "✅ Success - Found $($Response.totalResults) results (${$Stopwatch.ElapsedMilliseconds}ms)" -ForegroundColor Green
        
        if ($Response.answer) {
            Write-Host "`n🤖 AI Answer (first 300 chars):" -ForegroundColor Cyan
            $answerPreview = $Response.answer.Substring(0, [Math]::Min(300, $Response.answer.Length))
            Write-Host "  $answerPreview..." -ForegroundColor Gray
        }
        
        if ($Response.usage) {
            Write-Host "`n📈 Token Usage:" -ForegroundColor Cyan
            Write-Host "  Input: $($Response.usage.inputTokens), Output: $($Response.usage.outputTokens)" -ForegroundColor Gray
            Write-Host "  Provider: $($Response.providerUsed)" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
    Write-Host ""
}

function Test-AssistedSearchStreaming {
    param(
        [string]$Query,
        [int]$TestNumber
    )
    
    Write-Host "Test $TestNumber - Assisted Search (Streaming Mode)" -ForegroundColor Yellow
    Write-Host "Query: $Query" -ForegroundColor White
    Write-Host "─" * 50
    
    try {
        $Body = @{
            query = $Query
            limit = 8
            offset = 0
            includeAnswer = $true
            stream = $true
            includeRelationships = $true
            relationshipDepth = 2
        } | ConvertTo-Json
        
        $Request = [System.Net.HttpWebRequest]::Create("$BackendUrl/api/rag/assisted-search")
        $Request.Method = "POST"
        $Request.Headers["Authorization"] = "Bearer $Token"
        $Request.ContentType = "application/json"
        
        $RequestStream = $Request.GetRequestStream()
        $RequestBody = [System.Text.Encoding]::UTF8.GetBytes($Body)
        $RequestStream.Write($RequestBody, 0, $RequestBody.Length)
        $RequestStream.Close()
        
        Write-Host "📡 Streaming response:" -ForegroundColor Cyan
        
        $Response = $Request.GetResponse()
        $Reader = New-Object System.IO.StreamReader($Response.GetResponseStream())
        
        $TokenCount = 0
        $ProcessingContext = $false
        
        while ($null -ne ($Line = $Reader.ReadLine())) {
            if ($Line.StartsWith("data: ")) {
                $JsonData = $Line.Substring(6)
                try {
                    $Event = $JsonData | ConvertFrom-Json
                    
                    if ($Event.type -eq "context") {
                        Write-Host "  ✓ Context: $($Event.totalResults) results, $($Event.sources.Count) sources" -ForegroundColor Cyan
                        $ProcessingContext = $true
                    } elseif ($Event.type -eq "token" -and $Event.content) {
                        Write-Host -NoNewline "$($Event.content)"
                        $TokenCount++
                    } elseif ($Event.type -eq "done") {
                        Write-Host "`n  ✓ Done ($TokenCount tokens, $($Event.usage.outputTokens) output tokens)" -ForegroundColor Green
                    }
                } catch {
                    # Ignore parse errors on malformed events
                }
            }
        }
        
        $Reader.Close()
        $Response.Close()
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
    Write-Host ""
}

# Run tests
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Backend: $BackendUrl" -ForegroundColor Gray
Write-Host "  Token: $($Token.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Test connection
try {
    $HealthCheck = Invoke-RestMethod -Uri "$BackendUrl/health" -ErrorAction SilentlyContinue
    Write-Host "✅ Backend connection OK" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend server may not be running" -ForegroundColor Red
    Write-Host "  Run: cd server && npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Run sample tests
$TestNumber = 1

Test-ContextAssembly "What is our AI adoption strategy?" $TestNumber
$TestNumber++

Test-ContextAssembly "Which portfolios have the highest risk?" $TestNumber
$TestNumber++

Test-AssistedSearchJson "How should we prioritize our AI transformation roadmap?" $TestNumber
$TestNumber++

Test-AssistedSearchJson "What are the dependencies between our major programs?" $TestNumber
$TestNumber++

Test-AssistedSearchStreaming "Summarize our key business risks and their mitigation strategies" $TestNumber

Write-Host "═" * 50 -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Yellow
Write-Host "  • Context assembly takes 300-500ms" -ForegroundColor Gray
Write-Host "  • Assisted search (with AI) takes 1-3s" -ForegroundColor Gray
Write-Host "  • Streaming shows tokens in real-time" -ForegroundColor Gray
Write-Host "  • Check server logs for [RAG], [AISearch], [MORPHIC] debug output" -ForegroundColor Gray
Write-Host ""
