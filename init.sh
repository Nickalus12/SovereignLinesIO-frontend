#!/bin/bash

# Initialize dual repository structure for Sovereign Lines
echo "Initializing Sovereign Lines dual repository structure..."

# Check if .gitman directory exists
if [ ! -d ".gitman" ]; then
    echo "Creating .gitman directory structure..."
    mkdir -p .gitman/frontend
    mkdir -p .gitman/backend
fi

# Initialize frontend repository
echo "Initializing frontend repository..."
cd .gitman/frontend
git init --bare
cd ../..

# Initialize backend repository  
echo "Initializing backend repository..."
cd .gitman/backend
git init --bare
cd ../..

# Set up working tree configurations
echo "Configuring working trees..."
git --git-dir=.gitman/frontend --work-tree=. config core.bare false
git --git-dir=.gitman/backend --work-tree=. config core.bare false

# Configure user settings (inherit from global config)
git --git-dir=.gitman/frontend config user.name "$(git config --global user.name)"
git --git-dir=.gitman/frontend config user.email "$(git config --global user.email)"
git --git-dir=.gitman/backend config user.name "$(git config --global user.name)"
git --git-dir=.gitman/backend config user.email "$(git config --global user.email)"

echo "✓ Dual repository structure initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Add remote origins:"
echo "   git --git-dir=.gitman/frontend remote add origin <frontend-repo-url>"
echo "   git --git-dir=.gitman/backend remote add origin <backend-repo-url>"
echo ""
echo "2. Create initial commits:"
echo "   ./push-frontend.sh  # For frontend"
echo "   ./push-backend.sh   # For backend"