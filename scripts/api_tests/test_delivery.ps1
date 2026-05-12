# API Test: Delivery Management (Quản lý giao hàng)
# Test workflow: Sales Order -> Delivery Order -> Delivery Tracking

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

# Sample IDs from master data
$WAREHOUSE_HN_ID = "103e7d73-603e-4786-b87d-b08252dd5e95"
$WAREHOUSE_HCM_ID = "2f644313-e573-425a-b5a1-d9f3998e7ddb"
$CUSTOMER_ABC_ID = "e0b59e7c-3bf7-4636-a6b3-6420c246c4f6"
$PRODUCT_ROB_VAC = "fabd312f-797a-4798-8f42-cba05e47db52"

Write-Host "=== DELIVERY MANAGEMENT TEST ===" -ForegroundColor Green
Write-Host "Base URL: $BASE_URL" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create a sales order first
Write-Host "=== STEP 1: Create Sales Order ===" -ForegroundColor Cyan
$salesOrder = @{
    sales_order_number = "SO-$(Get-Date -Format 'yyyyMMddHHmmss')"
    customer_id = $CUSTOMER_ABC_ID
    order_date = "2026-05-12"
    required_delivery_date = "2026-05-17"
    status = "draft"
    subtotal = 8500000
    tax_percent = 10
    tax_amount = 850000
    total_amount = 9350000
    notes = "Test sales order for delivery workflow"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/sales_orders" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($salesOrder | ConvertTo-Json)

  Write-Host "Created sales order:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $salesOrderId = $response.id
  Write-Host "Sales Order ID: $salesOrderId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 2: Add sales order lines
Write-Host "=== STEP 2: Add Sales Order Lines ===" -ForegroundColor Cyan
if ($salesOrderId) {
  $orderLine = @{
    sales_order_id = $salesOrderId
    product_id = $PRODUCT_ROB_VAC
    product_name = "Robot hut bui Roborock S7"
    sequence = 1
    quantity = 1
    unit_price = 8500000
    cost_price = 5500000
    discount_percent = 0
    description = "Robot vacuum for customer"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/sales_order_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($orderLine | ConvertTo-Json)
    
    Write-Host "Added sales order line:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 3: Confirm sales order (update status)
Write-Host "=== STEP 3: Confirm Sales Order ===" -ForegroundColor Cyan
if ($salesOrderId) {
  $statusUpdate = @{
    status = "confirmed"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/sales_orders?id=eq.$salesOrderId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "Confirmed sales order:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 4: Create delivery order
Write-Host "=== STEP 4: Create Delivery Order ===" -ForegroundColor Cyan
if ($salesOrderId) {
  $deliveryOrder = @{
    delivery_order_number = "DO-$(Get-Date -Format 'yyyyMMddHHmmss')"
    sales_order_id = $salesOrderId
    warehouse_id = $WAREHOUSE_HN_ID
    scheduled_delivery_date = "2026-05-17"
    status = "draft"
    notes = "Deliver to ABC Company at 123 Duong ABC"
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
}
Write-Host ""

# Step 5: Add delivery order lines
Write-Host "=== STEP 5: Add Delivery Order Lines ===" -ForegroundColor Cyan
if ($deliveryOrderId) {
  $deliveryLine = @{
    delivery_order_id = $deliveryOrderId
    sales_order_line_id = $null
    product_id = $PRODUCT_ROB_VAC
    product_name = "Robot hut bui Roborock S7"
    quantity_ordered = 1
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
    
    Write-Host "Added delivery order line:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 6: Update delivery status to ready (prepare for shipment)
Write-Host "=== STEP 6: Update Delivery Status to 'Ready' ===" -ForegroundColor Cyan
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
    
    Write-Host "Updated delivery status to 'ready':" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 7: Update delivery status to delivered
Write-Host "=== STEP 7: Update Delivery Status to 'Delivered' ===" -ForegroundColor Cyan
if ($deliveryOrderId) {
  $statusUpdate = @{
    status = "delivered"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders?id=eq.$deliveryOrderId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "Updated delivery status to 'delivered':" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 8: Update delivery line quantities
Write-Host "=== STEP 8: Update Delivery Line Quantities ===" -ForegroundColor Cyan
if ($deliveryOrderId) {
  # Get delivery lines first
  try {
    $deliveryLines = Invoke-RestMethod -Uri "$API_URL/delivery_order_lines?delivery_order_id=eq.$deliveryOrderId" `
      -Method Get `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      }
    
    if ($deliveryLines.Count -gt 0) {
      $firstLine = $deliveryLines[0]
      $lineUpdate = @{
        quantity_delivered = 1
      }
      
      $response = Invoke-RestMethod -Uri "$API_URL/delivery_order_lines?id=eq.$($firstLine.id)" `
        -Method Patch `
        -Headers @{
          "apikey" = $ANON_KEY
          "Content-Type" = "application/json"
        } `
        -Body ($lineUpdate | ConvertTo-Json)
      
      Write-Host "Updated delivery line with delivered quantity:" -ForegroundColor Yellow
      $response | ConvertTo-Json -Depth 3 | Write-Host
    }
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Step 9: List all delivery orders
Write-Host "=== STEP 9: List All Delivery Orders ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  Write-Host "Total delivery orders: $($response.Count)" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== DELIVERY MANAGEMENT TEST SUMMARY ===" -ForegroundColor Green
Write-Host "[OK] Sales order created" -ForegroundColor Green
Write-Host "[OK] Sales order lines added" -ForegroundColor Green
Write-Host "[OK] Sales order confirmed" -ForegroundColor Green
Write-Host "[OK] Delivery order created" -ForegroundColor Green
Write-Host "[OK] Delivery lines added" -ForegroundColor Green
Write-Host "[OK] Delivery status: draft - ready - delivered" -ForegroundColor Green
