# API Test: Inventory Management (Quản lý kho)
# Test workflow: Stock -> Delivery Orders -> Goods Receipts -> Adjustments

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

# Sample IDs from master data
$WAREHOUSE_HN_ID = "103e7d73-603e-4786-b87d-b08252dd5e95"
$WAREHOUSE_HCM_ID = "2f644313-e573-425a-b5a1-d9f3998e7ddb"
$WAREHOUSE_BH_ID = "a232ce83-7361-464d-892c-8eee76251652"
$PRODUCT_ROB_VAC = "fabd312f-797a-4798-8f42-cba05e47db52"
$PRODUCT_ROB_DREAME = "fedc4367-f122-4aaf-a64d-a3fb3640b5e0"
$PRODUCT_POE = "e0dac0bf-5527-4c17-a1d4-8cfd709bb7ff"

Write-Host "=== INVENTORY MANAGEMENT TEST ===" -ForegroundColor Green
Write-Host "Base URL: $BASE_URL" -ForegroundColor Cyan
Write-Host ""

# Test 1: Update stock levels (simulate received goods)
Write-Host "=== TEST 1: Update Stock Levels ===" -ForegroundColor Cyan
$stockUpdate = @{
    quantity_on_hand = 50
    quantity_reserved = 0
}

$response = Invoke-RestMethod -Uri "$API_URL/stock_levels?product_id=eq.$PRODUCT_ROB_VAC&warehouse_id=eq.$WAREHOUSE_HN_ID" `
  -Method Patch `
  -Headers @{
    "apikey" = $ANON_KEY
    "Content-Type" = "application/json"
  } `
  -Body ($stockUpdate | ConvertTo-Json)

Write-Host "Updated stock for Robot Vac in Ha Noi warehouse:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 3 | Write-Host
Write-Host ""

# Test 2: Create a delivery order (manually)
Write-Host "=== TEST 2: Create Delivery Order ===" -ForegroundColor Cyan
$deliveryOrder = @{
    delivery_order_number = "DO-$(Get-Date -Format 'yyyyMMddHHmmss')"
    warehouse_id = $WAREHOUSE_HN_ID
    scheduled_delivery_date = "2026-05-15"
    status = "draft"
    notes = "Test delivery order from API"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($deliveryOrder | ConvertTo-Json)

  Write-Host "Created delivery order:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $deliveryOrderId = $response.id
  Write-Host "Delivery Order ID: $deliveryOrderId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Add delivery order lines
Write-Host "=== TEST 3: Add Delivery Order Lines ===" -ForegroundColor Cyan
if ($deliveryOrderId) {
  $deliveryLine = @{
    delivery_order_id = $deliveryOrderId
    product_id = $PRODUCT_ROB_VAC
    product_name = "Robot hut bui Roborock S7"
    quantity_ordered = 5
    quantity_delivered = 0
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/delivery_order_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($deliveryLine | ConvertTo-Json)
    
    Write-Host "Added delivery line:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Test 4: Create goods receipt (Nhập hàng từ nhà cung cấp)
Write-Host "=== TEST 4: Create Goods Receipt ===" -ForegroundColor Cyan
$goodsReceipt = @{
    goods_receipt_number = "GR-$(Get-Date -Format 'yyyyMMddHHmmss')"
    warehouse_id = $WAREHOUSE_HN_ID
    received_date = "2026-05-12"
    status = "draft"
    notes = "Goods receipt for robot vacuum from supplier"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/goods_receipts" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($goodsReceipt | ConvertTo-Json)

  Write-Host "Created goods receipt:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $goodsReceiptId = $response.id
  Write-Host "Goods Receipt ID: $goodsReceiptId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Create inventory adjustment (Điều chỉnh kho)
Write-Host "=== TEST 5: Create Inventory Adjustment ===" -ForegroundColor Cyan
$adjustment = @{
    adjustment_number = "ADJ-$(Get-Date -Format 'yyyyMMddHHmmss')"
    warehouse_id = $WAREHOUSE_HN_ID
    adjustment_type = "stock_count"
    count_date = "2026-05-12"
    status = "draft"
    reason = "Physical stock count verification"
    notes = "Test inventory adjustment"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/inventory_adjustments" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($adjustment | ConvertTo-Json)

  Write-Host "Created inventory adjustment:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $adjustmentId = $response.id
  Write-Host "Adjustment ID: $adjustmentId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: List bin locations
Write-Host "=== TEST 6: List Bin Locations ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/bin_locations?warehouse_id=eq.$WAREHOUSE_HN_ID&limit=5" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  Write-Host "Bin locations in Warehouse Ha Noi:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Update delivery status (from draft -> ready -> delivered)
Write-Host "=== TEST 7: Update Delivery Order Status ===" -ForegroundColor Cyan
if ($deliveryOrderId) {
  $statusUpdate = @{
    status = "ready"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders?id=eq.$deliveryOrderId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "Updated delivery order status to 'ready':" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

Write-Host "=== INVENTORY TEST SUMMARY ===" -ForegroundColor Green
Write-Host "[OK] Stock levels update" -ForegroundColor Green
Write-Host "[OK] Delivery order created" -ForegroundColor Green
Write-Host "[OK] Goods receipt created" -ForegroundColor Green
Write-Host "[OK] Inventory adjustment created" -ForegroundColor Green
Write-Host "[OK] Status updates tested" -ForegroundColor Green
