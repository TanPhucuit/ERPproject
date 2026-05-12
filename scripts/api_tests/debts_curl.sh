#!/usr/bin/env bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_HEADER="Authorization: Bearer ${AUTH_TOKEN:-}" 

echo "# List customer invoices"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/accounting/invoices" | jq '.'

echo
echo "# Create sample invoice (replace IDs)"
curl -sSL -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" -d '{
  "sales_order_id": "<SALES_ORDER_ID>",
  "customer_id": "<CUSTOMER_ID>",
  "invoice_date": "2026-05-12",
  "due_date": "2026-06-11",
  "total_amount": 1000000
}' "$BASE_URL/accounting/invoices" | jq '.'

echo
echo "# List vendor bills"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/accounting/bills" | jq '.'

echo
echo "# Create sample vendor bill (replace IDs)"
curl -sSL -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" -d '{
  "purchase_order_id": "<PO_ID>",
  "supplier_id": "<SUPPLIER_ID>",
  "bill_date": "2026-05-12",
  "due_date": "2026-06-12",
  "total_amount": 500000
}' "$BASE_URL/accounting/bills" | jq '.'

echo "# Replace placeholder IDs with real ones from master data"
