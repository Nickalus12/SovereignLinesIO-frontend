# Sovereign Lines Frontend

The open-source game client for Sovereign Lines.

## Overview

Sovereign Lines is a real-time strategy game where players compete to control territory and build alliances. This repository contains the web-based game client.

## Technology Stack

- **Framework**: Vanilla JavaScript with Web Components
- **Rendering**: Canvas API with WebGL for performance
- **State Management**: Custom event-driven architecture
- **Build Tool**: Webpack 5
- **Styling**: Tailwind CSS
- **Testing**: Jest with jsdom

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/Nickalus12/SovereignLinesIO.git
cd SovereignLinesIO

# Install dependencies
npm install

# Start development server
npm start
```

The game will be available at `http://localhost:8080`

### Building for Production

```bash
npm run build
```

Build artifacts will be in the `static/` directory.

## Project Structure

```
src/client/
├── components/         # Reusable UI components
├── graphics/          # Rendering engine
│   ├── layers/       # Game rendering layers
│   └── fx/           # Visual effects
├── utilities/         # Helper functions
└── Main.ts           # Application entry point
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Guidelines

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests to the `develop` branch

## API Documentation

See [API.md](./API.md) for details on:
- WebSocket protocol
- Server communication
- Client-side events
- Game state management

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](../../src/client/LICENSE-GPL.txt) file for details.

## Community

- Discord: [Join our server](https://discord.gg/sovereign-lines)
- Wiki: [Game Wiki](https://wiki.sovereignlines.io)
- Forums: [Community Forums](https://forums.sovereignlines.io)