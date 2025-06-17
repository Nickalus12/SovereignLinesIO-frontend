# Security Guidelines

## Overview

This document outlines security practices and guidelines for the Sovereign Lines backend.

## Authentication & Authorization

### JWT Implementation

```typescript
// Token generation
function generateToken(userId: string): string {
    return jwt.sign(
        { 
            userId,
            iat: Date.now(),
            exp: Date.now() + TOKEN_LIFETIME
        },
        JWT_SECRET,
        { algorithm: 'HS256' }
    );
}

// Token validation
function validateToken(token: string): TokenPayload {
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // Additional validation
        if (payload.exp < Date.now()) {
            throw new Error('Token expired');
        }
        return payload;
    } catch (error) {
        throw new UnauthorizedError('Invalid token');
    }
}
```

### Session Management

- Sessions stored in Redis with TTL
- Automatic session cleanup
- Device fingerprinting
- Concurrent session limits

## Input Validation

### Message Validation

```typescript
const messageSchema = z.object({
    type: z.enum(['ATTACK', 'BUILD', 'MOVE', 'CHAT']),
    data: z.unknown(),
    timestamp: z.number().optional()
});

function validateMessage(message: unknown): GameMessage {
    try {
        const parsed = messageSchema.parse(message);
        // Type-specific validation
        switch (parsed.type) {
            case 'ATTACK':
                return validateAttackMessage(parsed);
            case 'BUILD':
                return validateBuildMessage(parsed);
            // ... other types
        }
    } catch (error) {
        throw new ValidationError('Invalid message format');
    }
}
```

### Rate Limiting

```typescript
const rateLimiter = new RateLimiter({
    points: 100, // Number of points
    duration: 60, // Per 60 seconds
    blockDuration: 600, // Block for 10 minutes
});

async function handleMessage(client: Client, message: any) {
    try {
        await rateLimiter.consume(client.id);
        // Process message
    } catch (rejRes) {
        client.sendError('Rate limit exceeded');
        if (rejRes.consumedPoints > 150) {
            // Potential attack, ban user
            await banUser(client.id);
        }
    }
}
```

## Anti-Cheat Measures

### Server Authority

All game logic is executed server-side:

```typescript
class GameServer {
    // Never trust client for:
    // - Position updates
    // - Resource calculations
    // - Combat results
    // - Time-based events
    
    validateAction(player: Player, action: Action): boolean {
        // Verify player can perform action
        // Check cooldowns
        // Validate resources
        // Confirm ownership
        return this.gameLogic.canPerform(player, action);
    }
}
```

### Behavioral Analysis

```typescript
class CheatDetector {
    private patterns = {
        IMPOSSIBLE_APM: 300, // Actions per minute
        INSTANT_REACTION: 50, // ms
        PERFECT_ACCURACY: 0.99,
    };
    
    analyzePlayer(player: Player): CheatScore {
        const metrics = {
            apm: this.calculateAPM(player),
            reactionTime: this.getAverageReaction(player),
            accuracy: this.getClickAccuracy(player),
        };
        
        return this.calculateCheatScore(metrics);
    }
}
```

## Data Protection

### Encryption

```typescript
// Encrypt sensitive data at rest
function encryptData(data: string): string {
    const cipher = crypto.createCipher('aes-256-gcm', ENCRYPTION_KEY);
    const encrypted = cipher.update(data, 'utf8', 'hex');
    return encrypted + cipher.final('hex');
}

// Decrypt data
function decryptData(encrypted: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', ENCRYPTION_KEY);
    const decrypted = decipher.update(encrypted, 'hex', 'utf8');
    return decrypted + decipher.final('utf8');
}
```

### Database Security

```sql
-- Row-level security
CREATE POLICY player_data_policy ON players
    FOR ALL
    USING (user_id = current_user_id());

-- Encrypted columns
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT ENCRYPTED,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Network Security

### DDoS Protection

1. **Cloudflare Integration**
   - Rate limiting at edge
   - Challenge suspicious traffic
   - Geographic restrictions

2. **Application Level**
   ```typescript
   const ddosProtection = {
       maxConnectionsPerIP: 5,
       maxMessagesPerSecond: 10,
       banDuration: 3600, // 1 hour
   };
   ```

### WebSocket Security

```typescript
class SecureWebSocket {
    constructor(ws: WebSocket) {
        // Validate origin
        if (!this.isValidOrigin(ws.headers.origin)) {
            ws.close(1008, 'Invalid origin');
            return;
        }
        
        // Set security headers
        ws.setHeader('X-Frame-Options', 'DENY');
        ws.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable compression
        ws.enableCompression();
    }
}
```

## Vulnerability Management

### Dependency Scanning

```json
{
  "scripts": {
    "security:audit": "npm audit --production",
    "security:scan": "snyk test",
    "security:fix": "npm audit fix"
  }
}
```

### Code Scanning

- Static analysis with ESLint security plugins
- SAST (Static Application Security Testing)
- Regular penetration testing
- Bug bounty program

## Incident Response

### Detection

```typescript
class SecurityMonitor {
    private alerts = {
        BRUTE_FORCE: 'Multiple failed login attempts',
        SQL_INJECTION: 'Potential SQL injection detected',
        XSS_ATTEMPT: 'XSS payload in user input',
        UNUSUAL_TRAFFIC: 'Abnormal traffic pattern',
    };
    
    async detectThreat(event: SecurityEvent) {
        if (this.isThreat(event)) {
            await this.alertTeam(event);
            await this.mitigate(event);
        }
    }
}
```

### Response Plan

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation**
   - Analyze logs
   - Identify attack vector
   - Assess damage

3. **Remediation**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security rules

4. **Post-Incident**
   - Document findings
   - Update procedures
   - Conduct post-mortem

## Compliance

### GDPR Compliance

```typescript
class PrivacyManager {
    async exportUserData(userId: string): Promise<UserData> {
        // Collect all user data
        const data = await this.collectUserData(userId);
        return this.formatForExport(data);
    }
    
    async deleteUserData(userId: string): Promise<void> {
        // Soft delete with retention period
        await this.markForDeletion(userId);
        // Schedule hard delete after legal retention
        await this.scheduleHardDelete(userId, RETENTION_PERIOD);
    }
}
```

### Audit Logging

```typescript
class AuditLogger {
    log(event: AuditEvent): void {
        const entry = {
            timestamp: new Date().toISOString(),
            userId: event.userId,
            action: event.action,
            resource: event.resource,
            result: event.result,
            ip: event.ip,
            userAgent: event.userAgent,
        };
        
        // Write to append-only log
        this.writeToAuditLog(entry);
    }
}
```

## Security Checklist

### Development
- [ ] Input validation on all endpoints
- [ ] Parameterized queries only
- [ ] Secrets in environment variables
- [ ] Security headers configured
- [ ] HTTPS enforced

### Deployment
- [ ] Firewall rules configured
- [ ] Unnecessary ports closed
- [ ] Security patches applied
- [ ] Monitoring enabled
- [ ] Backup encryption enabled

### Operations
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Employee security training
- [ ] Incident response drills
- [ ] Access reviews