# PowerShell script to seed route demo data
# Usage: .\seed_route_demo.ps1

Write-Host "🌱 Seeding route demo data..." -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running or not accessible!" -ForegroundColor Red
    exit 1
}

# Check if backend container exists
$containerName = "swift_distro_api"
$containerExists = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
if (-not $containerExists) {
    Write-Host "ERROR: Backend container '$containerName' not found!" -ForegroundColor Red
    Write-Host "Please start your Docker containers first: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running seed script in backend container..." -ForegroundColor Cyan
$Result = docker exec -i $containerName python -m db.seed_route_demo_data 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Demo data seeded successfully!" -ForegroundColor Green
    Write-Host $Result
} else {
    Write-Host "❌ Seeding failed!" -ForegroundColor Red
    Write-Host $Result -ForegroundColor Red
    exit 1
}

