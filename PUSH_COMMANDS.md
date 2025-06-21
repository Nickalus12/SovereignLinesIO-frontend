# Push Commands - Ready to Copy & Paste

## Prerequisites
1. Create both GitHub repositories first (empty, no README)
2. Have your GitHub username and personal access token ready

## Push Commands

Copy and run these commands one at a time:

### 1. Push Frontend (Public Repository)
```bash
git --git-dir=.gitman/frontend --work-tree=. push -u origin main
```

When prompted:
- Username: `Nickalus12`
- Password: [Your Personal Access Token]

### 2. Push Backend (Private Repository)
```bash
git --git-dir=.gitman/backend --work-tree=. push -u origin main
```

The credentials should be cached from the first push.

## Create Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Give it a name: "Sovereign Lines Push"
3. Select scopes:
   - ✓ repo (Full control of private repositories)
4. Click "Generate token"
5. **COPY THE TOKEN IMMEDIATELY** (you won't see it again)

## Alternative: Use GitHub CLI

If you have GitHub CLI installed:
```bash
# Login first
gh auth login

# Then push using git commands above
```

## Verify Success

After pushing, you should see:
- Frontend: https://github.com/Nickalus12/SovereignLinesIO-frontend
- Backend: https://github.com/Nickalus12/SovereignLinesIO-backend

Both should show their initial commits!