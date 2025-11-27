# PowerShell script to run database migration using Docker
# Usage: .\run_migration_docker.ps1

$MigrationFile = "add_order_fields.sql"
$FullPath = Join-Path $PSScriptRoot $MigrationFile

Write-Host "Running migration via Docker: $MigrationFile" -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running or not accessible!" -ForegroundColor Red
    exit 1
}

# Check if postgres container exists
$containerName = "swift_distro_postgres"
$containerExists = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
if (-not $containerExists) {
    Write-Host "ERROR: PostgreSQL container '$containerName' not found!" -ForegroundColor Red
    Write-Host "Please start your Docker containers first: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Copy migration file to container and execute
Write-Host "Copying migration file to container..." -ForegroundColor Cyan
docker cp $FullPath "${containerName}:/tmp/$MigrationFile"

Write-Host "Executing migration..." -ForegroundColor Cyan
$Result = docker exec -i $containerName psql -U swift_user -d swift_distro_hub -f "/tmp/$MigrationFile" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host $Result
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host $Result -ForegroundColor Red
    exit 1
}

# Clean up
docker exec $containerName rm -f "/tmp/$MigrationFile"
Write-Host "Migration file cleaned up." -ForegroundColor Cyan

