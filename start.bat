@echo off
echo ========================================
echo Swift Distribution Hub - Quick Start
echo ========================================
echo.

echo Checking Docker status...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and start it.
    pause
    exit /b 1
)

echo Docker is installed.
echo.

echo Starting all services...
echo This may take a few minutes on first run...
echo.

docker-compose up --build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start services.
    echo Check the logs for details.
    pause
    exit /b 1
)

pause

