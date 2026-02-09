# RAG API Test Script
# Tests the RAG ingestion and query endpoints

# Test document ingestion
Write-Host "🧪 Testing RAG Ingestion..." -ForegroundColor Cyan
Write-Host ""

# First, get a test document ID
Write-Host "1️⃣ Fetching a test document..." -ForegroundColor Yellow
$docsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/documents?limit=1" -Method Get
if ($docsResponse.Count -eq 0) {
    Write-Host "❌ No documents found. Please create a document first." -ForegroundColor Red
    exit 1
}

$testDocId = $docsResponse[0].id
$testDocName = $docsResponse[0].name
Write-Host "✅ Found document: $testDocName ($testDocId)" -ForegroundColor Green
Write-Host ""

# Test ingestion
Write-Host "2️⃣ Testing document ingestion..." -ForegroundColor Yellow
try {
    $ingestBody = @{
        document_id = $testDocId
    } | ConvertTo-Json

    $ingestResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/rag/ingest" `
        -Method Post `
        -ContentType "application/json" `
        -Body $ingestBody

    Write-Host "✅ Ingestion successful!" -ForegroundColor Green
    Write-Host "   Chunks created: $($ingestResponse.chunks)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Ingestion failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
    exit 1
}

# Test query
Write-Host "3️⃣ Testing vector search..." -ForegroundColor Yellow
try {
    $queryBody = @{
        query = "project management"
        topK = 3
    } | ConvertTo-Json

    $queryResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/rag/query" `
        -Method Post `
        -ContentType "application/json" `
        -Body $queryBody

    Write-Host "✅ Search successful!" -ForegroundColor Green
    Write-Host "   Results found: $($queryResponse.results.Count)" -ForegroundColor Gray
    Write-Host ""
    
    if ($queryResponse.results.Count -gt 0) {
        Write-Host "📊 Top results:" -ForegroundColor Cyan
        $queryResponse.results | ForEach-Object -Begin { $i = 1 } -Process {
            Write-Host "   Result $i:" -ForegroundColor White
            Write-Host "   - Similarity: $('{0:P2}' -f $_.similarity)" -ForegroundColor Gray
            $preview = $_.content.Substring(0, [Math]::Min(100, $_.content.Length))
            Write-Host "   - Preview: $preview..." -ForegroundColor Gray
            Write-Host ""
            $i++
        }
    }
} catch {
    Write-Host "❌ Query failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
    exit 1
}

Write-Host "🎉 All RAG tests passed!" -ForegroundColor Green
