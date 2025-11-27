# PowerShell script to run product stock migration and seed data
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product Stock Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running or not accessible" -ForegroundColor Red
    exit 1
}

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

# Step 1: Run migration SQL
Write-Host "Step 1: Creating product stock tables..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "create_product_stock_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Executing migration SQL..." -ForegroundColor Cyan
Get-Content $migrationFile | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migration completed successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Migration failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Run seed data script
Write-Host "Step 2: Seeding product stock data..." -ForegroundColor Yellow

# Get the backend container name
$backendContainerOutput = docker ps --format "{{.Names}}" | Select-String -Pattern "backend|api|fastapi"
$backendContainer = $null
if ($backendContainerOutput) {
    $backendContainer = $backendContainerOutput.ToString().Trim()
}

if ($backendContainer) {
    Write-Host "Found backend container: $backendContainer" -ForegroundColor Green
    Write-Host "Running seed script in container..." -ForegroundColor Cyan
    
    $seedScript = "db/seed_product_stock_data.py"
    docker exec $backendContainer python $seedScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Seed data completed successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Seed data failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Backend container not found. Running seed script locally..." -ForegroundColor Yellow
    Write-Host "Make sure you have Python and required packages installed" -ForegroundColor Yellow
    
    $seedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "seed_product_stock_data.py"
    if (Test-Path $seedFile) {
        python $seedFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Seed data completed successfully" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Seed data failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Error: Seed file not found: $seedFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration and seeding completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
