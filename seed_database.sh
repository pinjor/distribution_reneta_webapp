#!/bin/bash

echo "========================================"
echo "Swift Distribution Hub - Seed Database"
echo "========================================"
echo ""

echo "Checking if containers are running..."
if ! docker ps --filter "name=swift_distro_api" --format "{{.Names}}" | grep -q swift_distro_api; then
    echo "ERROR: Backend container is not running!"
    echo "Please start the containers first:"
    echo "  docker-compose up -d"
    exit 1
fi

echo "Backend container is running."
echo ""

echo "Seeding database with all data..."
echo "This may take a few minutes..."
echo ""

docker exec swift_distro_api python -m db.seed_all_data

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Seeding failed. Check the errors above."
    exit 1
fi

echo ""
echo "========================================"
echo "Database seeding completed!"
echo "========================================"
echo ""
echo "You can now access:"
echo "  - Order Management"
echo "  - Delivery Management"
echo "  - Billing"
echo "  - Transport Management"
echo ""

