#!/bin/bash
set -e

echo "🎮 Pushing to Frontend Repository..."

# Backup current package.json
if [ -f package.json ]; then
    cp package.json package.json.backup
fi

# Use frontend gitignore
cp .gitignore-frontend .gitignore

# Copy frontend package.json
cp package.frontend.json package.json

# Stage frontend files
export GIT_DIR=.gitman/frontend
export GIT_WORK_TREE=.

git add -A
echo ""
echo "📋 Git status:"
git status

# Get commit message
echo ""
echo "Enter commit message (or 'skip' to skip commit):"
read -r message

if [ "$message" != "skip" ]; then
    git commit -m "$message" || echo "No changes to commit"
fi

# Ask about pushing
echo ""
echo "Push to remote? (y/n)"
read -r push_confirm

if [ "$push_confirm" = "y" ]; then
    # Get current branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo "Pushing to origin/$current_branch..."
    git push origin $current_branch
fi

# Restore files
rm .gitignore
if [ -f package.json.backup ]; then
    mv package.json.backup package.json
fi

echo "✅ Frontend operation complete!"