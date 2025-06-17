#!/bin/bash

# Push to backend repository with intelligent gitignore switching

echo "Preparing backend repository push..."

# Backup current gitignore
cp .gitignore .gitignore.bak

# Switch to backend configuration
cp .gitignore-backend .gitignore

# Add files to backend repo
git --git-dir=.gitman/backend --work-tree=. add -A

# Check if there are changes to commit
if git --git-dir=.gitman/backend --work-tree=. diff --cached --quiet; then
    echo "No changes to commit to backend repository"
else
    # Commit with message from argument or default
    MESSAGE="${1:-Update backend}"
    git --git-dir=.gitman/backend --work-tree=. commit -m "$MESSAGE"
    
    # Push to remote if it exists
    if git --git-dir=.gitman/backend --work-tree=. remote | grep -q origin; then
        echo "Pushing to backend remote..."
        git --git-dir=.gitman/backend --work-tree=. push origin main
    else
        echo "No remote 'origin' configured. Skipping push."
        echo "Add remote with: git --git-dir=.gitman/backend remote add origin <url>"
    fi
fi

# Restore original gitignore
mv .gitignore.bak .gitignore

echo "✓ Backend repository operations complete!"