#!/bin/bash

# Merge feature branch back to develop/main in both repositories

FEATURE="${1}"
TARGET="${2:-develop}"

if [ -z "$FEATURE" ]; then
    echo "Usage: ./merge-feature.sh <feature-name> [target-branch]"
    echo "Example: ./merge-feature.sh add-user-auth develop"
    exit 1
fi

# Determine if feature name includes 'feature/' prefix
if [[ "$FEATURE" == feature/* ]]; then
    BRANCH="$FEATURE"
else
    BRANCH="feature/$FEATURE"
fi

echo "Merging $BRANCH into $TARGET"
echo "================================"

# Frontend merge
echo "1. Merging in frontend repository..."
git --git-dir=.gitman/frontend --work-tree=. checkout "$TARGET"
git --git-dir=.gitman/frontend --work-tree=. merge "$BRANCH"

# Backend merge
echo "2. Merging in backend repository..."
git --git-dir=.gitman/backend --work-tree=. checkout "$TARGET"
git --git-dir=.gitman/backend --work-tree=. merge "$BRANCH"

echo ""
echo "✓ Feature merged successfully!"
echo ""
echo "Next steps:"
echo "1. Push changes: ./push-all.sh"
echo "2. Delete feature branch locally:"
echo "   git --git-dir=.gitman/frontend --work-tree=. branch -d $BRANCH"
echo "   git --git-dir=.gitman/backend --work-tree=. branch -d $BRANCH"
echo "3. Delete feature branch on remote:"
echo "   git --git-dir=.gitman/frontend --work-tree=. push origin --delete $BRANCH"
echo "   git --git-dir=.gitman/backend --work-tree=. push origin --delete $BRANCH"