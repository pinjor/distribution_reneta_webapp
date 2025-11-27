# PowerShell script to view batch details
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product Stock Batch Details" -ForegroundColor Cyan
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

# SQL query to view batch details
$sqlQuery = @"
SELECT 
    p.name as product_name,
    pis.product_code,
    pisd.batch_no,
    pisd.quantity,
    pisd.available_quantity,
    pisd.expiry_date,
    pisd.manufacturing_date,
    pisd.status
FROM product_item_stock_details pisd
JOIN product_item_stock pis ON pisd.item_code = pis.id
JOIN products p ON pis.product_id = p.id
ORDER BY p.name, pisd.batch_no;
"@

Write-Host "Viewing batch details..." -ForegroundColor Yellow
Write-Host ""

# Execute the query
$sqlQuery | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

