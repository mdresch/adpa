@echo off
echo 🚀 Setting up VoyageAI + MongoDB RAG Pipeline
echo ==========================================

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected

:: Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

:: Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env >nul
    echo ✅ .env file created
    echo.
    echo ⚠️  Please edit .env file with your configuration:
    echo    - VOYAGE_API_KEY (required)
    echo    - MONGODB_URI (required)
    echo    - OPENAI_API_KEY or ANTHROPIC_API_KEY (optional for LLM responses)
    echo.
) else (
    echo ✅ .env file already exists
)

:: Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs

:: Create uploads directory
echo 📁 Creating uploads directory...
if not exist uploads mkdir uploads

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Edit .env file with your API keys and MongoDB URI
echo 2. Run: npm run setup-db  (to setup database and indexes)
echo 3. Run: npm run dev        (to start development server)
echo.
echo 📚 For more information, see README.md
echo.
echo 🔗 Useful commands:
echo    npm run build     - Build TypeScript to JavaScript
echo    npm run start     - Start production server
echo    npm run search    - Test search performance
echo    npm run rag       - Test RAG pipeline
echo    npm run setup-db  - Setup database and indexes
echo.
pause
