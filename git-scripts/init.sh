#!/bin/bash
# Initialize dual repository structure for Sovereign Lines

set -e

echo "🚀 Initializing Sovereign Lines dual repository structure..."

# Create git directories
mkdir -p .gitman/frontend
mkdir -p .gitman/backend

# Initialize frontend repo
echo "📱 Initializing frontend repository..."
cd .gitman/frontend
git init --bare
cd ../..
git init
git config core.bare false
git config core.worktree "../.."
mv .git/* .gitman/frontend/
rm -rf .git

# Initialize backend repo
echo "🔐 Initializing backend repository..."
cd .gitman/backend
git init --bare
cd ../..
git init
git config core.bare false
git config core.worktree "../.."
mv .git/* .gitman/backend/
rm -rf .git

# Set up remotes
echo "🔗 Setting up remote repositories..."
export GIT_DIR=.gitman/frontend
git remote add origin https://github.com/Nickalus12/SovereignLinesIO.git

export GIT_DIR=.gitman/backend
git remote add origin https://github.com/Nickalus12/SovereignLinesIO-backend.git

# Create branch structure for both repos
echo "🌳 Creating branch structure..."
for repo in frontend backend; do
    export GIT_DIR=.gitman/$repo
    git checkout -b develop
    git checkout -b staging
    git checkout develop
    echo "✅ Branches created for $repo repository"
done

echo "✅ Dual repository structure initialized successfully!"
echo ""
echo "Frontend repository: .gitman/frontend"
echo "Backend repository: .gitman/backend"
echo ""
echo "Next steps:"
echo "1. Run initial commits with: ./git-scripts/initial-commit.sh"
echo "2. Push to remotes with: ./git-scripts/push-all.sh"