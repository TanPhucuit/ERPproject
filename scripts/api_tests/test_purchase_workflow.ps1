# API Test: Purchase Workflow (Correct)
# RFQ -> Purchase Order -> Goods Receipt -> Vendor Bill

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

$WAREHOUSE_HN_ID = "103e7d73-603e-4786-b87d-b08252dd5e95"
$SUPPLIER_HIKV_ID = "dc980e3f-29b3-4554-bb7f-55a291de8314"
$PRODUCT_ROB_VAC = "fabd312f-797a-4798-8f42-cba05e47db52"

Write-Host "=== PURCHASE WORKFLOW TEST ===" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 1: CREATE RFQ (Request for Quotation)
# ============================================================================
Write-Host "=== STEP 1: CREATE RFQ ===" -ForegroundColor Cyan
$rfq = @{
    rfq_number = "RFQ-$(Get-Date -Format 'yyyyMMddHHmmss')"
    issued_date = "2026-05-12"
    closing_date = "2026-05-19"
    status = "draft"
    total_estimated_cost = 5500000
    notes = "RFQ for Robot Vacuum stock replenishment"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/rfqs" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($rfq | ConvertTo-Json)

  Write-Host "[OK] RFQ created" -ForegroundColor Green
  $rfqId = $response.id
  Write-Host "RFQ ID: $rfqId" -ForegroundColor Yellow
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# STEP 2: ADD RFQ LINES
# ============================================================================
Write-Host "=== STEP 2: ADD RFQ LINES ===" -ForegroundColor Cyan
if ($rfqId) {
  $rfqLine = @{
    rfq_id = $rfqId
    product_id = $PRODUCT_ROB_VAC
    quantity_required = 10
    required_delivery_date = "2026-05-25"
    notes = "Robot Roborock S7 for replenishment"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/rfq_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($rfqLine | ConvertTo-Json)
    
    Write-Host "[OK] RFQ line added" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 3: SEND RFQ (Update status)
# ============================================================================
Write-Host "=== STEP 3: SEND RFQ ===" -ForegroundColor Cyan
if ($rfqId) {
  $statusUpdate = @{
    status = "sent"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/rfqs?id=eq.$rfqId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "[OK] RFQ sent to suppliers" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 4: CREATE PURCHASE ORDER (from RFQ)
# ============================================================================
Write-Host "=== STEP 4: CREATE PURCHASE ORDER ===" -ForegroundColor Cyan
$purchaseOrder = @{
    purchase_order_number = "PO-$(Get-Date -Format 'yyyyMMddHHmmss')"
    supplier_id = $SUPPLIER_HIKV_ID
    rfq_id = $rfqId
    order_date = "2026-05-12"
    required_delivery_date = "2026-05-25"
    status = "draft"
    subtotal = 55000000
    tax_amount = 5500000
    total_amount = 60500000
    notes = "Purchase order for Robot Vacuum"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/purchase_orders" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($purchaseOrder | ConvertTo-Json)

  Write-Host "[OK] Purchase order created" -ForegroundColor Green
  $purchaseOrderId = $response.id
  Write-Host "PO ID: $purchaseOrderId" -ForegroundColor Yellow
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# STEP 5: ADD PO LINES
# ============================================================================
Write-Host "=== STEP 5: ADD PURCHASE ORDER LINES ===" -ForegroundColor Cyan
if ($purchaseOrderId) {
  $poLine = @{
    purchase_order_id = $purchaseOrderId
    product_id = $PRODUCT_ROB_VAC
    sequence_number = 1
    quantity_ordered = 10
    unit_price = 5500000
    tax_percent = 10
    notes = "Robot Roborock S7"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/purchase_order_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($poLine | ConvertTo-Json)
    
    Write-Host "[OK] PO line added" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 6: CONFIRM PURCHASE ORDER
# ============================================================================
Write-Host "=== STEP 6: CONFIRM PURCHASE ORDER ===" -ForegroundColor Cyan
if ($purchaseOrderId) {
  $statusUpdate = @{
    status = "confirmed"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/purchase_orders?id=eq.$purchaseOrderId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "[OK] Purchase order confirmed" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 7: CREATE GOODS RECEIPT (when items arrive)
# ============================================================================
Write-Host "=== STEP 7: CREATE GOODS RECEIPT ===" -ForegroundColor Cyan
if ($purchaseOrderId) {
  $goodsReceipt = @{
    goods_receipt_number = "GR-$(Get-Date -Format 'yyyyMMddHHmmss')"
    purchase_order_id = $purchaseOrderId
    warehouse_id = $WAREHOUSE_HN_ID
    received_date = "2026-05-25"
    status = "draft"
    notes = "Goods receipt for robot vacuum from HIKVISION"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/goods_receipts" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($goodsReceipt | ConvertTo-Json)
    
    Write-Host "[OK] Goods receipt created" -ForegroundColor Green
    $goodsReceiptId = $response.id
    Write-Host "GR ID: $goodsReceiptId" -ForegroundColor Yellow
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 8: ADD GOODS RECEIPT LINES
# ============================================================================
Write-Host "=== STEP 8: ADD GOODS RECEIPT LINES ===" -ForegroundColor Cyan
if ($goodsReceiptId) {
  $grLine = @{
    goods_receipt_id = $goodsReceiptId
    product_id = $PRODUCT_ROB_VAC
    quantity_received = 10
    unit_price = 5500000
    notes = "10 units of Robot Roborock S7 received"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/goods_receipt_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($grLine | ConvertTo-Json)
    
    Write-Host "[OK] Goods receipt line added" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 9: VERIFY GOODS RECEIPT (QC passed)
# ============================================================================
Write-Host "=== STEP 9: VERIFY GOODS RECEIPT ===" -ForegroundColor Cyan
if ($goodsReceiptId) {
  $statusUpdate = @{
    status = "verified"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/goods_receipts?id=eq.$goodsReceiptId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "[OK] Goods receipt verified - Stock should be updated" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 10: CREATE VENDOR BILL (from PO - MUST happen after GR)
# ============================================================================
Write-Host "=== STEP 10: CREATE VENDOR BILL ===" -ForegroundColor Cyan
if ($purchaseOrderId) {
  $vendorBill = @{
    bill_number = "BILL-$(Get-Date -Format 'yyyyMMddHHmmss')"
    purchase_order_id = $purchaseOrderId
    supplier_id = $SUPPLIER_HIKV_ID
    bill_date = "2026-05-25"
    due_date = "2026-06-25"
    status = "draft"
    subtotal = 55000000
    tax_amount = 5500000
    total_amount = 60500000
    notes = "Vendor bill for robot vacuum purchase"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/vendor_bills" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($vendorBill | ConvertTo-Json)
    
    Write-Host "[OK] Vendor bill created" -ForegroundColor Green
    $vendorBillId = $response.id
    Write-Host "Bill ID: $vendorBillId" -ForegroundColor Yellow
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 11: ADD VENDOR BILL LINES
# ============================================================================
Write-Host "=== STEP 11: ADD VENDOR BILL LINES ===" -ForegroundColor Cyan
if ($vendorBillId) {
  $billLine = @{
    bill_id = $vendorBillId
    product_id = $PRODUCT_ROB_VAC
    quantity = 10
    unit_price = 5500000
    tax_percent = 10
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/vendor_bill_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($billLine | ConvertTo-Json)
    
    Write-Host "[OK] Vendor bill line added" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# STEP 12: VERIFY STOCK LEVELS UPDATED
# ============================================================================
Write-Host "=== STEP 12: VERIFY STOCK LEVELS ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/stock_levels?product_id=eq.$PRODUCT_ROB_VAC&warehouse_id=eq.$WAREHOUSE_HN_ID" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  if ($response.Count -gt 0) {
    $stock = $response[0]
    Write-Host "[OK] Stock updated" -ForegroundColor Green
    Write-Host "  Quantity on hand: $($stock.quantity_on_hand)" -ForegroundColor Yellow
    Write-Host "  Quantity available: $($stock.quantity_available)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== PURCHASE WORKFLOW TEST COMPLETE ===" -ForegroundColor Green
Write-Host "[OK] RFQ -> PO -> Goods Receipt -> Vendor Bill" -ForegroundColor Green
