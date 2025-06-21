#!/bin/bash
# Merge a feature branch back to develop

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 user-authentication"
    echo ""
    echo "Available feature branches:"
    export GIT_DIR=.gitman/frontend
    git branch -a | grep feature/ | sed 's/\*//'
    exit 1
fi

feature_name="feature/$1"

echo "🔀 Merging $feature_name to develop"

# Process both repos
for repo in frontend backend; do
    export GIT_DIR=.gitman/$repo
    export GIT_WORK_TREE=.
    
    echo ""
    echo "📦 Processing $repo repository..."
    
    # Switch to develop
    git checkout develop
    
    # Pull latest
    git pull origin develop || echo "Could not pull (repo might be new)"
    
    # Merge feature branch
    echo "Merging $feature_name..."
    git merge $feature_name --no-ff -m "Merge $feature_name into develop"
    
    # Ask about deleting branch
    echo ""
    echo "Delete local feature branch $feature_name? (y/n)"
    read -r delete_confirm
    
    if [ "$delete_confirm" = "y" ]; then
        git branch -d $feature_name
        echo "✅ Deleted local branch $feature_name"
    fi
done

echo ""
echo "✅ Feature merged successfully!"
echo "Don't forget to push the changes:"
echo "  ./git-scripts/push-all.sh"