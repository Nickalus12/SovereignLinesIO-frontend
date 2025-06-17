#!/bin/bash

# Switch branches in both repositories

BRANCH="${1}"

if [ -z "$BRANCH" ]; then
    echo "Usage: ./switch-branch.sh <branch-name>"
    exit 1
fi

echo "Switching to branch: $BRANCH"
echo "============================"

# Switch frontend
echo "1. Switching frontend to $BRANCH..."
git --git-dir=.gitman/frontend --work-tree=. checkout "$BRANCH"

# Switch backend
echo "2. Switching backend to $BRANCH..."
git --git-dir=.gitman/backend --work-tree=. checkout "$BRANCH"

echo ""
echo "✓ Both repositories switched to: $BRANCH"

# Show current status
./status.sh