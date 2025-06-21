#!/bin/bash
set -e

echo "🚀 Pushing to Both Repositories..."
echo ""

# Get commit message first
echo "Enter commit message (this will be used for both repos):"
read -r message

if [ -z "$message" ]; then
    echo "❌ Commit message is required"
    exit 1
fi

# Push to frontend
echo ""
echo "========================================="
echo "📱 FRONTEND REPOSITORY"
echo "========================================="

# Backup current package.json
if [ -f package.json ]; then
    cp package.json package.json.backup
fi

# Use frontend gitignore and package.json
cp .gitignore-frontend .gitignore
cp package.frontend.json package.json

# Stage and commit frontend
export GIT_DIR=.gitman/frontend
export GIT_WORK_TREE=.

git add -A
git commit -m "$message" || echo "No changes in frontend"

# Get current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Push frontend
echo "Pushing frontend to origin/$current_branch..."
git push origin $current_branch || echo "Frontend push failed"

# Restore files
rm .gitignore
if [ -f package.json.backup ]; then
    mv package.json.backup package.json
fi

# Push to backend
echo ""
echo "========================================="
echo "🔐 BACKEND REPOSITORY"
echo "========================================="

# Use backend gitignore
cp .gitignore-backend .gitignore

# Stage and commit backend
export GIT_DIR=.gitman/backend
export GIT_WORK_TREE=.

git add -A
git commit -m "$message" || echo "No changes in backend"

# Push backend
echo "Pushing backend to origin/$current_branch..."
git push origin $current_branch || echo "Backend push failed"

# Restore files
rm .gitignore

echo ""
echo "✅ All repositories updated!"
echo "Frontend: https://github.com/Nickalus12/SovereignLinesIO"
echo "Backend: https://github.com/Nickalus12/SovereignLinesIO-backend"