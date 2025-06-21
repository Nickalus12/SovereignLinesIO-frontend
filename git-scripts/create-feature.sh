#!/bin/bash
# Usage: ./create-feature.sh feature-name

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 user-authentication"
    exit 1
fi

feature_name="feature/$1"

echo "🌳 Creating feature branch: $feature_name"

# Create feature branch in both repos from develop
for repo in frontend backend; do
    export GIT_DIR=.gitman/$repo
    export GIT_WORK_TREE=.
    
    echo ""
    echo "📦 Processing $repo repository..."
    
    # Make sure we're on develop
    git checkout develop
    
    # Pull latest changes
    echo "Pulling latest changes from develop..."
    git pull origin develop || echo "Could not pull from origin (repo might be new)"
    
    # Create and checkout new feature branch
    git checkout -b $feature_name
    
    echo "✅ Created $feature_name in $repo"
done

echo ""
echo "✅ Feature branch '$feature_name' created in both repositories!"
echo ""
echo "You are now on the feature branch. To push it to remote:"
echo "  ./git-scripts/push-all.sh"