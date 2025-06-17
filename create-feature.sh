#!/bin/bash

# Create a new feature branch in both repositories

FEATURE="${1}"

if [ -z "$FEATURE" ]; then
    echo "Usage: ./create-feature.sh <feature-name>"
    echo "Example: ./create-feature.sh add-user-auth"
    exit 1
fi

BRANCH="feature/$FEATURE"

echo "Creating feature branch: $BRANCH"
echo "================================"

# Create in frontend
echo "1. Creating branch in frontend..."
git --git-dir=.gitman/frontend --work-tree=. checkout -b "$BRANCH"

# Create in backend
echo "2. Creating branch in backend..."
git --git-dir=.gitman/backend --work-tree=. checkout -b "$BRANCH"

echo ""
echo "✓ Feature branch created: $BRANCH"
echo ""
echo "To push the new branch to remotes:"
echo "  git --git-dir=.gitman/frontend --work-tree=. push -u origin $BRANCH"
echo "  git --git-dir=.gitman/backend --work-tree=. push -u origin $BRANCH"