#!/bin/bash

echo "🚀 Setting up VoyageAI + MongoDB RAG Pipeline"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - VOYAGE_API_KEY (required)"
    echo "   - MONGODB_URI (required)"
    echo "   - OPENAI_API_KEY or ANTHROPIC_API_KEY (optional for LLM responses)"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys and MongoDB URI"
echo "2. Run: npm run setup-db  (to setup database and indexes)"
echo "3. Run: npm run dev        (to start development server)"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🔗 Useful commands:"
echo "   npm run build     - Build TypeScript to JavaScript"
echo "   npm run start     - Start production server"
echo "   npm run search    - Test search performance"
echo "   npm run rag       - Test RAG pipeline"
echo "   npm run setup-db  - Setup database and indexes"
