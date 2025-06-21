# Development Setup Guide

## Quick Start

### Windows Users
**Option 1: Use the batch file (Recommended)**
```
Double-click `start.bat` or run from PowerShell:
.\start.bat
```

**Option 2: Use npm scripts**
```powershell
# Try this first
npm run dev

# If concurrently doesn't work, run separately:
npm run start:client    # In one terminal
npm run start:server-dev # In another terminal
```

### WSL/Linux/Mac Users
**Option 1: Use the shell script**
```bash
./start.sh
```

**Option 2: Use npm scripts**
```bash
npm run dev
```

## Access Points
- **Game Client**: http://localhost:9000
- **Server API**: http://localhost:3000
- **Webpack Dev Server**: Hot reload enabled

## Available Commands

### Development
- `npm run dev` - Start both client and server (uses concurrently)
- `npm run start:client` - Start only the webpack dev server
- `npm run start:server-dev` - Start only the server with hot reload
- `npm run dev:safe` - Start only client (if server issues)

### Building
- `npm run build-dev` - Build client for development
- `npm run build-prod` - Build client for production

### Code Quality
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Troubleshooting

### If `npm run dev` doesn't work:
1. **Windows PowerShell**: Use `start.bat` instead
2. **Permission issues**: Run as administrator
3. **Port conflicts**: Check if ports 3000 or 9000 are in use

### If you get "concurrently not found":
Run these commands separately:
```bash
npm run start:client     # Terminal 1
npm run start:server-dev # Terminal 2
```

### If server fails to start:
Check that you have a `.env` file with the required environment variables (see `example.env`).