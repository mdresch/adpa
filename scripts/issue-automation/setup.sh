#!/bin/bash
# ADPA Issue Automation - Quick Setup Script

echo "🤖 ADPA Issue Automation - Setup"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from scripts/issue-automation/ directory"
    echo ""
    echo "Usage:"
    echo "  cd scripts/issue-automation"
    echo "  bash setup.sh"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check for briefing documents
echo "🔍 Scanning for briefing documents..."
cd ../..
BRIEFING_COUNT=$(find . -type f \( -name "BRIEFING*.md" -o -name "AGENT*BRIEFING*.md" \) -not -path "*/node_modules/*" | wc -l)

echo "📄 Found $BRIEFING_COUNT briefing document(s)"
echo ""

# Validate all briefings
if [ $BRIEFING_COUNT -gt 0 ]; then
    echo "📋 Validating briefing documents..."
    cd scripts/issue-automation
    npm run validate:all
    
    echo ""
    echo "👀 Preview issues that would be created:"
    npm run preview:all
fi

echo ""
echo "=============================="
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Create a new briefing:"
echo "   cd scripts/issue-automation && npm run create"
echo ""
echo "2. Validate your briefing:"
echo "   npm run validate ../../YOUR_BRIEFING.md"
echo ""
echo "3. Preview the issue:"
echo "   npm run preview ../../YOUR_BRIEFING.md"
echo ""
echo "4. Push to GitHub:"
echo "   git add YOUR_BRIEFING.md && git push"
echo ""
echo "5. Watch the magic happen in GitHub Actions!"
echo ""
echo "📖 Full guide: ../../AUTOMATION_GUIDE.md"
echo ""

