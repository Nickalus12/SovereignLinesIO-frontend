# Sovereign Lines Backend

The proprietary game server for Sovereign Lines.

## Overview

This repository contains the server-side code for Sovereign Lines, including:
- Game server implementation
- Real-time multiplayer logic
- Database management
- Security and anti-cheat systems
- Deployment configuration

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Custom WebSocket server
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Monitoring**: OpenTelemetry
- **Container**: Docker
- **Deployment**: Kubernetes

## Architecture

```
src/
├── server/            # Server implementation
│   ├── GameServer.ts  # Main game server
│   ├── Client.ts      # Client connection handling
│   └── GameManager.ts # Game instance management
├── core/              # Game logic (shared with frontend)
│   ├── game/          # Game state and rules
│   ├── execution/     # Command execution
│   └── pathfinding/   # AI and pathfinding
└── scripts/           # Build and deployment scripts
```

## Security Features

- JWT-based authentication
- Rate limiting and DDoS protection
- Input validation and sanitization
- Encrypted communications
- Anti-cheat mechanisms
- Session management

## Deployment

### Docker

```bash
# Build image
docker build -t sovereign-lines-backend .

# Run container
docker run -d \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://... \
  sovereign-lines-backend
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ADMIN_TOKEN` | Admin API token | Yes |
| `OTEL_ENDPOINT` | OpenTelemetry endpoint | No |

## Monitoring

The server exports metrics via OpenTelemetry:
- Active games count
- Connected players
- Message throughput
- Response latency
- Error rates

## Development

This is a proprietary repository. Development is restricted to authorized contributors only.

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL and Redis
4. Copy `.env.example` to `.env` and configure
5. Run migrations: `npm run migrate`
6. Start server: `npm run dev`

### Testing

```bash
npm test           # Run all tests
npm run test:unit  # Unit tests only
npm run test:integration  # Integration tests
npm run test:load  # Load testing
```

## License

This software is proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited.

© 2025 Sovereign Lines Team. All rights reserved.