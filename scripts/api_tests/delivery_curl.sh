#!/usr/bin/env bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_HEADER="Authorization: Bearer ${AUTH_TOKEN:-}" 

echo "# List delivery orders"
curl -sSL -H "Content-Type: application/json" -H "$AUTH_HEADER" "$BASE_URL/inventory/delivery-orders" | jq '.'

echo
echo "# Create delivery for a sales order (sample)"
curl -sSL -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" -d '{
  "sales_order_id": "<SALES_ORDER_ID>",
  "warehouse_id": "<WAREHOUSE_ID>",
  "scheduled_delivery_date": "2026-05-15",
  "status": "ready"
}' "$BASE_URL/inventory/delivery-orders" | jq '.'

echo
echo "# Update delivery status (sample)"
echo "# Replace <DELIVERY_ID> and choose status: draft, ready, delivered"
curl -sSL -X PATCH -H "Content-Type: application/json" -H "$AUTH_HEADER" -d '{ "status": "delivered" }' "$BASE_URL/inventory/delivery-orders/<DELIVERY_ID>" | jq '.'

echo "# Replace placeholder IDs with actual IDs from master data or previous API calls."
