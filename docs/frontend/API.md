# Frontend API Documentation

## WebSocket Communication

The game client communicates with the server using WebSocket messages with MessagePack encoding.

### Connection

```javascript
const socket = new WebSocket('wss://sovereignlines.io/game');
socket.binaryType = 'arraybuffer';
```

### Message Format

All messages follow this structure:
```typescript
interface GameMessage {
    type: MessageType;
    data: any;
    timestamp?: number;
}
```

### Message Types

#### Client to Server

| Type | Description | Data Structure |
|------|-------------|----------------|
| `JOIN_GAME` | Join a game lobby | `{ lobbyId: string, username: string }` |
| `SPAWN` | Spawn in game | `{ position: Point }` |
| `ATTACK` | Attack territory | `{ from: number, to: number, amount: number }` |
| `BUILD` | Build structure | `{ territory: number, type: StructureType }` |
| `CHAT` | Send chat message | `{ message: string, channel: ChatChannel }` |
| `ALLIANCE_REQUEST` | Request alliance | `{ targetPlayer: string }` |
| `EMOJI` | Send emoji | `{ emoji: string, position: Point }` |

#### Server to Client

| Type | Description | Data Structure |
|------|-------------|----------------|
| `GAME_STATE` | Full game state | `{ players: Player[], territories: Territory[], units: Unit[] }` |
| `UPDATE` | Incremental update | `{ changes: Change[] }` |
| `PLAYER_JOINED` | Player joined | `{ player: Player }` |
| `PLAYER_LEFT` | Player left | `{ playerId: string }` |
| `CHAT_MESSAGE` | Chat message | `{ from: string, message: string, channel: ChatChannel }` |
| `ERROR` | Error message | `{ code: string, message: string }` |

## Client Events

The game client uses a custom event system for internal communication.

### Game Events

```javascript
// Listen for game events
gameEventBus.on('territory-captured', (data) => {
    console.log(`Territory ${data.territoryId} captured by ${data.playerId}`);
});

// Emit game events
gameEventBus.emit('player-spawned', {
    playerId: 'player123',
    position: { x: 100, y: 200 }
});
```

### Available Events

| Event | Description | Data |
|-------|-------------|------|
| `game-started` | Game has started | `{ gameId: string }` |
| `game-ended` | Game has ended | `{ winner: string, stats: GameStats }` |
| `territory-captured` | Territory captured | `{ territoryId: number, playerId: string }` |
| `player-spawned` | Player spawned | `{ playerId: string, position: Point }` |
| `player-eliminated` | Player eliminated | `{ playerId: string }` |
| `structure-built` | Structure built | `{ structure: Structure }` |
| `unit-moved` | Unit moved | `{ unit: Unit, from: Point, to: Point }` |

## Rendering API

The game uses a layered rendering system.

### Layer Types

```javascript
// Access rendering layers
const terrainLayer = renderer.getLayer('terrain');
const unitLayer = renderer.getLayer('units');
const uiLayer = renderer.getLayer('ui');
```

### Custom Layer

```javascript
class CustomLayer extends Layer {
    render(ctx, camera) {
        // Your rendering code
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
    }
    
    update(deltaTime) {
        // Update logic
    }
}

renderer.addLayer('custom', new CustomLayer());
```

## Game State

### Accessing Game State

```javascript
// Get current game state
const gameState = game.getState();

// Access specific data
const player = gameState.getPlayer('player123');
const territory = gameState.getTerritory(42);
const units = gameState.getUnitsInTerritory(42);
```

### State Structure

```typescript
interface GameState {
    players: Map<string, Player>;
    territories: Map<number, Territory>;
    units: Map<string, Unit>;
    structures: Map<string, Structure>;
    alliances: Alliance[];
}

interface Player {
    id: string;
    name: string;
    color: string;
    gold: number;
    territories: number[];
    isAlive: boolean;
}

interface Territory {
    id: number;
    owner: string | null;
    troops: number;
    structures: Structure[];
    neighbors: number[];
}
```

## Utility Functions

### Coordinate System

```javascript
// Convert screen coordinates to world coordinates
const worldPos = camera.screenToWorld(mouseX, mouseY);

// Convert world coordinates to screen coordinates  
const screenPos = camera.worldToScreen(worldX, worldY);

// Get territory at position
const territory = gameMap.getTerritoryAtPosition(worldPos);
```

### Pathfinding

```javascript
// Find path between territories
const path = pathfinder.findPath(
    fromTerritoryId,
    toTerritoryId,
    { 
        avoidEnemies: true,
        preferRoads: true 
    }
);
```

## Performance Guidelines

1. **Batch Operations**: Group similar operations together
2. **Object Pooling**: Reuse objects instead of creating new ones
3. **Efficient Rendering**: Only render visible elements
4. **Event Throttling**: Limit frequency of certain events
5. **Asset Caching**: Cache frequently used assets

## Error Handling

```javascript
// Global error handler
window.addEventListener('error', (event) => {
    gameLogger.error('Uncaught error', event.error);
    // Send error report to server
});

// WebSocket error handling
socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Attempt reconnection
};
```