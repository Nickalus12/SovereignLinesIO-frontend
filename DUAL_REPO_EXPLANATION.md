# Understanding the Dual Repository Setup

## How This Works 🎯

Instead of having two separate folders for frontend and backend, we have **ONE folder** with **TWO git repositories** inside it. This is achieved using Git's `--git-dir` and `--work-tree` features.

```
Sovereign-OpenF/                    <-- Your single working directory
├── .gitman/                        <-- Hidden folder containing both repos
│   ├── frontend/                   <-- Frontend git repository
│   └── backend/                    <-- Backend git repository
├── src/
│   ├── client/                     <-- Frontend code
│   └── server/                     <-- Backend code
├── .gitignore-frontend             <-- Frontend ignore rules
├── .gitignore-backend              <-- Backend ignore rules
└── [all other files]
```

## The Magic ✨

1. **Single Directory**: You work in ONE folder (`Sovereign-OpenF`)
2. **Two Git Repos**: But you have TWO separate git histories
3. **Smart Gitignores**: Each repo ignores different files:
   - Frontend ignores: `/src/server/`, backend configs, etc.
   - Backend ignores: `/src/client/`, frontend docs, etc.

## GitHub Desktop Setup 🖥️

Unfortunately, GitHub Desktop doesn't support this advanced setup directly. You have three options:

### Option 1: Use Command Line (Recommended)
The scripts I created make this easy:
```bash
./status.sh              # Check status of both repos
./push-frontend.sh       # Push frontend changes
./push-backend.sh        # Push backend changes
```

### Option 2: Create Symbolic Links for GitHub Desktop
```bash
# Create separate folders that GitHub Desktop can understand
mkdir ~/GitHubDesktop-Repos
ln -s /mnt/c/Users/Nicka/Desktop/Sovereign-OpenF/.gitman/frontend ~/GitHubDesktop-Repos/SovereignLines-Frontend
ln -s /mnt/c/Users/Nicka/Desktop/Sovereign-OpenF/.gitman/backend ~/GitHubDesktop-Repos/SovereignLines-Backend
```

### Option 3: Use VS Code
VS Code handles this setup perfectly. Install the Git Lens extension for even better support.

## First-Time Push Instructions 🚀

Since you haven't pushed yet, here's exactly what to do:

### Step 1: Create GitHub Repositories
1. Go to https://github.com/new
2. Create `SovereignLinesIO-frontend` (PUBLIC, no initialization)
3. Create `SovereignLinesIO-backend` (PRIVATE, no initialization)

### Step 2: Configure Git Credentials
```bash
# Option A: Use GitHub CLI (easiest)
gh auth login

# Option B: Use credential manager
git config --global credential.helper manager-core

# Option C: Use personal access token
# Create at: https://github.com/settings/tokens
# Save it somewhere safe!
```

### Step 3: Push Both Repositories
```bash
# Push frontend (you'll be prompted for credentials)
git --git-dir=.gitman/frontend --work-tree=. push -u origin main

# Push backend (credentials should be cached)
git --git-dir=.gitman/backend --work-tree=. push -u origin main
```

## Daily Workflow 🔄

### Making Changes
1. Edit files normally in your single directory
2. Use `./status.sh` to see what changed in each repo
3. Push changes:
   ```bash
   ./push-frontend.sh "Fixed UI bug"
   ./push-backend.sh "Updated game logic"
   # or
   ./push-all.sh "Synchronized changes"
   ```

### How Files Are Separated
When you push:
- **Frontend push**: Only includes client code, public assets, frontend docs
- **Backend push**: Only includes server code, game logic, backend configs

The `.gitignore` files are automatically swapped during push to ensure proper separation.

## Visual Guide 📊

```
When you edit a client file (e.g., src/client/Main.ts):
  ↓
./status.sh shows:
  - Frontend: Modified ✓
  - Backend: Clean (ignored)
  ↓
./push-frontend.sh "Updated main menu"
  ↓
Only frontend repo gets the change

When you edit a server file (e.g., src/server/GameServer.ts):
  ↓
./status.sh shows:
  - Frontend: Clean (ignored)
  - Backend: Modified ✓
  ↓
./push-backend.sh "Fixed server crash"
  ↓
Only backend repo gets the change
```

## Troubleshooting 🔧

### "fatal: could not read Username"
You need to set up authentication:
```bash
# Windows
git config --global credential.helper manager-core

# Mac
git config --global credential.helper osxkeychain

# Linux
git config --global credential.helper store
```

### Can't see repos in GitHub Desktop
GitHub Desktop doesn't support `--git-dir` workflows. Use:
- Command line with our scripts
- VS Code with Git Lens
- Any IDE with advanced Git support

### Want to clone on another machine?
```bash
# Clone both repos
git clone https://github.com/Nickalus12/SovereignLinesIO-frontend.git temp-frontend
git clone https://github.com/Nickalus12/SovereignLinesIO-backend.git temp-backend

# Set up the structure
mkdir SovereignLines
cd SovereignLines
mkdir -p .gitman
mv ../temp-frontend/.git .gitman/frontend
mv ../temp-backend/.git .gitman/backend
rm -rf ../temp-frontend ../temp-backend

# Configure
git --git-dir=.gitman/frontend --work-tree=. checkout main
git --git-dir=.gitman/backend --work-tree=. checkout main
```

## Benefits of This Setup 🌟

1. **Single Development Environment**: No juggling between folders
2. **Automatic Separation**: Frontend/backend code stays separate
3. **Shared Resources**: Common files available to both
4. **Clean History**: Each repo has only relevant commits
5. **Security**: Backend stays private, frontend is open source
6. **Professional**: Enterprise-grade setup used by large projects