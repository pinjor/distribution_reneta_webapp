#!/bin/bash

echo "========================================"
echo "Swift Distribution Hub - Cleanup"
echo "========================================"
echo ""

echo "Stopping and removing containers..."
docker-compose down

echo ""
echo "Removing any orphaned containers..."
docker ps -a --filter "name=swift_distro" --format "{{.Names}}" | while read container; do
    if [ ! -z "$container" ]; then
        docker rm -f "$container" 2>/dev/null
    fi
done

echo ""
echo "Cleanup complete!"
echo ""

