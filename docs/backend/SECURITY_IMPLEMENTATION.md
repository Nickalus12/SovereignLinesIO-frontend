# Sovereign Lines Security Implementation Guide

## Overview

This document details the comprehensive security system implemented in Sovereign Lines to prevent cheating, exploits, and ensure fair gameplay.

## Architecture

The security system consists of multiple layers:

1. **Rate Limiting** (Gatekeeper)
2. **Server-Side Validation** (ServerValidator)
3. **Anti-Cheat Engine** (AntiCheatEngine)
4. **Bot Detection** (BotDetector)
5. **Security Manager** (SecurityManager)

## Components

### 1. RealGatekeeper

Located at: `src/server/gatekeeper/RealGatekeeper.ts`

**Features:**
- IP-based rate limiting for HTTP and WebSocket
- Automatic IP banning for repeated violations
- Configurable limits per endpoint type
- Suspicious activity tracking

**Configuration:**
```typescript
const configs = {
  [LimiterType.Get]: { points: 100, duration: 60, blockDuration: 300 },
  [LimiterType.Post]: { points: 50, duration: 60, blockDuration: 600 },
  [LimiterType.WebSocket]: { points: 200, duration: 60, blockDuration: 1800 },
};
```

### 2. ServerValidator

Located at: `src/server/security/ServerValidator.ts`

**Validates:**
- Territory ownership
- Resource availability
- Action adjacency/reachability
- Alliance restrictions
- Cooldown periods
- Input data types and ranges

**Example Attack Validation:**
```typescript
- Validates attacker owns source territory
- Checks sufficient troops available
- Verifies territories are adjacent or boat-reachable
- Prevents attacking allies
- Limits concurrent attacks
```

### 3. AntiCheatEngine

Located at: `src/server/security/AntiCheatEngine.ts`

**Detects:**
- Speed hacks (superhuman APM)
- Resource manipulation
- Impossible actions
- Wall hacks (acting on non-visible data)
- Auto-clickers
- Modified clients
- Replay attacks
- Desync exploits

**Thresholds:**
```typescript
MAX_APM = 300;                    // Actions per minute
MIN_REACTION_TIME = 50;           // milliseconds
MAX_CLICK_ACCURACY = 0.99;        // 99% accuracy is suspicious
```

### 4. BotDetector

Located at: `src/server/security/BotDetector.ts`

**Analyzes:**
- Click patterns (intervals, grid alignment, sequences)
- Timing patterns (reaction times, perfect timing)
- Strategy patterns (expansion, resource efficiency)
- Movement patterns (repetitive paths, perfect pathfinding)
- Activity patterns (24/7 play, uniform distribution)

**Detection Methods:**
- Statistical analysis of click intervals
- Pattern matching for repetitive sequences
- Entropy calculation for activity distribution
- Variance analysis for decision consistency

### 5. SecurityManager

Located at: `src/server/security/SecurityManager.ts`

**Orchestrates:**
- All security components
- Shadow banning system
- Violation tracking
- Security event emission
- Admin controls

**Configuration:**
```typescript
{
  enableAntiCheat: true,
  enableServerValidation: true,
  enableReplayProtection: true,
  autobanThreshold: 5,
  shadowBanEnabled: true,
  logSecurityEvents: true,
}
```

## Integration

### GameServer Integration

The security system integrates with GameServer through `SecurityIntegration.ts`:

```typescript
// In GameServer initialization
const securityManager = integrateSecurityIntoGameServer(
  gameServer,
  game,
  logger
);

// All client intents are validated before processing
const validation = await securityManager.validateClientAction(
  client,
  messageType,
  data,
  nonce
);
```

### Message Flow

1. Client sends intent/action
2. Gatekeeper checks rate limits
3. GameServer receives message
4. SecurityManager validates:
   - Replay protection (nonce check)
   - Server-side game rules
   - Anti-cheat patterns
5. If valid, intent is processed
6. If invalid, client receives error

## Security Measures

### 1. Shadow Banning

Players detected cheating can be shadow banned:
- They continue playing normally
- Their actions don't affect other players
- They don't know they're banned
- Reduces rage-quitting and new account creation

### 2. Replay Protection

- Each action includes a unique nonce
- Server tracks used nonces per player
- Prevents replay attacks
- Automatic cleanup of old nonces

### 3. Behavioral Analysis

The system builds player profiles tracking:
- Action frequency and timing
- Click patterns and accuracy
- Resource efficiency
- Play session patterns
- Decision-making speed

### 4. Progressive Enforcement

1. **Warning Level** (1-2 violations): Log only
2. **Suspicious Level** (3-4 violations): Increased monitoring
3. **Ban Level** (5+ violations): Shadow ban or disconnect

## Admin Controls

### Security Report Endpoint
```typescript
GET /api/security/report
Response: {
  metrics: {
    totalValidations: number,
    failedValidations: number,
    cheatsDetected: number,
    playersBanned: number
  },
  shadowBannedCount: number,
  topViolators: Array<{playerId, violations}>,
  recentEvents: SecurityEvent[]
}
```

### Player Management
```typescript
POST /api/security/unban/:playerId
POST /api/security/clear-violations/:playerId
GET /api/security/player/:playerId
```

## Detection Examples

### Speed Hack Detection
```typescript
if (timeSinceLastAction < MIN_REACTION_TIME) {
  return {
    type: CheatType.SPEED_HACK,
    confidence: 0.9,
    details: `Action performed in ${timeSinceLastAction}ms`
  };
}
```

### Resource Manipulation
```typescript
if (amount > fromTerritory.troops()) {
  return {
    type: CheatType.RESOURCE_MANIPULATION,
    confidence: 1.0,
    details: `Attacking with ${amount} troops but only has ${fromTerritory.troops()}`
  };
}
```

### Bot Pattern Detection
```typescript
// Consistent click intervals indicate automation
if (stdDev < CLICK_INTERVAL_VARIANCE_THRESHOLD) {
  return {
    type: "click_pattern",
    confidence: 1 - (stdDev / threshold),
    details: `Consistent intervals: ${avgInterval}ms ±${stdDev}ms`
  };
}
```

## Testing Security

### Manual Testing
1. Try sending rapid requests (rate limiting)
2. Attempt invalid actions (validation)
3. Use auto-clicker (pattern detection)
4. Modify client values (anti-cheat)

### Automated Testing
```typescript
// Test rate limiting
for (let i = 0; i < 1000; i++) {
  await client.send({ type: "attack", ... });
}
// Should get rate limited after threshold

// Test validation
await client.send({ 
  type: "attack", 
  from: 999999, // Invalid territory
  to: 1,
  amount: 100
});
// Should fail validation

// Test anti-cheat
const fastActions = [];
for (let i = 0; i < 100; i++) {
  fastActions.push({
    type: "click",
    timestamp: Date.now() + i * 10, // 10ms intervals
    ...
  });
}
// Should trigger speed hack detection
```

## Performance Considerations

1. **Caching**: Validation results cached for 5 seconds
2. **Async Processing**: Non-blocking validation
3. **Memory Management**: Automatic cleanup of old data
4. **Selective Validation**: Only validate critical actions

## Future Enhancements

1. **Machine Learning**: Train models on known cheater patterns
2. **Peer Validation**: Players validate each other's actions
3. **Replay System**: Record games for review
4. **Hardware Fingerprinting**: Detect multiple accounts
5. **Network Analysis**: Detect VPNs and proxies
6. **Client Integrity**: Checksum validation of client code

## Configuration Tuning

Adjust these values based on your game's needs:

```typescript
// For faster-paced games
MAX_APM = 400;
MIN_REACTION_TIME = 30;

// For stricter enforcement
autobanThreshold = 3;
shadowBanEnabled = false; // Use hard bans

// For development/testing
enableAntiCheat = false;
enableServerValidation = true; // Keep validation
```

## Monitoring

Monitor these metrics:
- Validation failure rate (should be < 1% for legitimate players)
- Shadow ban rate
- False positive reports
- Performance impact (validation time)
- Player complaints about lag

## Security Best Practices

1. **Never trust the client** - Validate everything server-side
2. **Fail closed** - Deny actions on validation errors
3. **Log everything** - For analysis and improvement
4. **Be subtle** - Don't reveal detection methods
5. **Progressive enforcement** - Warn before banning
6. **Regular updates** - Adapt to new cheating methods