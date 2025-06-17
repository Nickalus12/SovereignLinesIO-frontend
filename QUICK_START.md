# Sovereign Lines - Quick Start Guide

## Setup Complete! 🎉

Your Sovereign Lines dual-repository structure is now fully configured and validated.

## Next Steps

### 1. Initialize the Repositories
```bash
./init.sh
```

### 2. Create Your GitHub Repositories

Go to GitHub and create two new **PRIVATE** repositories:
- `SovereignLinesIO-frontend` (will be public, GPL-3.0 licensed)
- `SovereignLinesIO-backend` (will remain private, proprietary)

### 3. Add Remote Origins
```bash
# Add frontend remote
git --git-dir=.gitman/frontend remote add origin https://github.com/Nickalus12/SovereignLinesIO-frontend.git

# Add backend remote  
git --git-dir=.gitman/backend remote add origin https://github.com/Nickalus12/SovereignLinesIO-backend.git
```

### 4. Create Initial Commits
```bash
# Create initial frontend commit
./push-frontend.sh "Initial commit - Sovereign Lines frontend"

# Create initial backend commit
./push-backend.sh "Initial commit - Sovereign Lines backend (proprietary)"
```

### 5. Push to GitHub
The push scripts will automatically push to GitHub if remotes are configured.

## Daily Development Workflow

### Check Status
```bash
./status.sh
```

### Make Changes and Push
```bash
# Push to both repos
./push-all.sh "Your commit message"

# Or push individually
./push-frontend.sh "Frontend changes"
./push-backend.sh "Backend changes"
```

### Feature Development
```bash
# Create feature branch
./create-feature.sh my-new-feature

# Work on your feature...

# Merge back to main/develop
./merge-feature.sh my-new-feature main
```

## Important Notes

1. **Never commit secrets** - The backend repo is private but still follow security best practices
2. **Frontend is public** - Don't include any proprietary logic in frontend code
3. **Use the scripts** - Always use the provided scripts to ensure proper gitignore switching
4. **Regular backups** - The scripts create backups, but consider additional backup strategies

## Repository Structure

- **Frontend** (Public, GPL-3.0):
  - Client-side code
  - Public documentation
  - Frontend CI/CD

- **Backend** (Private, Proprietary):
  - Server code
  - Game logic
  - Security systems
  - Backend CI/CD

## Need Help?

- Check `./validate-setup.sh` to ensure everything is configured correctly
- Review the scripts in this directory for available commands
- See `docs/README.md` for detailed documentation