#!/bin/bash

# Push to frontend repository with intelligent gitignore and package.json switching

echo "Preparing frontend repository push..."

# Backup current files
cp .gitignore .gitignore.bak
cp package.json package.json.bak

# Switch to frontend configuration
cp .gitignore-frontend .gitignore
cp package.frontend.json package.json

# Add files to frontend repo
git --git-dir=.gitman/frontend --work-tree=. add -A

# Check if there are changes to commit
if git --git-dir=.gitman/frontend --work-tree=. diff --cached --quiet; then
    echo "No changes to commit to frontend repository"
else
    # Commit with message from argument or default
    MESSAGE="${1:-Update frontend}"
    git --git-dir=.gitman/frontend --work-tree=. commit -m "$MESSAGE"
    
    # Push to remote if it exists
    if git --git-dir=.gitman/frontend --work-tree=. remote | grep -q origin; then
        echo "Pushing to frontend remote..."
        git --git-dir=.gitman/frontend --work-tree=. push origin main
    else
        echo "No remote 'origin' configured. Skipping push."
        echo "Add remote with: git --git-dir=.gitman/frontend remote add origin <url>"
    fi
fi

# Restore original files
mv .gitignore.bak .gitignore
mv package.json.bak package.json

echo "✓ Frontend repository operations complete!"