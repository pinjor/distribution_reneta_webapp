# PowerShell script to clear all orders and seed new ones from master data

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clear and Seed Orders Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find database container
$dbContainer = docker ps --filter "name=swift_distro_postgres" --format "{{.Names}}" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Host "[ERROR] Database container not found. Please ensure Docker containers are running." -ForegroundColor Red
    exit 1
}

Write-Host "Found database container: $dbContainer" -ForegroundColor Green
Write-Host ""

# Step 1: Clear all orders
Write-Host "Step 1: Clearing all orders..." -ForegroundColor Yellow
$sqlFile = Join-Path $PSScriptRoot "clear_all_orders.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "[ERROR] SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw
$result = docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub -c $sqlContent

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] All orders cleared successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to clear orders" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Seed new orders from master data
Write-Host "Step 2: Seeding orders from master data..." -ForegroundColor Yellow
$seedFile = Join-Path $PSScriptRoot "seed_orders_from_master_data.py"

if (-not (Test-Path $seedFile)) {
    Write-Host "[ERROR] Seed script not found: $seedFile" -ForegroundColor Red
    exit 1
}

# Find backend container
$backendContainer = docker ps --filter "name=swift_distro_api" --format "{{.Names}}" | Select-Object -First 1

if (-not $backendContainer) {
    Write-Host "[ERROR] Backend container not found. Please ensure Docker containers are running." -ForegroundColor Red
    exit 1
}

Write-Host "Found backend container: $backendContainer" -ForegroundColor Green

# Copy seed script to container
$containerSeedPath = "/tmp/seed_orders_from_master_data.py"
docker cp $seedFile "${backendContainer}:${containerSeedPath}"

# Run seed script from backend directory
Write-Host "Running seed script in container..." -ForegroundColor Yellow
$result = docker exec -i $backendContainer sh -c "cd /app && python /tmp/seed_orders_from_master_data.py"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Seed data completed successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Seed data failed" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clear and seed completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

