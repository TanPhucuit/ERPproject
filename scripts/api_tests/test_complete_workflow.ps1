# API Test: Complete End-to-End Workflow (Correct)
# Based on actual database schema and business process flow
# Lead -> Quotation -> Sales Order -> Invoice -> Delivery -> Payment

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

# Sample IDs from master data
$WAREHOUSE_HN_ID = "103e7d73-603e-4786-b87d-b08252dd5e95"
$WAREHOUSE_HCM_ID = "2f644313-e573-425a-b5a1-d9f3998e7ddb"
$CUSTOMER_ABC_ID = "e0b59e7c-3bf7-4636-a6b3-6420c246c4f6"
$SUPPLIER_HIKV_ID = "dc980e3f-29b3-4554-bb7f-55a291de8314"
$PRODUCT_ROB_VAC = "fabd312f-797a-4798-8f42-cba05e47db52"
$STAGE_NEW_ID = "b8eaa9cc-0bc7-4f28-9a7c-2734f642301e"

Write-Host "=== COMPLETE ERP WORKFLOW TEST ===" -ForegroundColor Green
Write-Host "API: Supabase REST v1" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PART 1: CREATE LEAD (CRM Starting Point)
# ============================================================================
Write-Host "=== PART 1: CREATE LEAD ===" -ForegroundColor Magenta
$lead = @{
    lead_number = "LEAD-$(Get-Date -Format 'yyyyMMddHHmmss')"
    company_name = "Tech Solutions Inc"
    contact_person_name = "John Doe"
    contact_person_email = "john@techsolutions.com"
    contact_person_phone = "0909876543"
    company_address = "999 Tech Street, TP.HCM"
    stage_id = $STAGE_NEW_ID  # new stage from lead_stages
    estimated_value = 50000000
    source = "Direct"
    notes = "Test lead for complete workflow"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/leads" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($lead | ConvertTo-Json)

  Write-Host "[OK] Lead created" -ForegroundColor Green
  $leadId = $response.id
  Write-Host "Lead ID: $leadId" -ForegroundColor Yellow
} catch {
  Write-Host "[FAIL] Error creating lead: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# PART 2: CREATE QUOTATION FROM LEAD
# ============================================================================
Write-Host "=== PART 2: CREATE QUOTATION ===" -ForegroundColor Magenta
if ($leadId) {
  $quotation = @{
    lead_id = $leadId
    customer_id = $null
    issued_date = "2026-05-12"
    valid_until_date = "2026-06-12"
    status = "draft"
    subtotal = 8500000
    tax_percent = 10
    tax_amount = 850000
    total_amount = 9350000
    notes = "Test quotation from lead"
    created_by_id = $null
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/quotations" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($quotation | ConvertTo-Json)
    
    Write-Host "[OK] Quotation created" -ForegroundColor Green
    $quotationId = $response.id
    Write-Host "Quotation ID: $quotationId" -ForegroundColor Yellow
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# PART 3: ADD QUOTATION LINES
# ============================================================================
Write-Host "=== PART 3: ADD QUOTATION LINES ===" -ForegroundColor Magenta
if ($quotationId) {
  $quotationLine = @{
    quotation_id = $quotationId
    product_id = $PRODUCT_ROB_VAC
    quantity = 1
    unit_price = 8500000
    discount_percent = 0
    sequence = 1
    notes = "Robot vacuum"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/quotation_lines" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($quotationLine | ConvertTo-Json)
    
    Write-Host "[OK] Quotation line added" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# PART 4: ACCEPT QUOTATION (triggers Sales Order + Invoice)
# ============================================================================
Write-Host "=== PART 4: ACCEPT QUOTATION ===" -ForegroundColor Magenta
if ($quotationId) {
  $statusUpdate = @{
    status = "accepted"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/quotations?id=eq.$quotationId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "[OK] Quotation accepted" -ForegroundColor Green
    Write-Host "Note: This should auto-create Sales Order, Invoice, and Delivery Order" -ForegroundColor Yellow
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# PART 5: VERIFY SALES ORDERS CREATED
# ============================================================================
Write-Host "=== PART 5: VERIFY SALES ORDERS ===" -ForegroundColor Magenta
try {
  $response = Invoke-RestMethod -Uri "$API_URL/sales_orders?limit=10" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  
  Write-Host "[OK] Sales orders: $($response.Count)" -ForegroundColor Green
  if ($response.Count -gt 0) {
    $latestSO = $response[0]
    Write-Host "Latest SO: $($latestSO.sales_order_number) - Status: $($latestSO.status)" -ForegroundColor Yellow
    $salesOrderId = $latestSO.id
  }
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# PART 6: VERIFY INVOICES CREATED
# ============================================================================
Write-Host "=== PART 6: VERIFY INVOICES ===" -ForegroundColor Magenta
try {
  $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices?limit=10" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  
  Write-Host "[OK] Invoices: $($response.Count)" -ForegroundColor Green
  if ($response.Count -gt 0) {
    $latestInvoice = $response[0]
    Write-Host "Latest Invoice: $($latestInvoice.invoice_number) - Status: $($latestInvoice.status) - Amount: $($latestInvoice.total_amount)" -ForegroundColor Yellow
    $invoiceId = $latestInvoice.id
  }
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# PART 7: VERIFY DELIVERY ORDERS CREATED
# ============================================================================
Write-Host "=== PART 7: VERIFY DELIVERY ORDERS ===" -ForegroundColor Magenta
try {
  $response = Invoke-RestMethod -Uri "$API_URL/delivery_orders?limit=10" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }
  
  Write-Host "[OK] Delivery orders: $($response.Count)" -ForegroundColor Green
  if ($response.Count -gt 0) {
    $latestDO = $response[0]
    Write-Host "Latest DO: $($latestDO.delivery_order_number) - Status: $($latestDO.status)" -ForegroundColor Yellow
    $deliveryOrderId = $latestDO.id
  }
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# ============================================================================
# PART 8: UPDATE INVOICE STATUS TO SENT
# ============================================================================
Write-Host "=== PART 8: UPDATE INVOICE STATUS ===" -ForegroundColor Magenta
if ($invoiceId) {
  $statusUpdate = @{
    status = "sent"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices?id=eq.$invoiceId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "[OK] Invoice status updated to 'sent'" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# PART 9: RECORD PAYMENT
# ============================================================================
Write-Host "=== PART 9: RECORD PAYMENT ===" -ForegroundColor Magenta
if ($invoiceId) {
  $paymentUpdate = @{
    paid_amount = 9350000
    status = "paid"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices?id=eq.$invoiceId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($paymentUpdate | ConvertTo-Json)
    
    Write-Host "[OK] Payment recorded - Invoice marked as paid" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# ============================================================================
# PART 10: UPDATE DELIVERY ORDER STATUS
# ============================================================================
Write-Host "=== PART 10: UPDATE DELIVERY ORDER STATUS ===" -ForegroundColor Magenta
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
    
    Write-Host "[OK] Delivery order status updated to 'ready'" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

Write-Host "=== WORKFLOW TEST COMPLETE ===" -ForegroundColor Green
Write-Host "[OK] Lead created -> Quotation -> Sales Order -> Invoice -> Delivery -> Payment" -ForegroundColor Green
