#!/bin/bash

# Sovereign Lines Dual Repository Setup Validation Script
# This script validates the complete setup and ensures everything is properly configured

echo "========================================="
echo "Sovereign Lines Setup Validation"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation counters
PASSED=0
FAILED=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAILED++))
    fi
}

# Function to check file contains text
check_contains() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing: $2"
        ((FAILED++))
    fi
}

# Function to check file doesn't contain text
check_not_contains() {
    if ! grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 doesn't contain: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 still contains: $2"
        ((FAILED++))
    fi
}

echo "1. Checking Git Directory Structure"
echo "-----------------------------------"
check_dir ".gitman"
check_dir ".gitman/frontend"
check_dir ".gitman/backend"

echo ""
echo "2. Checking Git Scripts"
echo "-----------------------"
check_file "init.sh"
check_file "push-frontend.sh"
check_file "push-backend.sh"
check_file "push-all.sh"
check_file "switch-branch.sh"
check_file "create-feature.sh"
check_file "merge-feature.sh"
check_file "status.sh"

echo ""
echo "3. Checking Gitignore Files"
echo "---------------------------"
check_file ".gitignore"
check_file ".gitignore-frontend"
check_file ".gitignore-backend"

echo ""
echo "4. Checking Package Files"
echo "-------------------------"
check_file "package.json"
check_file "package.frontend.json"
check_file "package.backend.json"

echo ""
echo "5. Checking Documentation"
echo "-------------------------"
check_file "CLAUDE.md"
check_file "LICENSE"
check_file "README.md"
check_file "docs/README.md"
check_file "docs/frontend/README.md"
check_file "docs/frontend/CONTRIBUTING.md"
check_file "docs/frontend/API.md"
check_file "docs/backend/README.md"
check_file "docs/backend/ARCHITECTURE.md"
check_file "docs/backend/DEPLOYMENT.md"
check_file "docs/backend/SECURITY.md"

echo ""
echo "6. Checking GitHub Actions"
echo "--------------------------"
check_dir ".github"
check_dir ".github/frontend"
check_dir ".github/backend"
check_file ".github/frontend/workflows/ci.yml"
check_file ".github/backend/workflows/ci.yml"
check_file ".github/workflows/dependabot.yml"

echo ""
echo "7. Checking License Configuration"
echo "---------------------------------"
check_contains "LICENSE" "PROPRIETARY SOFTWARE LICENSE"
check_contains "package.json" "\"license\": \"SEE LICENSE IN LICENSE\""
check_contains "package.frontend.json" "\"license\": \"GPL-3.0\""
check_contains "package.backend.json" "\"license\": \"PROPRIETARY\""

echo ""
echo "8. Checking Name Changes"
echo "------------------------"
check_contains "package.json" "sovereign-lines"
check_contains "README.md" "Sovereign Lines"
check_not_contains "package.json" "openfront"
check_not_contains "README.md" "OpenFront"
check_file "resources/images/SovereignLinesLogo.svg"
check_file "resources/images/SovereignLinesLogoDark.svg"

echo ""
echo "9. Checking No Old Git History"
echo "------------------------------"
if [ ! -d ".git" ]; then
    echo -e "${GREEN}✓${NC} No .git directory found (good)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} .git directory still exists"
    ((FAILED++))
fi

echo ""
echo "10. Checking Script Permissions"
echo "-------------------------------"
for script in init.sh push-frontend.sh push-backend.sh push-all.sh switch-branch.sh create-feature.sh merge-feature.sh status.sh; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} $script is executable"
        ((PASSED++))
    else
        echo -e "${YELLOW}!${NC} $script is not executable (run: chmod +x $script)"
        ((FAILED++))
    fi
done

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo ""
    echo "Your Sovereign Lines dual-repository setup is complete."
    echo ""
    echo "Next steps:"
    echo "1. Make scripts executable: chmod +x *.sh"
    echo "2. Initialize repositories: ./init.sh"
    echo "3. Create initial commits in both repos"
    echo "4. Add remote origins for both repositories"
    echo "5. Push to GitHub"
    echo ""
    echo "Repository URLs (update after creating on GitHub):"
    echo "- Frontend: https://github.com/Nickalus12/SovereignLinesIO-frontend.git"
    echo "- Backend: https://github.com/Nickalus12/SovereignLinesIO-backend.git"
else
    echo -e "${RED}✗ Some validation checks failed. Please fix the issues above.${NC}"
    exit 1
fi