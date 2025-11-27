# PowerShell script to seed vehicle data
Write-Host "Seeding vehicle data..." -ForegroundColor Cyan

docker exec -i swift_distro_api python /app/db/seed_vehicles.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "Vehicle seeding completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Vehicle seeding failed!" -ForegroundColor Red
    exit 1
}

