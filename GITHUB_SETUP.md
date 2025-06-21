# GitHub Repository Setup Instructions

## You're Almost There! 🚀

The dual-repository structure is complete and both repositories have initial commits. Now you need to push them to GitHub.

## Step 1: Create GitHub Repositories

1. Go to [GitHub](https://github.com) and create two new repositories:
   - **Frontend** (Public): `SovereignLinesIO-frontend`
   - **Backend** (Private): `SovereignLinesIO-backend`

2. **IMPORTANT**: Create them as empty repositories (no README, no license, no .gitignore)

## Step 2: Push to GitHub

I've already added the remote origins. Now you need to push:

### Option A: Using Personal Access Token (Recommended)

1. Create a GitHub Personal Access Token:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Create new token with `repo` scope
   - Copy the token

2. Push the repositories:
```bash
# Frontend (public)
git --git-dir=.gitman/frontend --work-tree=. push -u origin main

# Backend (private)
git --git-dir=.gitman/backend --work-tree=. push -u origin main
```

When prompted for credentials:
- Username: your-github-username
- Password: your-personal-access-token

### Option B: Using SSH

1. Change remotes to SSH:
```bash
# Frontend
git --git-dir=.gitman/frontend remote set-url origin git@github.com:Nickalus12/SovereignLinesIO-frontend.git

# Backend
git --git-dir=.gitman/backend remote set-url origin git@github.com:Nickalus12/SovereignLinesIO-backend.git
```

2. Push:
```bash
# Frontend
git --git-dir=.gitman/frontend --work-tree=. push -u origin main

# Backend
git --git-dir=.gitman/backend --work-tree=. push -u origin main
```

## Step 3: Verify

Check both repositories on GitHub:
- Frontend should show GPL-3.0 license
- Backend should show as private with proprietary license

## Current Status

✅ Dual-repository structure created
✅ Initial commits made to both repos:
   - Frontend: `31794e9` - Initial commit - Sovereign Lines Frontend
   - Backend: `728674c` - Initial commit - Sovereign Lines Backend (Proprietary)
✅ Remote origins configured
⏳ Waiting for push to GitHub

## Daily Workflow

After pushing, use the provided scripts:
- `./status.sh` - Check status
- `./push-frontend.sh "message"` - Push frontend changes
- `./push-backend.sh "message"` - Push backend changes
- `./push-all.sh "message"` - Push to both