#!/bin/bash
echo "Starting Docker Management UI..."
docker-compose up -d
echo ""
echo "Docker Management UI is now running at:"
echo "- Frontend: http://localhost:3000"
echo "- API: http://localhost:3001"
echo ""
echo "To stop the application, run: docker-compose down"
