# Discord Login Setup

Discord login requires an API server to handle OAuth authentication. This feature is not available in standalone development mode.

## Why Discord Login Doesn't Work in Dev Mode

1. **OAuth Flow Requirements**: Discord OAuth requires a backend server to:
   - Handle the OAuth redirect
   - Exchange authorization codes for tokens
   - Generate and sign JWTs
   - Manage user sessions

2. **Security**: Client-side only OAuth is not secure as it would expose client secrets

## How to Enable Discord Login

To enable Discord login in development:

1. **Set up the API Server**
   - The API server should run on port 8787
   - Configure your Discord OAuth application
   - Set proper redirect URIs

2. **Configure Discord OAuth App**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Add OAuth2 redirect URIs:
     - `http://localhost:8787/login/discord/callback` (for dev)
     - `https://api.yourdomain.com/login/discord/callback` (for prod)

3. **Environment Variables**
   Set these in your API server:
   ```
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the API Server**
   ```bash
   # Start the API server on port 8787
   npm run start:api
   ```

## Alternative for Development

For development without Discord login:
- The game works perfectly fine without logging in
- You can play as a guest with any username
- All game features are available except:
  - Persistent stats
  - Friends list
  - Account-based features

## Production Setup

In production, the Discord login will work automatically if:
- The domain has an API server at `api.{domain}`
- Discord OAuth is properly configured
- SSL certificates are set up