# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sovereign Lines is an online real-time strategy game focused on territorial control and alliance building. This is a fork/rewrite of WarFront.io, featuring:
- Real-time multiplayer gameplay with WebSocket communication
- Territory expansion and resource management
- Alliance systems and strategic battles
- Multiple geographical maps

## Development Commands

### Running the Application
```bash
# Development (client + server with hot reload)
npm run dev

# Client only with hot reload
npm run start:client

# Server only in development mode
npm run start:server-dev

# Production build and server
npm run build-prod
npm run start:server
```

### Code Quality
```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint code
npm run lint

# Lint and auto-fix
npm run lint:fix

# Format code with Prettier
npm run format
```

### Building
```bash
# Development build
npm run build-dev

# Production build
npm run build-prod

# Generate terrain maps
npm run build-map
```

## Architecture

### Directory Structure
- **`/src/client`** (GPL v3 License): Frontend game client
  - `Main.ts`: Entry point for client application
  - `ClientGameRunner.ts`: Main game loop and coordination
  - `/graphics`: Rendering system with layers (UI, terrain, units, etc.)
  - `/components`: Reusable UI components with base classes
  - WebSocket-based real-time communication via `Transport.ts`

- **`/src/core`**: Shared game logic (proprietary)
  - `/game`: Core game state and entities (Game, Player, Unit, etc.)
  - `/execution`: Command pattern implementations for all game actions
  - `/pathfinding`: A* pathfinding algorithms
  - `/configuration`: Game configuration and themes
  - Shared schemas and validation between client/server

- **`/src/server`**: Backend game server (proprietary)
  - `Server.ts`: Main server entry point
  - `GameServer.ts`: Individual game instance management
  - `Client.ts`: Player connection handling
  - WebSocket-based real-time communication
  - JWT authentication system

### Key Architectural Patterns

1. **Command Pattern**: All game actions are executed through command classes in `/execution`
2. **Layer-based Rendering**: Client uses multiple rendering layers for efficient updates
3. **Shared Core Logic**: Game logic is shared between client/server via the core module
4. **Real-time Synchronization**: WebSocket messages with msgpack5 serialization
5. **Web Workers**: Heavy computations offloaded to workers (pathfinding, game updates)

### Testing Requirements
- All code changes in `src/core` MUST have tests
- Tests use Jest with TypeScript support
- Test files located in `/tests` directory
- Run single test: `npm test -- path/to/test.test.ts`

## Important Development Notes

1. **Licensing**: Client = GPL v3, Server/core = proprietary
2. **TypeScript Configuration**: ES2020 target with ESNext modules
3. **State Management**: Game state is immutable - create new objects for updates
4. **Performance**: Use object pooling for frequently created/destroyed entities
5. **Webpack Dev Server**: Runs on port 8080 with hot module replacement
6. **Environment Variables**: Use `example.env` as template for local `.env`

## Common Development Tasks

### Adding a New Game Action
1. Create execution class in `/src/core/execution`
2. Add message type to schemas
3. Implement client-side UI trigger
4. Add server-side validation
5. Write tests for the execution logic

### Creating a New UI Component
1. Extend base classes in `/src/client/components/baseComponents`
2. Follow existing patterns for styling (Tailwind CSS)
3. Register component in appropriate layer
4. Handle responsive design and theme support

### Modifying Game Balance
1. Update values in `/src/core/configuration/DefaultConfig.ts`
2. Test changes across different game modes
3. Consider impact on bot behavior
4. Update any affected unit tests

## Performance Considerations

- Minimize DOM manipulations - use canvas rendering where possible
- Batch WebSocket messages when feasible
- Use requestAnimationFrame for smooth animations
- Profile with Chrome DevTools for bottlenecks
- Consider mobile performance constraints