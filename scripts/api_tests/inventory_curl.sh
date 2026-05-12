#!/usr/bin/env bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_HEADER="Authorization: Bearer ${AUTH_TOKEN:-}" 

echo "BASE_URL=$BASE_URL"

echo "# List warehouses"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/warehouse/warehouses" | jq '.'

echo
echo "# List bin locations"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/warehouse/bin-locations" | jq '.'

echo
echo "# Get stock levels (example)"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/inventory/stock-levels" | jq '.'

echo
echo "# Create inventory adjustment (sample payload)"
curl -sSL -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" -d '{
  "warehouse_id": "<WAREHOUSE_ID>",
  "adjustment_type": "stock_count",
  "count_date": "2026-05-12",
  "lines": [
    { "product_id": "<PRODUCT_ID>", "quantity": 10 }
  ]
}' "$BASE_URL/inventory/adjustments" | jq '.'

echo
echo "# Note: replace <WAREHOUSE_ID> and <PRODUCT_ID> with actual IDs from master data."
