#!/bin/bash
echo "Starting Sovereign Lines Development Environment..."
echo
echo "Starting client on http://localhost:9000"
echo "Starting server on http://localhost:3000"
echo
echo "Press Ctrl+C to stop both services"
echo

# Check if concurrently works
if command -v concurrently &> /dev/null; then
    npm run dev
else
    echo "Concurrently not found, starting services separately..."
    npm run start:client &
    npm run start:server-dev &
    wait
fi