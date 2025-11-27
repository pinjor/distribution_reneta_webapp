# PowerShell script to verify product stock data
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product Stock Data Verification" -ForegroundColor Cyan
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

# SQL query to verify data
$sqlQuery = @"
SELECT 
    p.name,
    pis.product_code,
    pis.sku_code,
    pis.stock_qty,
    pis.gross_stock_receive,
    pis.issue,
    COUNT(pisd.id) as batch_count
FROM product_item_stock pis
JOIN products p ON pis.product_id = p.id
LEFT JOIN product_item_stock_details pisd ON pis.id = pisd.item_code
GROUP BY p.name, pis.product_code, pis.sku_code, pis.stock_qty, pis.gross_stock_receive, pis.issue
ORDER BY p.name;
"@

Write-Host "Running verification query..." -ForegroundColor Yellow
Write-Host ""

# Execute the query
$sqlQuery | docker exec -i $dbContainer psql -U swift_user -d swift_distro_hub

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

