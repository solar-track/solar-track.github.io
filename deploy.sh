#!/bin/bash

# Quick deployment script for SolarTrack Demo
# Usage: ./deploy.sh "Your commit message"

set -e  # Exit on error

# Check if commit message provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

echo "🚀 SolarTrack Demo - Quick Deploy"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the solartrack_demo directory?"
    exit 1
fi

echo "📝 Committing changes..."
git add .
git commit -m "$COMMIT_MSG" || echo "   (No changes to commit)"

echo ""
echo "⬆️  Pushing to GitHub..."
git push origin main

echo ""
echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "🌐 Deploying to GitHub Pages..."
npm run deploy

echo ""
echo "=================================="
echo "✅ Deployment complete!"
echo "=================================="
echo ""
echo "Your demo will be live in ~1 minute at:"
echo "https://yourusername.github.io/solartrack-demo/"
echo ""
echo "Note: First deployment might take 2-3 minutes."



