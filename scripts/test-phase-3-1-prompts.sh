#!/bin/bash
# Phase 3.1 Assisted Search - Sample Query Script
# Prerequisites: Auth token in ADPA_TOKEN env var, dev servers running on localhost:3000 (frontend) and localhost:5000 (backend)

# Set your token here or via environment variable
TOKEN="${ADPA_TOKEN:-your-bearer-token-here}"
BACKEND_URL="http://localhost:5000"

echo "========================================="
echo "Phase 3.1 Assisted Search - Sample Queries"
echo "========================================="
echo ""

# Helper function to make API calls
call_api() {
  local endpoint=$1
  local query=$2
  local extra_params=$3
  
  echo "📋 Query: $query"
  echo "---"
  
  curl -X POST "$BACKEND_URL/api/rag/$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\", \"limit\": 10, \"offset\": 0, \"includeRelationships\": true, \"relationshipDepth\": 2 $extra_params}" \
    2>/dev/null | jq '.' | head -50
  
  echo ""
  echo "---"
  echo ""
}

# ==================================================
# Test 1: Context Assembly (no AI answer)
# ==================================================
echo "🔍 TEST 1: Context Assembly (Preview Mode)"
echo "This endpoint returns enriched search context WITHOUT AI generation"
echo ""

call_api "context-assembly" "What is our AI adoption strategy?"
call_api "context-assembly" "Which portfolios have the highest risk?"
call_api "context-assembly" "Show me all active transformation initiatives"

# ==================================================
# Test 2: Assisted Search (JSON Mode)
# ==================================================
echo "✨ TEST 2: Assisted Search (JSON Response Mode)"
echo "This endpoint returns context + AI-generated answer as JSON"
echo ""

call_api "assisted-search" "Summarize our key business risks" ", \"includeAnswer\": true, \"stream\": false"
call_api "assisted-search" "What are the dependencies between our major programs?" ", \"includeAnswer\": true, \"stream\": false"

# ==================================================
# Test 3: Assisted Search (SSE Streaming)
# ==================================================
echo "⚡ TEST 3: Assisted Search (SSE Streaming Mode)"
echo "This endpoint streams tokens in real-time via Server-Sent Events"
echo ""

echo "📋 Query: How should we prioritize our AI transformation roadmap?"
echo "---"

curl -X POST "$BACKEND_URL/api/rag/assisted-search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How should we prioritize our AI transformation roadmap?", "includeAnswer": true, "stream": true, "limit": 8}' \
  2>/dev/null

echo ""
echo "---"
echo ""

echo "✅ Completed sample queries!"
echo ""
echo "💡 Tips:"
echo "  • Replace ADPA_TOKEN with your Bearer token"
echo "  • Ensure dev servers are running (pnpm dev from root and server/)"
echo "  • Check server logs for debug output: [MORPHIC], [AISearch], [RAG]"
echo "  • Context assembly takes 300-500ms, assisted search takes 1-3s with streaming"
