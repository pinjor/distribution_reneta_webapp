# PowerShell script to seed postponed orders
# This marks some existing validated orders as postponed

Write-Host "Seeding postponed orders..." -ForegroundColor Cyan

# Run SQL to mark some orders as postponed
$sql = @"
UPDATE orders 
SET postponed = TRUE, printed = FALSE 
WHERE id IN (
    SELECT id FROM orders 
    WHERE validated = TRUE 
    AND loaded = FALSE 
    AND status IN ('APPROVED', 'PARTIALLY_APPROVED')
    LIMIT 3
);
SELECT COUNT(*) as postponed_count FROM orders WHERE postponed = TRUE;
"@

docker exec -i swift_distro_postgres psql -U swift_user -d swift_distro_hub -c $sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully created postponed orders" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to seed postponed orders. Error code: $LASTEXITCODE" -ForegroundColor Red
}

