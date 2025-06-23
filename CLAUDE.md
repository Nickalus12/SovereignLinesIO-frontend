# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sovereign Lines is an online real-time strategy game focused on territorial control and alliance building. This is a fork/rewrite of WarFront.io, featuring:
- Real-time multiplayer gameplay with WebSocket communication
- Territory expansion and resource management
- Alliance systems and strategic battles
- Multiple geographical maps
- Turn-based lockstep networking for deterministic gameplay
- Master-worker server architecture for scalability

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
  - `Main.ts`: Entry point, handles routing, authentication, and component initialization
  - `ClientGameRunner.ts`: Orchestrates game loop using Web Workers for heavy computation
  - `Transport.ts`: WebSocket communication layer with reconnection and buffering
  - `/graphics`: Layer-based rendering system with 11+ specialized layers
  - `/components`: LitElement-based UI components with modal system
  - `/auth`: Custom JWT authentication with guest/registered user support

- **`/src/core`**: Shared game logic (proprietary)
  - `/game`: Core entities (Game, Player, Unit) with immutable state design
  - `/execution`: Command pattern - all actions implemented as Execution classes
  - `/pathfinding`: A* pathfinding with worker-based computation
  - `/configuration`: Game configs, themes, and balance settings
  - `/schemas`: Zod-based message validation for client-server protocol
  - `/worker`: Web Worker implementations for game processing

- **`/src/server`**: Backend game server (proprietary)
  - `Master.ts`: Master process managing worker lifecycle and party system
  - `Worker.ts`: Worker processes handling actual game instances
  - `GameServer.ts`: Individual game instance with turn-based state management
  - `Client.ts`: Player connection with JWT auth and rate limiting
  - `/security`: RealGatekeeper for rate limiting and anti-cheat
  - `PartyManager.ts`: Cross-worker party/lobby coordination

### Key Architectural Patterns

1. **Command Pattern**: All game actions implemented as Execution classes with deterministic behavior
2. **Layer-based Rendering**: 11+ canvas layers rendered in specific order for optimal performance
3. **Lockstep Networking**: Turn-based synchronization ensures all clients have identical game state
4. **Master-Worker Architecture**: Scalable server design with load distribution across workers
5. **Web Workers**: Game simulation runs in background thread to prevent UI blocking
6. **Event-Driven Communication**: EventBus decouples components for maintainability
7. **Hash-Based Verification**: Periodic state hash checks detect desynchronization

### Testing Requirements
- All code changes in `src/core` MUST have tests
- Tests use Jest with TypeScript support
- Test files located in `/tests` directory
- Run single test: `npm test -- path/to/test.test.ts`

## How Frontend and Backend Work Together

### Communication Flow
1. **Client connects** via WebSocket to a specific worker (port 3001-3003)
2. **Authentication** using JWT tokens (EdDSA algorithm) for persistent identity
3. **Turn-based updates**: Server collects intents, broadcasts turns to all clients
4. **Deterministic execution**: All clients process same turns to reach identical state
5. **Hash verification**: Every 10 turns, clients send state hash for sync verification

### Game State Synchronization
- **Lockstep Model**: No client prediction; all clients wait for server turns
- **Intent System**: User actions sent as intents (attack, build, move, etc.)
- **Execution Pattern**: Intents → Executions → State Updates → Rendering
- **Web Worker Processing**: Game logic runs off main thread for performance
- **No Rollback**: System prioritizes consistency over responsiveness

### Server Architecture
- **Master Process**: Manages workers, parties, and HTTP endpoints
- **Worker Processes**: Handle game instances and WebSocket connections
- **Load Distribution**: Games assigned to workers via consistent hashing
- **Party System**: Cross-worker coordination for group play
- **Rate Limiting**: IP-based limits with automatic ban for suspicious activity

### Client Architecture
- **Component System**: LitElement web components with modal framework
- **Rendering Pipeline**: Layer-based canvas rendering with transform support
- **Transport Layer**: Handles WebSocket with auto-reconnection and buffering
- **Event System**: EventBus for decoupled component communication
- **Mobile Support**: Responsive design with touch input handling

## Important Development Notes

1. **Licensing**: Client = GPL v3, Server/core = proprietary
2. **TypeScript Configuration**: ES2020 target with ESNext modules
3. **State Management**: Game state is immutable - create new objects for updates
4. **Performance**: Use object pooling for frequently created/destroyed entities
5. **Webpack Dev Server**: Runs on port 9000 (not 8080) with hot module replacement
6. **Environment Variables**: Use `example.env` as template for local `.env`
7. **WebSocket Ports**: Development uses ports 3000-3003 for workers
8. **JSON Protocol**: Messages use JSON (not msgpack5 despite dependency)

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
- Game updates run in Web Worker to avoid blocking UI
- Layer caching for static content (terrain)
- Deterministic simulation allows lockstep without prediction overhead

## Security & Anti-Cheat

- **JWT Authentication**: EdDSA signed tokens for secure identity
- **Rate Limiting**: Per-IP limits on connections and messages
- **Hash Verification**: Detects modified clients via state hash mismatches
- **Server Authority**: All game logic validated server-side
- **Connection Limits**: Max 3 connections per IP in public games
- **Message Validation**: Zod schemas validate all client messages
- **Kicked Player Tracking**: Prevents banned players from rejoining

## Game Loop Details

### Client-Side Loop
1. User input → InputHandler → EventBus event
2. Transport converts event to intent message
3. Intent sent to server via WebSocket
4. Server broadcasts turn with all player intents
5. Worker receives turn → executes game logic
6. Worker sends updates to main thread
7. GameRenderer updates affected layers
8. Canvas redraws changed content

### Server-Side Loop
1. Collect intents from all clients for current turn
2. Create Turn object with all intents
3. Broadcast turn to all connected clients
4. Execute turn locally for server validation
5. Every 10 turns: collect hashes for sync check
6. Detect and notify desynced clients
7. Archive completed games with full history