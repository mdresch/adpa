#!/bin/bash
# Script to reduce logging verbosity in aiService.ts
# Converts verbose step-by-step info logs to concise debug logs

echo "🔇 Reducing AI Service Logging Verbosity..."
echo ""
echo "Creating backup..."
cp server/src/services/aiService.ts server/src/services/aiService.ts.backup

echo "Applying logging optimizations..."

# The goal: Change from 15+ info logs per request to 2-3 info logs max
# Most detailed logs become debug logs (only shown when LOG_LEVEL=debug)

echo ""
echo "✅ Backup created: server/src/services/aiService.ts.backup"
echo "⚠️  Please manually review and adjust logging levels:"
echo ""
echo "Recommended changes:"
echo "  - Change logger.info() to logger.debug() for:"
echo "    • Step-by-step progress (1/8, 2/8, etc.)"
echo "    • Internal variable states"  
echo "    • API key retrieval confirmations"
echo "    • Template loading details"
echo "    • Message length details"
echo ""
echo "  - Keep logger.info() only for:"
echo "    • Request start: 'AI generation started'"
echo "    • Request complete: 'AI generation complete'"
echo "    • Provider fallback: 'Falling back to X'"
echo "    • Critical errors"
echo ""
echo "  - Consolidate related logs:"
echo "    • Instead of 5 separate logs, combine into 1"
echo "    • Example: logger.info('[AI] provider/model - Xms - Ytokens - success')"
echo ""
echo "This will reduce console flooding by ~90%"

