#!/bin/bash

# Show status of both repositories

echo "Sovereign Lines Repository Status"
echo "================================="
echo ""

# Frontend status
echo "FRONTEND Repository:"
echo "-------------------"
echo -n "Branch: "
git --git-dir=.gitman/frontend --work-tree=. branch --show-current
echo -n "Status: "
if git --git-dir=.gitman/frontend --work-tree=. diff --quiet && git --git-dir=.gitman/frontend --work-tree=. diff --cached --quiet; then
    echo "Clean"
else
    echo "Modified"
    git --git-dir=.gitman/frontend --work-tree=. status --short
fi
echo ""

# Backend status
echo "BACKEND Repository:"
echo "------------------"
echo -n "Branch: "
git --git-dir=.gitman/backend --work-tree=. branch --show-current
echo -n "Status: "
if git --git-dir=.gitman/backend --work-tree=. diff --quiet && git --git-dir=.gitman/backend --work-tree=. diff --cached --quiet; then
    echo "Clean"
else
    echo "Modified"
    git --git-dir=.gitman/backend --work-tree=. status --short
fi
echo ""

# Show remotes if configured
echo "Remote Repositories:"
echo "-------------------"
echo -n "Frontend: "
git --git-dir=.gitman/frontend --work-tree=. remote get-url origin 2>/dev/null || echo "Not configured"
echo -n "Backend: "
git --git-dir=.gitman/backend --work-tree=. remote get-url origin 2>/dev/null || echo "Not configured"