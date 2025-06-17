# Deployment Guide

## Overview

This guide covers deploying Sovereign Lines backend to production environments.

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production)
- PostgreSQL 15+
- Redis 7+
- SSL certificates
- Domain with DNS configured

## Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgres://user:pass@host:5432/sovereign_lines
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-secret-key-here
ADMIN_TOKEN=your-admin-token

# External Services
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
R2_ACCESS_KEY=xxx
R2_SECRET_KEY=xxx

# Monitoring
OTEL_ENDPOINT=https://otel-collector.example.com
OTEL_USERNAME=xxx
OTEL_PASSWORD=xxx

# Game Configuration
MAX_PLAYERS_PER_GAME=100
MAX_GAMES_PER_SERVER=50
TICK_RATE=20
```

## Deployment Methods

### 1. Docker Deployment

```bash
# Build the image
docker build -t sovereign-lines-backend:latest .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f game-server
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  game-server:
    image: sovereign-lines-backend:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=sovereign_lines
      - POSTGRES_USER=sovereign
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

### 2. Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sovereign-backend
  labels:
    app: sovereign-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sovereign-backend
  template:
    metadata:
      labels:
        app: sovereign-backend
    spec:
      containers:
      - name: game-server
        image: sovereign-lines/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: sovereign-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: sovereign-secrets
              key: redis-url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: sovereign-backend
spec:
  selector:
    app: sovereign-backend
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### 3. Bare Metal Deployment

```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql redis nginx

# Clone repository
git clone https://github.com/Nickalus12/SovereignLinesIO-backend.git
cd SovereignLinesIO-backend

# Install Node dependencies
npm ci --production

# Build application
npm run build

# Set up systemd service
sudo cp sovereign-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sovereign-backend
sudo systemctl start sovereign-backend

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/sovereign
sudo ln -s /etc/nginx/sites-available/sovereign /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Setup

### Initial Schema

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE sovereign_lines;
CREATE USER sovereign WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE sovereign_lines TO sovereign;

# Run migrations
npm run migrate
```

### Backup Configuration

```bash
# Automated backups with cron
0 2 * * * pg_dump sovereign_lines | gzip > /backups/sovereign_$(date +\%Y\%m\%d).sql.gz

# Backup to S3
0 3 * * * aws s3 cp /backups/sovereign_$(date +\%Y\%m\%d).sql.gz s3://sovereign-backups/
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'sovereign-backend'
    static_configs:
      - targets: ['localhost:9090']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'prod-server-1'
```

### Grafana Dashboards

Import the provided dashboards:
- `grafana/game-metrics.json` - Game performance metrics
- `grafana/system-metrics.json` - System resource usage
- `grafana/player-analytics.json` - Player behavior analytics

## SSL/TLS Configuration

### Cloudflare SSL

1. Add domain to Cloudflare
2. Set SSL mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure origin certificate

### Let's Encrypt (Alternative)

```bash
# Install Certbot
sudo snap install certbot --classic

# Get certificate
sudo certbot certonly --nginx -d sovereignlines.io -d www.sovereignlines.io

# Auto-renewal
sudo certbot renew --dry-run
```

## Performance Tuning

### System Limits

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
```

### Kernel Parameters

```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check for memory leaks: `npm run heap-snapshot`
   - Adjust Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

2. **Connection Drops**
   - Check Nginx timeout settings
   - Verify WebSocket proxy configuration
   - Review CloudFlare WebSocket settings

3. **Database Performance**
   - Run `ANALYZE` on tables
   - Check slow query log
   - Verify connection pooling

### Debug Mode

```bash
# Enable debug logging
DEBUG=sovereign:* npm start

# Enable performance profiling
NODE_ENV=production PROFILE=true npm start
```

## Rollback Procedures

1. **Quick Rollback**
   ```bash
   # Revert to previous Docker image
   docker pull sovereign-lines/backend:previous-tag
   docker-compose up -d
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup
   gunzip < backup.sql.gz | psql sovereign_lines
   ```

3. **Full Recovery**
   - Switch DNS to maintenance page
   - Restore database from backup
   - Deploy known good version
   - Verify functionality
   - Switch DNS back

## Security Checklist

- [ ] Environment variables secured
- [ ] Database passwords rotated
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Monitoring alerts configured
- [ ] Backup verification completed
- [ ] Security scanning passed