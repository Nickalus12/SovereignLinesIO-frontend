@echo off
echo Starting Sovereign Lines Development Environment...
echo.
echo Starting client on http://localhost:9000
echo Starting server on http://localhost:3000
echo.
echo Press Ctrl+C to stop both services
echo.

start "Sovereign Lines Client" cmd /k "npm run start:client"
start "Sovereign Lines Server" cmd /k "npm run start:server-dev"

echo Both services are starting in separate windows...
echo Client: http://localhost:9000
echo Server API: http://localhost:3000
pause