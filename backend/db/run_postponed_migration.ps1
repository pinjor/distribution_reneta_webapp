# PowerShell script to run the postponed column migration
# This adds the 'postponed' column to the orders table

Write-Host "Running migration to add 'postponed' column to orders table..." -ForegroundColor Cyan

# Check if running in Docker
$dockerRunning = docker ps --filter "name=swift_distro_postgres" --format "{{.Names}}" 2>$null

if ($dockerRunning) {
    Write-Host "Detected Docker environment. Running migration in container..." -ForegroundColor Yellow
    docker exec -i swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "ALTER TABLE orders ADD COLUMN IF NOT EXISTS postponed BOOLEAN DEFAULT FALSE;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully added postponed column to orders table" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to add column. Error code: $LASTEXITCODE" -ForegroundColor Red
    }
} else {
    Write-Host "Docker not detected. Attempting direct connection..." -ForegroundColor Yellow
    Write-Host "Please run the SQL manually:" -ForegroundColor Yellow
    Write-Host "psql -U swift_user -d swift_distro_hub -c `"ALTER TABLE orders ADD COLUMN IF NOT EXISTS postponed BOOLEAN DEFAULT FALSE;`"" -ForegroundColor White
}

Write-Host "`nMigration complete!" -ForegroundColor Cyan

