#!/bin/sh

# Start the backend server
node server/server.js &

# Wait a moment for the backend to start
sleep 2

# Start the frontend with a specific port
PORT=3000 npm run dev

# Keep the container running
wait
