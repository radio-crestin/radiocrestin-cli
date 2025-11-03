#!/bin/bash

# Test script for local development

echo "🔨 Building the project..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting radiocrestin CLI..."
echo "   (Press 'q' or Ctrl+C to quit)"
echo ""

# Run the application
node dist/cli.js
