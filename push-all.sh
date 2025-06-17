#!/bin/bash

# Push to both frontend and backend repositories

echo "Pushing to both repositories..."
echo "================================"

# Get commit message
MESSAGE="${1:-Sync both repositories}"

# Push to frontend
echo "1. Pushing to frontend..."
./push-frontend.sh "$MESSAGE"

echo ""

# Push to backend
echo "2. Pushing to backend..."
./push-backend.sh "$MESSAGE"

echo ""
echo "✓ All repositories updated!"