# Test API curl - PowerShell script
# Set environment variables before running

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

Write-Host "=== SUPABASE API TEST ===" -ForegroundColor Green
Write-Host "Base URL: $BASE_URL"
Write-Host ""

# Test 1: List warehouses
Write-Host "=== TEST 1: List Warehouses ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$API_URL/warehouses" `
  -Method Get `
  -Headers @{
    "apikey" = $ANON_KEY
    "Content-Type" = "application/json"
  }
Write-Host "Warehouses:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 3 | Write-Host
$warehouses = $response
Write-Host ""

# Test 2: List products
Write-Host "=== TEST 2: List Products (limit 5) ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$API_URL/products?limit=5" `
  -Method Get `
  -Headers @{
    "apikey" = $ANON_KEY
    "Content-Type" = "application/json"
  }
Write-Host "Products:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 3 | Write-Host
$products = $response
Write-Host ""

# Test 3: List customers
Write-Host "=== TEST 3: List Customers (limit 5) ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$API_URL/customers?limit=5" `
  -Method Get `
  -Headers @{
    "apikey" = $ANON_KEY
    "Content-Type" = "application/json"
  }
Write-Host "Customers:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 3 | Write-Host
$customers = $response
Write-Host ""

# Test 4: List suppliers
Write-Host "=== TEST 4: List Suppliers (limit 5) ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$API_URL/suppliers?limit=5" `
  -Method Get `
  -Headers @{
    "apikey" = $ANON_KEY
    "Content-Type" = "application/json"
  }
Write-Host "Suppliers:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 3 | Write-Host
$suppliers = $response
Write-Host ""

# Test 5: List stock levels
Write-Host "=== TEST 5: List Stock Levels ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/stock_levels" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  Write-Host "Stock levels count: $($response.Count)" -ForegroundColor Yellow
  $response | Select-Object -First 3 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: List delivery orders
Write-Host "=== TEST 6: List Delivery Orders ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  Write-Host "Delivery orders count: $($response.Count)" -ForegroundColor Yellow
  $response | Select-Object -First 3 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: List invoices
Write-Host "=== TEST 7: List Customer Invoices ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  Write-Host "Invoices count: $($response.Count)" -ForegroundColor Yellow
  $response | Select-Object -First 3 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: List bills
Write-Host "=== TEST 8: List Vendor Bills ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/vendor_bills" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  Write-Host "Bills count: $($response.Count)" -ForegroundColor Yellow
  $response | Select-Object -First 3 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== TEST SUMMARY ===" -ForegroundColor Green
Write-Host "Warehouses: $($warehouses.Count)" -ForegroundColor Yellow
Write-Host "Products: $($products.Count)" -ForegroundColor Yellow
Write-Host "Customers: $($customers.Count)" -ForegroundColor Yellow
Write-Host "Suppliers: $($suppliers.Count)" -ForegroundColor Yellow
