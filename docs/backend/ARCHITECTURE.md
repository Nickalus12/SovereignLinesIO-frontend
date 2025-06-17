# Backend Architecture

## System Overview

Sovereign Lines backend is designed for high-performance real-time multiplayer gaming with horizontal scalability.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│   Web Servers   │────▶│  Game Servers   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────┐           ┌─────────────┐
                        │    Redis    │           │  PostgreSQL │
                        └─────────────┘           └─────────────┘
```

## Components

### 1. Load Balancer
- Cloudflare for DDoS protection
- WebSocket sticky sessions
- Health check monitoring
- Automatic failover

### 2. Web Servers
- Nginx reverse proxy
- Static asset serving
- SSL termination
- Request routing

### 3. Game Servers
- Node.js cluster mode
- Worker process per CPU core
- Shared memory via Redis
- Stateless design for scaling

### 4. Database Layer
- PostgreSQL for persistent data
- Redis for session and cache
- Read replicas for scaling
- Automatic backups

## Core Systems

### Game State Management

```typescript
class GameServer {
    private games: Map<string, Game>;
    private clients: Map<string, Client>;
    
    handleMessage(client: Client, message: GameMessage) {
        // Validate message
        const validation = validateMessage(message);
        if (!validation.valid) {
            return client.sendError(validation.error);
        }
        
        // Execute command
        const command = CommandFactory.create(message);
        const result = command.execute(game, client);
        
        // Broadcast updates
        this.broadcastUpdates(game, result.updates);
    }
}
```

### Command Pattern

All game actions use the command pattern for consistency and validation:

```typescript
abstract class Command {
    abstract validate(game: Game, player: Player): ValidationResult;
    abstract execute(game: Game, player: Player): ExecutionResult;
    abstract rollback(game: Game, player: Player): void;
}

class AttackCommand extends Command {
    validate(game: Game, player: Player): ValidationResult {
        // Check if attack is valid
        // - Player owns source territory
        // - Has enough troops
        // - Target is neighbor
        // - Not attacking ally
    }
    
    execute(game: Game, player: Player): ExecutionResult {
        // Perform attack calculation
        // Update game state
        // Return changes
    }
}
```

### Real-time Synchronization

```typescript
class SyncManager {
    private updateQueue: Update[] = [];
    private syncInterval = 50; // ms
    
    constructor() {
        setInterval(() => this.flush(), this.syncInterval);
    }
    
    addUpdate(update: Update) {
        this.updateQueue.push(update);
    }
    
    flush() {
        if (this.updateQueue.length === 0) return;
        
        // Batch updates by game
        const batches = this.batchByGame(this.updateQueue);
        
        // Send to clients
        for (const [gameId, updates] of batches) {
            this.broadcastToGame(gameId, updates);
        }
        
        this.updateQueue = [];
    }
}
```

## Performance Optimizations

### 1. Message Compression
- MessagePack for binary encoding
- Gzip compression for large payloads
- Delta compression for updates

### 2. Caching Strategy
- Redis for hot data
- In-memory LRU cache
- Lazy loading for cold data
- Cache invalidation patterns

### 3. Database Optimization
- Connection pooling
- Prepared statements
- Batch inserts
- Indexed queries

### 4. Scalability

#### Horizontal Scaling
```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: game-server
  template:
    spec:
      containers:
      - name: server
        image: sovereign-lines/backend:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

#### Load Distribution
- Consistent hashing for game assignment
- Player affinity to reduce hops
- Auto-scaling based on metrics

## Security Architecture

### 1. Authentication Flow
```
Client ──────▶ Auth Server ──────▶ JWT Token
   │                                    │
   └────────── Game Server ◀────────────┘
                    │
                Validate
```

### 2. Anti-Cheat System
- Server authoritative model
- Input validation and rate limiting
- Behavioral analysis
- Replay system for review

### 3. Data Protection
- Encryption at rest and in transit
- PII data isolation
- GDPR compliance
- Regular security audits

## Monitoring and Observability

### Metrics Collection
```typescript
class MetricsCollector {
    private metrics = {
        activeGames: new Gauge('game_active_count'),
        connectedPlayers: new Gauge('player_connected_count'),
        messageRate: new Counter('message_processed_total'),
        commandLatency: new Histogram('command_latency_ms'),
    };
    
    recordCommand(command: string, duration: number) {
        this.metrics.messageRate.inc({ command });
        this.metrics.commandLatency.observe({ command }, duration);
    }
}
```

### Distributed Tracing
- OpenTelemetry integration
- Request flow visualization
- Performance bottleneck identification
- Error tracking

## Disaster Recovery

### Backup Strategy
1. Continuous PostgreSQL replication
2. Daily full backups to S3
3. Redis persistence with AOF
4. Game state snapshots

### Failover Procedures
1. Automatic health checks
2. Leader election via Redis
3. Client reconnection handling
4. State recovery from snapshots

## Development Workflow

### Local Development
```bash
# Start dependencies
docker-compose up -d postgres redis

# Run server with hot reload
npm run dev

# Run specific worker
WORKER_ID=1 npm run worker
```

### Testing Strategy
1. Unit tests for game logic
2. Integration tests for API
3. Load tests for capacity planning
4. Chaos engineering for resilience