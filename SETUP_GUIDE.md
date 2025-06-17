# Discord OAuth & Cloudflare Setup Guide

## Discord OAuth Setup

### 1. Create a Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Sovereign OpenF")
4. Go to the "OAuth2" section in the sidebar

### 2. Configure OAuth2
1. In OAuth2 > General:
   - Add Redirect URLs:
     - For local dev: `http://localhost:9000/api/auth/discord/callback`
     - For production: `https://yourdomain.com/api/auth/discord/callback`
   - Copy your **Client ID** and **Client Secret**

### 3. Set up environment variables
Create a `.env` file in your project root:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:9000/api/auth/discord/callback

# Admin Token (generate a secure random string)
ADMIN_TOKEN=your_secure_admin_token_here

# JWT Secret (generate another secure random string)
JWT_SECRET=your_jwt_secret_here
```

## Cloudflare Setup (for production deployment)

### 1. Create a Cloudflare Account
1. Sign up at [Cloudflare](https://cloudflare.com)
2. Add your domain to Cloudflare (follow their guide)

### 2. Get API Credentials
1. Go to My Profile > API Tokens
2. Create a new API Token with these permissions:
   - Account: Cloudflare Tunnel:Edit
   - Zone: DNS:Edit (for your domain)
   - Zone: Zone:Read
3. Copy the API Token

### 3. Get Account ID
1. Go to your domain's overview page
2. Find your Account ID in the right sidebar
3. Copy it

### 4. Update .env for Production
Add these to your `.env` file:

```env
# Cloudflare Configuration
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token
DOMAIN=yourdomain.com
SUBDOMAIN=play  # This will create play.yourdomain.com

# Cloudflare Tunnel Paths (leave as default)
CF_CONFIG_PATH=./cloudflared-config.yml
CF_CREDS_PATH=./tunnel-creds.json
```

## For Local Development

Since you're running locally, you can skip the Cloudflare setup for now. The dev configuration doesn't use Cloudflare tunnels. Just focus on:

1. Setting up Discord OAuth (optional, only if you want Discord login)
2. Creating a `.env` file with at least:
   ```env
   ADMIN_TOKEN=any_random_string_for_dev
   JWT_SECRET=another_random_string_for_dev
   ```

## Running the Application

1. Install dependencies: `npm install`
2. For development: `npm run dev`
3. Access the game at: `http://localhost:9000`

## Important Security Notes

- Never commit your `.env` file to git (it should be in .gitignore)
- Use strong, random strings for ADMIN_TOKEN and JWT_SECRET
- Keep your API tokens secure
- For production, use HTTPS everywhere

## Troubleshooting

### "Cloudflare API error"
- This happens when running in production mode without proper Cloudflare setup
- For local development, make sure you're using `npm run dev` (which uses dev mode)

### "Discord OAuth not working"
- Check that your redirect URI matches exactly (including http/https and port)
- Make sure your Client ID and Secret are correct
- The redirect URI in Discord settings must match what's in your .env file