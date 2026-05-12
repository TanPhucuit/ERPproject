# Quick Test: Create Lead with minimal required fields
$BASE_URL = "https://thrazxhwqetphjogcdji.supabase.co"
$ANON_KEY = "sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w"
$API_URL = "$BASE_URL/rest/v1"

$STAGE_NEW_ID = "b8eaa9cc-0bc7-4f28-9a7c-2734f642301e"

Write-Host "=== SIMPLE LEAD TEST ===" -ForegroundColor Green
Write-Host ""

# Test 1: Minimal lead
Write-Host "Test 1: Minimal required fields" -ForegroundColor Cyan
$lead = @{
    company_name = "Tech Company Test"
    contact_person_name = "John Smith"
    stage_id = $STAGE_NEW_ID
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/leads" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($lead | ConvertTo-Json)

  Write-Host "[OK] Lead created successfully" -ForegroundColor Green
  Write-Host ($response | ConvertTo-Json -Depth 2) -ForegroundColor Yellow
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Lead with more fields
Write-Host "Test 2: Lead with optional fields" -ForegroundColor Cyan
$lead2 = @{
    lead_number = "LEAD-$(Get-Date -Format 'yyyyMMddHHmmss')"
    company_name = "Smart Home Solutions Ltd"
    contact_person_name = "Jane Doe"
    contact_person_email = "jane@smarthome.vn"
    contact_person_phone = "0912345678"
    company_address = "100 Tech Park, TP.HCM"
    stage_id = $STAGE_NEW_ID
    source = "Direct"
    estimated_value = 100000000
    customer_type = "B2B"
    notes = "Potential high-value customer"
}

try {
  $response = Invoke-RestMethod -Uri "$API_URL/leads" `
    -Method Post `
    -Headers @{
      "apikey" = $ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body ($lead2 | ConvertTo-Json)

  Write-Host "[OK] Full lead created successfully" -ForegroundColor Green
  Write-Host "Lead ID: $($response.id)" -ForegroundColor Yellow
} catch {
  Write-Host "[FAIL] Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
