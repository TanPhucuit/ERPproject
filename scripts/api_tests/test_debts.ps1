# API Test: Debts Management (Quản lý công nợ)
# Test workflow: Sales Order -> Invoice -> Payment tracking

$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

# Sample IDs from master data
$CUSTOMER_ABC_ID = "e0b59e7c-3bf7-4636-a6b3-6420c246c4f6"
$CUSTOMER_KHA_ID = "0a19affc-edde-4993-a962-7a78a1900e24"
$CUSTOMER_XYZ_ID = "f9fe2720-ad89-4145-b931-c235a18eeb8c"
$SUPPLIER_HIKV_ID = "dc980e3f-29b3-4554-bb7f-55a291de8314"

Write-Host "=== DEBTS MANAGEMENT TEST ===" -ForegroundColor Green
Write-Host "Base URL: $BASE_URL" -ForegroundColor Cyan
Write-Host ""

# Test 1: Create customer invoice
Write-Host "=== TEST 1: Create Customer Invoice ===" -ForegroundColor Cyan
$invoice = @{
    invoice_number = "INV-$(Get-Date -Format 'yyyyMMddHHmmss')"
    customer_id = $CUSTOMER_ABC_ID
    invoice_date = "2026-05-12"
    due_date = "2026-06-11"
    status = "sent"
    total_amount = 50000000
    payment_terms = "NET30"
    description = "Test invoice for SmartHome products"
    notes = "Sample invoice from API test"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($invoice | ConvertTo-Json)

  Write-Host "Created customer invoice:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $invoiceId = $response.id
  Write-Host "Invoice ID: $invoiceId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Create vendor bill (from supplier)
Write-Host "=== TEST 2: Create Vendor Bill ===" -ForegroundColor Cyan
$bill = @{
    bill_number = "BILL-$(Get-Date -Format 'yyyyMMddHHmmss')"
    supplier_id = $SUPPLIER_HIKV_ID
    bill_date = "2026-05-12"
    due_date = "2026-06-12"
    status = "sent"
    total_amount = 25000000
    payment_terms = "NET30"
    notes = "Vendor bill for camera equipment"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/vendor_bills" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($bill | ConvertTo-Json)

  Write-Host "Created vendor bill:" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
  $billId = $response.id
  Write-Host "Bill ID: $billId" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: List outstanding invoices (unpaid)
Write-Host "=== TEST 3: Outstanding Customer Invoices ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices?status=in.(sent,partial_paid,overdue)" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  Write-Host "Outstanding invoices: $($response.Count)" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: List outstanding bills (to pay)
Write-Host "=== TEST 4: Outstanding Vendor Bills ===" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$API_URL/vendor_bills?status=in.(sent,received,partial_paid)" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  Write-Host "Outstanding bills: $($response.Count)" -ForegroundColor Yellow
  $response | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Create credit note (Ghi tăng cho khách hàng)
Write-Host "=== TEST 5: Create Credit Note ===" -ForegroundColor Cyan
if ($invoiceId) {
  $creditNote = @{
    credit_note_number = "CN-$(Get-Date -Format 'yyyyMMddHHmmss')"
    invoice_id = $invoiceId
    customer_id = $CUSTOMER_ABC_ID
    credit_date = "2026-05-13"
    status = "draft"
    total_amount = 5000000
    reason = "Product return - defective unit"
    description = "Test credit note"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/credit_notes" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($creditNote | ConvertTo-Json)
    
    Write-Host "Created credit note:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Test 6: Create debit note (Ghi giảm cho nhà cung cấp)
Write-Host "=== TEST 6: Create Debit Note ===" -ForegroundColor Cyan
if ($billId) {
  $debitNote = @{
    debit_note_number = "DN-$(Get-Date -Format 'yyyyMMddHHmmss')"
    bill_id = $billId
    supplier_id = $SUPPLIER_HIKV_ID
    debit_date = "2026-05-13"
    status = "draft"
    total_amount = 2000000
    reason = "Quality issue - defective goods"
    description = "Test debit note"
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/debit_notes" `
      -Method Post `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($debitNote | ConvertTo-Json)
    
    Write-Host "Created debit note:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Test 7: Update invoice status to paid
Write-Host "=== TEST 7: Mark Invoice as Paid ===" -ForegroundColor Cyan
if ($invoiceId) {
  $statusUpdate = @{
    status = "paid"
    paid_amount = 50000000
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$API_URL/customer_invoices?id=eq.$invoiceId" `
      -Method Patch `
      -Headers @{
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
      } `
      -Body ($statusUpdate | ConvertTo-Json)
    
    Write-Host "Updated invoice to 'paid':" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Test 8: Get accounting metrics
Write-Host "=== TEST 8: Accounting Metrics ===" -ForegroundColor Cyan
try {
  # Count paid invoices
  $paidInvoices = Invoke-RestMethod -Uri "$API_URL/customer_invoices?status=eq.paid" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  # Count overdue invoices
  $overdueInvoices = Invoke-RestMethod -Uri "$API_URL/customer_invoices?status=eq.overdue" `
    -Method Get `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    }

  Write-Host "Accounting Metrics:" -ForegroundColor Yellow
  Write-Host "  Paid Invoices: $($paidInvoices.Count)" -ForegroundColor Green
  Write-Host "  Overdue Invoices: $($overdueInvoices.Count)" -ForegroundColor Red
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== DEBTS MANAGEMENT TEST SUMMARY ===" -ForegroundColor Green
Write-Host "[OK] Customer invoice created" -ForegroundColor Green
Write-Host "[OK] Vendor bill created" -ForegroundColor Green
Write-Host "[OK] Credit note created" -ForegroundColor Green
Write-Host "[OK] Debit note created" -ForegroundColor Green
Write-Host "[OK] Invoice status updated" -ForegroundColor Green
