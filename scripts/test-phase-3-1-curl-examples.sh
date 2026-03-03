# Phase 3.1 Assisted Search - cURL Examples
# Usage: Copy/paste any example below into your terminal
# 
# Prerequisites:
#   1. Set your token: export ADPA_TOKEN="your-bearer-token"
#   2. Start dev servers: pnpm dev (root) and cd server && npm run dev (backend)
#   3. Ensure backend runs on http://localhost:5000

# ============================================================
# TEST 1: Context Assembly - Portfolio Strategy
# ============================================================
# Returns enriched context WITHOUT AI answer - good for previewing knowledge graph

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is our AI adoption strategy?",
    "limit": 10,
    "offset": 0,
    "includeRelationships": true,
    "relationshipDepth": 2
  }' | jq '.'


# ============================================================
# TEST 2: Context Assembly - Risk Analysis
# ============================================================

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Which portfolios have the highest risk?",
    "limit": 10,
    "offset": 0,
    "includeRelationships": true,
    "relationshipDepth": 2
  }' | jq '.'


# ============================================================
# TEST 3: Assisted Search (JSON) - Strategy with AI Answer
# ============================================================
# Returns context + AI-generated answer as JSON

curl -X POST http://localhost:5000/api/rag/assisted-search \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How should we prioritize our AI transformation roadmap?",
    "limit": 8,
    "offset": 0,
    "includeAnswer": true,
    "stream": false,
    "includeRelationships": true,
    "relationshipDepth": 2
  }' | jq '.'


# ============================================================
# TEST 4: Assisted Search (JSON) - Dependency Analysis
# ============================================================

curl -X POST http://localhost:5000/api/rag/assisted-search \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the dependencies between our major programs?",
    "limit": 8,
    "offset": 0,
    "includeAnswer": true,
    "stream": false,
    "includeRelationships": true,
    "relationshipDepth": 2
  }' | jq '.'


# ============================================================
# TEST 5: Assisted Search (SSE Streaming) - Real-time Tokens
# ============================================================
# Returns context + streams AI answer tokens via Server-Sent Events
# This is the core Phase 3.1 feature - see tokens arrive in real-time

curl -X POST http://localhost:5000/api/rag/assisted-search \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize the key strategic initiatives and their business impact",
    "limit": 8,
    "offset": 0,
    "includeAnswer": true,
    "stream": true,
    "includeRelationships": true,
    "relationshipDepth": 2
  }'


# ============================================================
# TEST 6: Custom Provider Override - Use Ollama Fallback
# ============================================================

curl -X POST http://localhost:5000/api/rag/assisted-search \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is our technology roadmap?",
    "limit": 8,
    "offset": 0,
    "includeAnswer": true,
    "stream": false,
    "provider": "ollama",
    "model": "llama2"
  }' | jq '.'


# ============================================================
# TEST 7: Limited Results - Quick Context
# ============================================================

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Risk management best practices",
    "limit": 3,
    "offset": 0,
    "includeRelationships": false
  }' | jq '.sources[] | {title, relevance}'


# ============================================================
# TEST 8: Pagination - Get Page 2
# ============================================================

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "transformation initiative",
    "limit": 5,
    "offset": 5
  }' | jq '.results[] | {id, type, title, relevance}'


# ============================================================
# TEST 9: Relationship Depth Test - Deep vs Shallow
# ============================================================
# Shallow (depth: 1)

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "digital transformation",
    "limit": 5,
    "offset": 0,
    "includeRelationships": true,
    "relationshipDepth": 1
  }' | jq '.contextPrompt | length'

# Deep (depth: 3)

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "digital transformation",
    "limit": 5,
    "offset": 0,
    "includeRelationships": true,
    "relationshipDepth": 3
  }' | jq '.contextPrompt | length'


# ============================================================
# TEST 10: No Authentication Error Test
# ============================================================
# Should return 401 Unauthorized

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq '.'


# ============================================================
# TEST 11: Invalid Query (Empty) Error Test
# ============================================================
# Should return 400 Bad Request

curl -X POST http://localhost:5000/api/rag/context-assembly \
  -H "Authorization: Bearer $ADPA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": ""}' | jq '.'


# ============================================================
# HELPER: Check Server Health
# ============================================================

curl http://localhost:5000/health | jq '.'


# ============================================================
# TIPS FOR USING THESE QUERIES
# ============================================================
# 
# 1. Set your token first:
#    export ADPA_TOKEN="your-jwt-token-from-localStorage"
#
# 2. Watch server logs for debug output:
#    [RAG] Assembling context...
#    [AISearch] Enriching from Neo4j...
#    [MORPHIC] Streaming response...
#
# 3. Test streaming with -N flag to see real-time output:
#    curl -N -X POST ...
#
# 4. Pretty-print responses:
#    ... | jq '.'
#
# 5. Extract specific fields:
#    ... | jq '.sources[] | {title, relevance}'
#
# 6. Measure latency:
#    time curl -X POST ...
#
# 7. Check response headers:
#    curl -i -X POST ...
#
# 8. Full debug mode:
#    curl -v -X POST ...
