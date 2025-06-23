# Setting Up SovereignLines.io Domain

## Prerequisites
- Domain registered (✓ SovereignLines.io)
- Server with public IP address
- SSH access to your server
- Node.js and npm installed
- Nginx installed on server
- PM2 installed globally (`npm install -g pm2`)

## Step 1: Configure DNS Records

In your domain registrar's DNS settings, add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | www | YOUR_SERVER_IP | 3600 |
| A | api | YOUR_SERVER_IP | 3600 |

DNS changes can take 5-48 hours to propagate globally.

## Step 2: Prepare Your Server

SSH into your server and install required software:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs -y

# Install PM2
sudo npm install -g pm2
```

## Step 3: Configure Environment

1. Update `.env.production` with your actual values:
   - Set a secure `ADMIN_TOKEN`
   - Set a secure `JWT_SECRET`
   - Update `SSL_EMAIL` with your email

2. Generate secure tokens:
```bash
# Generate admin token
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 64
```

## Step 4: Deploy to Server

### Option A: Manual Deployment

1. Build locally and upload:
```bash
# Build production assets
npm run build-prod

# Upload to server
scp -r static/* user@YOUR_SERVER_IP:/var/www/sovereignlines/static/
scp .env.production user@YOUR_SERVER_IP:~/sovereign-lines/.env
```

2. On the server:
```bash
# Clone repository
git clone https://github.com/yourusername/Sovereign-OpenF.git sovereign-lines
cd sovereign-lines

# Install dependencies
npm install --production

# Copy environment file
cp ~/.env.production .env

# Start server with PM2
pm2 start npm --name "sovereign-lines" -- run start:server
pm2 save
pm2 startup
```

### Option B: Automated Deployment

Use the provided deployment script:

```bash
# Make sure you're in the project directory
./scripts/deploy-domain.sh
```

## Step 5: Configure Nginx

1. Copy Nginx configuration:
```bash
sudo cp nginx/sovereignlines.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/sovereignlines.conf /etc/nginx/sites-enabled/
```

2. Remove default Nginx site:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

3. Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Set Up SSL Certificate

Run Certbot to get a free SSL certificate:

```bash
sudo certbot --nginx -d sovereignlines.io -d www.sovereignlines.io
```

Follow the prompts and provide your email address.

## Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and game ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000:3010/tcp
sudo ufw --force enable
```

## Step 8: Update Client Configuration

Update your client code to use the domain instead of IP:

1. In `webpack.config.js`, update the production WebSocket URL:
```javascript
"process.env.WEBSOCKET_URL": JSON.stringify(
  isProduction ? "wss://sovereignlines.io" : "localhost:3000",
),
```

2. Rebuild and redeploy after changes.

## Monitoring and Maintenance

### Check Server Status
```bash
# PM2 process status
pm2 status

# View logs
pm2 logs sovereign-lines

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal
Certbot automatically renews certificates. Test auto-renewal:
```bash
sudo certbot renew --dry-run
```

### Update Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build-prod

# Restart server
pm2 restart sovereign-lines
```

## Troubleshooting

### DNS Not Resolving
- Check DNS propagation: https://dnschecker.org
- Verify A records are correct
- Wait up to 48 hours for full propagation

### SSL Certificate Issues
- Ensure ports 80 and 443 are open
- Check Nginx is running: `sudo systemctl status nginx`
- Review Certbot logs: `sudo certbot certificates`

### WebSocket Connection Failed
- Check firewall allows ports 3000-3010
- Verify Nginx WebSocket proxy configuration
- Check PM2 logs for server errors

### 502 Bad Gateway
- Ensure Node.js server is running: `pm2 status`
- Check server logs: `pm2 logs`
- Verify proxy_pass ports in Nginx config

## Security Recommendations

1. **Enable automatic security updates**:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

2. **Set up fail2ban**:
```bash
sudo apt install fail2ban
```

3. **Configure SSH key-only authentication**:
```bash
# Disable password authentication
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

4. **Regular backups**:
- Set up automated backups of game data
- Backup SSL certificates
- Keep configuration files backed up

## Next Steps

1. Test the domain: https://sovereignlines.io
2. Monitor server performance
3. Set up analytics (optional)
4. Configure CDN for better global performance (optional)
5. Set up monitoring alerts