#!/bin/bash

echo "🔄 Updating Next.js and related dependencies..."

# Remove node_modules and package-lock.json to ensure clean install
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies
echo "📦 Installing updated dependencies..."
npm install

# Verify Next.js version
echo "✅ Verifying Next.js version..."
npx next --version

echo "🎉 Dependencies updated successfully!"
echo "You can now run 'npm run dev' to start the development server."