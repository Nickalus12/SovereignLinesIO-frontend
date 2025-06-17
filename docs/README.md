# Sovereign Lines - Dual Repository Structure

This project uses a dual-repository architecture to maintain complete separation between frontend and backend code while allowing development from a single working directory.

## Repository Structure

```
sovereign-lines/
├── .gitman/                    # Git management directories
│   ├── frontend/              # Frontend repository (.git directory)
│   └── backend/               # Backend repository (.git directory)
├── git-scripts/               # Repository management scripts
├── docs/                      # Documentation
│   ├── frontend/             # Frontend-specific docs
│   └── backend/              # Backend-specific docs
└── src/                       # Source code
    ├── client/                # Frontend code (GPL-3.0)
    ├── core/                  # Shared logic (Proprietary)
    └── server/                # Backend code (Proprietary)
```

## Repositories

- **Frontend**: https://github.com/Nickalus12/SovereignLinesIO
- **Backend**: https://github.com/Nickalus12/SovereignLinesIO-backend

## Quick Start

### Initial Setup

```bash
# Initialize both repositories
./git-scripts/init.sh

# Check status of both repos
./git-scripts/status.sh
```

### Daily Workflow

```bash
# Create a new feature branch
./git-scripts/create-feature.sh user-authentication

# Work on your feature...

# Push to both repositories
./git-scripts/push-all.sh

# Or push to specific repository
./git-scripts/push-frontend.sh
./git-scripts/push-backend.sh

# Switch branches
./git-scripts/switch-branch.sh develop

# Merge feature back to develop
./git-scripts/merge-feature.sh user-authentication
```

## Branch Strategy

- `main` - Production-ready code
- `staging` - Pre-production testing
- `develop` - Active development
- `feature/*` - Feature branches

## Architecture

### Frontend (GPL-3.0 License)
- React-based game client
- WebGL rendering engine
- Real-time WebSocket communication
- See [Frontend Documentation](./frontend/README.md)

### Backend (Proprietary License)
- Node.js game server
- WebSocket real-time communication
- PostgreSQL database
- Redis for session management
- See [Backend Documentation](./backend/README.md)

## Security

- Frontend code is open source (GPL-3.0)
- Backend code is proprietary and closed source
- Sensitive configuration and algorithms remain in backend
- See [Security Guidelines](./backend/SECURITY.md)