# PowerShell script to update batch numbers to numeric format
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update Batch Numbers to Numeric" -ForegroundColor Cyan
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
    exit 1
}

Write-Host "Found database container: $dbContainer" -ForegroundColor Green
Write-Host ""

Write-Host "Updating batch numbers to numeric format..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "update_batch_numbers_to_numeric.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Get-Content $migrationFile | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Batch numbers updated successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to update batch numbers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

