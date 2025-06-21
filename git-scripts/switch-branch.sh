#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <branch-name>"
    echo "Available branches:"
    export GIT_DIR=.gitman/frontend
    git branch -a | grep -v HEAD | sed 's/\*//'
    exit 1
fi

branch_name="$1"

echo "🔄 Switching to branch: $branch_name"

# Switch frontend
echo "📱 Switching frontend..."
export GIT_DIR=.gitman/frontend
export GIT_WORK_TREE=.
git checkout $branch_name

# Switch backend  
echo "🔐 Switching backend..."
export GIT_DIR=.gitman/backend
export GIT_WORK_TREE=.
git checkout $branch_name

echo "✅ Both repositories switched to: $branch_name"