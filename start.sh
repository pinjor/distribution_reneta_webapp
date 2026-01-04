#!/bin/bash

echo "========================================"
echo "Swift Distribution Hub - Quick Start"
echo "========================================"
echo ""

echo "Checking Docker status..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not running!"
    echo "Please install Docker and start it."
    exit 1
fi

echo "Docker is installed."
echo ""

echo "Cleaning up any existing containers..."
docker-compose down >/dev/null 2>&1

echo "Starting all services..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up --build

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to start services."
    echo "Check the logs for details."
    exit 1
fi

