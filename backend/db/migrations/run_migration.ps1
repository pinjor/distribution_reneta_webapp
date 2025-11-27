# PowerShell script to run database migration
# Usage: .\run_migration.ps1

param(
    [string]$DatabaseName = "swift_distro_hub",
    [string]$User = "swift_user",
    [string]$Password = "swift_password",
    [string]$Host = "localhost",
    [int]$Port = 5432
)

$MigrationFile = "add_order_fields.sql"
$FullPath = Join-Path $PSScriptRoot $MigrationFile

Write-Host "Running migration: $MigrationFile" -ForegroundColor Green
Write-Host "Database: $DatabaseName" -ForegroundColor Cyan
Write-Host "Host: ${Host}:${Port}" -ForegroundColor Cyan

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql command not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or use Docker method instead." -ForegroundColor Yellow
    exit 1
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $Password

# Run the migration
$ConnectionString = "-h $Host -p $Port -U $User -d $DatabaseName"
$Result = & psql $ConnectionString -f $FullPath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host $Result -ForegroundColor Red
    exit 1
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD

