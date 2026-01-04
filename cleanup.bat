@echo off
echo ========================================
echo Swift Distribution Hub - Cleanup
echo ========================================
echo.

echo Stopping and removing containers...
docker-compose down

echo.
echo Removing any orphaned containers...
docker ps -a --filter "name=swift_distro" --format "{{.Names}}" | ForEach-Object {
    docker rm -f $_ 2>nul
}

echo.
echo Cleanup complete!
echo.
pause

