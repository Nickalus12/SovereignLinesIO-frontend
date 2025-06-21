#!/bin/bash
# Check status of both repositories

echo "📊 Repository Status"
echo "==================="

for repo in frontend backend; do
    echo ""
    echo "📦 $repo repository:"
    echo "-------------------"
    
    export GIT_DIR=.gitman/$repo
    export GIT_WORK_TREE=.
    
    # Get current branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo "Branch: $current_branch"
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "Status: Uncommitted changes"
        echo ""
        echo "Modified files:"
        git status --porcelain | grep -E "^ M|^M " | cut -c4-
        echo ""
        echo "Untracked files:"
        git status --porcelain | grep "^??" | cut -c4-
    else
        echo "Status: Clean"
    fi
    
    # Check if ahead/behind remote
    if git rev-parse --verify origin/$current_branch >/dev/null 2>&1; then
        ahead=$(git rev-list --count origin/$current_branch..$current_branch)
        behind=$(git rev-list --count $current_branch..origin/$current_branch)
        
        if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
            echo "Remote: $ahead ahead, $behind behind"
        elif [ "$ahead" -gt 0 ]; then
            echo "Remote: $ahead commit(s) ahead"
        elif [ "$behind" -gt 0 ]; then
            echo "Remote: $behind commit(s) behind"
        else
            echo "Remote: Up to date"
        fi
    else
        echo "Remote: No upstream branch"
    fi
done

echo ""
echo "==================="
echo "Use './git-scripts/push-all.sh' to push changes"
echo "Use './git-scripts/switch-branch.sh <branch>' to switch branches"