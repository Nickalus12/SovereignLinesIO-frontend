#!/bin/bash

# Deploy script for SovereignLines.io
set -e

echo "🚀 Deploying Sovereign Lines to production..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Build production assets
echo "📦 Building production assets..."
npm run build-prod

# Ensure deployment directory exists
echo "📂 Creating deployment directories..."
sudo mkdir -p /var/www/sovereignlines/static
sudo mkdir -p /var/log/sovereignlines

# Copy static files
echo "📋 Copying static files..."
sudo cp -r static/* /var/www/sovereignlines/static/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/sovereignlines
sudo chmod -R 755 /var/www/sovereignlines

# Copy Nginx configuration
echo "🔧 Setting up Nginx..."
sudo cp nginx/sovereignlines.conf /etc/nginx/sites-available/sovereignlines.conf
sudo ln -sf /etc/nginx/sites-available/sovereignlines.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Install SSL certificate with Certbot
echo "🔒 Setting up SSL certificate..."
if ! sudo certbot certificates | grep -q "sovereignlines.io"; then
    sudo certbot --nginx -d sovereignlines.io -d www.sovereignlines.io --non-interactive --agree-tos --email ${SSL_EMAIL}
else
    echo "SSL certificate already exists"
fi

# Reload Nginx
sudo systemctl reload nginx

# Start/restart the Node.js server with PM2
echo "🏃 Starting Node.js server..."
if pm2 list | grep -q "sovereign-lines"; then
    pm2 restart sovereign-lines
else
    pm2 start npm --name "sovereign-lines" -- run start:server
    pm2 save
    pm2 startup
fi

echo "✅ Deployment complete!"
echo "🌐 Your game is now accessible at https://sovereignlines.io"
echo ""
echo "Next steps:"
echo "1. Ensure your DNS A records point to this server's IP"
echo "2. Monitor logs: pm2 logs sovereign-lines"
echo "3. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"