# PowerShell script to update order_items table
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update Order Items Table" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

Write-Host "Updating order_items table..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "update_order_items_fields.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Get-Content $migrationFile | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Order items table updated successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to update order items table" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
