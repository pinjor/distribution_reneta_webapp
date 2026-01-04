@echo off
echo ========================================
echo Swift Distribution Hub - Seed Database
echo ========================================
echo.

echo Checking if containers are running...
docker ps --filter "name=swift_distro_api" --format "{{.Names}}" | findstr swift_distro_api >nul
if %errorlevel% neq 0 (
    echo ERROR: Backend container is not running!
    echo Please start the containers first:
    echo   docker-compose up -d
    pause
    exit /b 1
)

echo Backend container is running.
echo.

echo Seeding database with all data...
echo This may take a few minutes...
echo.

docker exec swift_distro_api python -m db.seed_all_data

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Seeding failed. Check the errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database seeding completed!
echo ========================================
echo.
echo You can now access:
echo   - Order Management
echo   - Delivery Management
echo   - Billing
echo   - Transport Management
echo.
pause

