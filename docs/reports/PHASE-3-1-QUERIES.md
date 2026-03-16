# Phase 3.1 Assisted Search - Quick Start Guide

## Sample Queries Overview

This guide provides sample queries and test scripts to demonstrate Phase 3.1 capabilities.

---

## 📋 Sample Query Categories

### **Strategic & Portfolio Planning**
- "What is our AI adoption strategy?"
- "Which portfolios have the highest risk?"
- "Show me all active transformation initiatives"
- "How should we prioritize our AI transformation roadmap?"

### **Risk & Governance**
- "Summarize our key business risks"
- "What compliance issues need attention?"
- "How are our programs aligned with strategy?"
- "What is our top AI risk?"

### **Dependencies & Impact**
- "What are the dependencies between our major programs?"
- "Which projects are blocking other critical work?"
- "What is the impact of delaying this initiative?"
- "Show resource constraints across the portfolio"

### **People & Skills**
- "What skills do we need for our AI roadmap?"
- "Which roles have the highest vacancy rates?"
- "Show me teams working on digital transformation"
- "What training is needed for cloud migration?"

### **Performance & Optimization**
- "Which initiatives are underperforming?"
- "What quick wins should we tackle first?"
- "Where are we over-investing?"
- "Show me opportunities for consolidation"

---

## 🚀 Quick Start: Run Tests Now

### **Option 1: PowerShell (Windows - Easiest)**

```powershell
# 1. Set your token
$env:ADPA_TOKEN = "your-jwt-token-from-browser"

# 2. Run the interactive test script
. .\scripts\test-phase-3-1-prompts.ps1
```

**What to expect:**
- 5 automated tests with real queries
- Context preview, JSON response, and streaming demos
- Shows results, sources, and AI answers
- Timing information (latency metrics)

---

### **Option 2: REST Client (VS Code - Visual)**

1. Install VS Code extension: **REST Client** (Huachao Mao)
2. Open file: `scripts/test-phase-3-1-rest-client.http`
3. Update token at top: `@token = your-jwt-token-here`
4. Right-click any request → **Send Request**
5. View response in sidebar

**What to expect:**
- Direct HTTP responses with full headers
- See response time metrics
- Test streaming with live event stream view
- Easy to modify and re-test

---

### **Option 3: curl Commands (Terminal)**

```bash
# 1. Set token
export ADPA_TOKEN="your-jwt-token-here"

# 2. Copy any example from scripts/test-phase-3-1-curl-examples.sh
# 3. Paste into terminal and run

# Example:
curl -X POST http://localhost:5000/api/rag/context-assembly `
  -H "Authorization: Bearer $ADPA_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"query":"What is our AI strategy?","limit":10}'
```

---

### **Option 4: Node.js/TypeScript (Programmatic)**

```bash
# 1. Set token in env
$env:ADPA_TOKEN = "your-jwt-token-here"

# 2. Run test harness
npx ts-node scripts/test-phase-3-1-prompts.ts
```

**What to expect:**
- Automated parsing of SSE events
- Real-time token streaming display
- Full flow testing (context → answer)
- Error handling validation

---

## 🎯 Recommended Test Sequence

### **Phase 1: Health Check** (1 min)
```powershell
# Verify backend is running
curl http://localhost:5000/health
```

If fails: `cd server && npm run dev`

---

### **Phase 2: Basic Context Assembly** (2 min)
```powershell
# Test context enrichment without AI
$env:ADPA_TOKEN = "your-token"
. .\scripts\test-phase-3-1-prompts.ps1

# First test will show:
# ✅ Found X results
# 📊 Top Sources
# 💡 Suggested Follow-ups
# 📝 Context Prompt
```

**What this demonstrates:**
- Knowledge graph search works
- Neo4j enrichment active
- Relationship extraction successful
- Context prompt generation correct

---

### **Phase 3: AI-Generated Answers (JSON)** (3 min)
```powershell
# Continue with test script or run manually:

curl -X POST http://localhost:5000/api/rag/assisted-search `
  -H "Authorization: Bearer $env:ADPA_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "query": "How should we prioritize our AI transformation roadmap?",
    "includeAnswer": true,
    "stream": false
  }'
```

**What this demonstrates:**
- AI model invoked with context
- Answer generated based on knowledge graph
- Token usage tracked
- Provider selection working

---

### **Phase 4: Streaming (Real-time Tokens)** (3 min)
```powershell
# The Phase 3.1 centerpiece - real-time token delivery

curl -N -X POST http://localhost:5000/api/rag/assisted-search `
  -H "Authorization: Bearer $env:ADPA_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "query": "Summarize our key strategic initiatives",
    "includeAnswer": true,
    "stream": true
  }'
```

**What this demonstrates:**
- SSE (Server-Sent Events) working
- Context metadata sent first
- Tokens stream in real-time
- Done event with usage stats
- ~5-10s for full response

---

## 📊 Expected Performance

| Operation | Latency | Typical | Peak |
|-----------|---------|---------|------|
| Context Assembly | 300-500ms | 400ms | 800ms |
| Neo4j Enrichment | 150-300ms | 200ms | 500ms |
| AI Generation | 1-3s | 2s | 5s |
| Streaming (first token) | 1-2s | 1.5s | 3s |
| Full streaming response | 3-8s | 5s | 12s |
| SSE Event parsing | <10ms | 5ms | 20ms |

---

## 🔍 What Success Looks Like

### **Context Assembly Response**
```json
{
  "success": true,
  "query": "What is our AI adoption strategy?",
  "totalResults": 42,
  "results": [
    {
      "id": "portfolio-123",
      "type": "portfolio",
      "title": "Strategic Portfolio",
      "relevance": 0.95,
      "relationships": [
        { "type": "contains", "target": "program-456" },
        { "type": "depends-on", "target": "capability-789" }
      ]
    }
  ],
  "sources": [
    { "title": "Strategic Portfolio", "relevance": 0.95, "relationshipCount": 8 },
    { "title": "AI Initiative 2026", "relevance": 0.87, "relationshipCount": 5 }
  ],
  "followUpSuggestions": [
    { "text": "Explore risk mitigation", "relatedEntity": "Risk-42" },
    { "text": "View capability roadmap", "relatedEntity": "Capability-89" }
  ],
  "contextPrompt": "Based on the knowledge graph...[enriched context]"
}
```

### **Assisted Search JSON Response**
```json
{
  "success": true,
  ...context fields...,
  "answer": "Our AI adoption strategy focuses on...[full AI answer]",
  "providerUsed": "claude",
  "usage": {
    "inputTokens": 2150,
    "outputTokens": 487
  }
}
```

### **Streaming Response (SSE)**
```
data: {"type":"context","totalResults":42,"sources":[...],"followUpSuggestions":[...]}

data: {"type":"token","content":"Our"}
data: {"type":"token","content":" AI"}
data: {"type":"token","content":" adoption"}
...
data: {"type":"done","usage":{"inputTokens":2150,"outputTokens":487},"provider":"claude"}
```

---

## 🐛 Troubleshooting

### **"Module not found" error**
- **Cause:** Dev server lingering on old code
- **Fix:** Kill processes and restart
  ```powershell
  Get-Process "node" | Stop-Process -Force
  pnpm dev
  ```

### **401 Unauthorized**
- **Cause:** Invalid or missing token
- **Fix:** Get fresh token from browser localStorage
  ```javascript
  // In browser console:
  localStorage.getItem('token')
  ```

### **500 Server Error**
- **Cause:** Backend service failure (Neo4j, Redis, AI provider)
- **Fix:** Check server logs for [RAG], [AISearch] output
  ```bash
  cd server && npm run dev
  # Look for error traces
  ```

### **Streaming shows only context**
- **Cause:** AI generation disabled or failed
- **Fix:** Check server logs; ensure AI provider configured
  - Valid API keys in `.env`
  - Ollama running if using local fallback

### **Slow responses (>5s context assembly)**
- **Cause:** Neo4j query heavy, network latency
- **Fix:** 
  - Reduce `relationshipDepth` to 1
  - Reduce `limit` to 5
  - Check Neo4j query performance

---

## 📈 Performance Tuning

### **Fast Context** (< 300ms)
```json
{
  "query": "...",
  "limit": 3,
  "includeRelationships": false
}
```

### **Balanced** (400-600ms)
```json
{
  "query": "...",
  "limit": 8,
  "includeRelationships": true,
  "relationshipDepth": 2
}
```

### **Comprehensive** (1-2s)
```json
{
  "query": "...",
  "limit": 15,
  "includeRelationships": true,
  "relationshipDepth": 3
}
```

---

## 📝 Test Matrix

| Test File | Language | Platform | Use Case |
|-----------|----------|----------|----------|
| `test-phase-3-1-prompts.ps1` | PowerShell | Windows | Interactive GUI-style testing |
| `test-phase-3-1-prompts.ts` | TypeScript | All | Programmatic validation |
| `test-phase-3-1-curl-examples.sh` | Bash | Linux/Mac | Simple one-liners |
| `test-phase-3-1-rest-client.http` | HTTP | VS Code | Visual REST requests |

---

## 🎓 Next Steps

### **To Demo Phase 3.1:**
1. Run PowerShell script: `.\scripts\test-phase-3-1-prompts.ps1`
2. Show context assembly (sources, relationships)
3. Show JSON response (full answer with tokens)
4. Show streaming (real-time tokens arriving)
5. Compare response times between modes

### **To Integrate into UI:**
- Context assembly endpoint: Used by chat UI to show preview
- Assisted search endpoint: Used by Morphic to inject context
- Streaming mode: Used for long-running responses

### **To Write Tests:**
- See [../../../recommendations.md](recommended test cases from first response)
- Run: `npm test -- --testPathPattern="phase-3|rag|assisted"`
- Add custom assertions for your use cases

---

## 📚 Additional Resources

- **API Docs:** [server/src/routes/ragRoutes.ts](../../server/src/routes/ragRoutes.ts)
- **Service Logic:** [server/src/services/aiSearchRAGService.ts](../../server/src/services/aiSearchRAGService.ts)
- **UI Integration:** [components/morphic/chat.tsx](../../components/morphic/chat.tsx)
- **Streaming Setup:** [lib/morphic/streaming/](../../lib/morphic/streaming/)

---

**Happy testing! 🚀**
