# PowerShell script to remove old products
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Remove Old Products Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will delete all products except the 10 newly seeded medicine products!" -ForegroundColor Yellow
Write-Host ""

# Get the database container name
$dbContainerOutput = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|db|database"
$dbContainer = $null
if ($dbContainerOutput) {
    $dbContainer = $dbContainerOutput.ToString().Trim()
}

if (-not $dbContainer) {
    Write-Host "Error: Could not find database container" -ForegroundColor Red
    Write-Host "Please ensure your database container is running" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found database container: $dbContainer" -ForegroundColor Green
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Are you sure you want to delete old products? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 1: Showing current products..." -ForegroundColor Yellow
$countQuery = "SELECT COUNT(*) as total FROM products;"
$countQuery | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub -c

Write-Host ""
Write-Host "Step 2: Removing old products..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "remove_old_products.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Executing removal SQL..." -ForegroundColor Cyan
Get-Content $migrationFile | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Old products removed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 3: Verifying remaining products..." -ForegroundColor Yellow
    $verifyQuery = "SELECT COUNT(*) as remaining_products FROM products;"
    $verifyQuery | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub -c
} else {
    Write-Host "[ERROR] Failed to remove old products" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Operation completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

