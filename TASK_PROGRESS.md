# Fix Checklist

## ROOT CAUSE: normalizeWriteBody bug

In erpApi.ts, normalizeWriteBody uses `body.snake_case || body.camelCase` pattern. When editing, the record from GET response contains BOTH old snake_case keys (from `...row` spread) AND camelCase keys (from normalize functions). So `body.full_name || body.fullName` always picks the OLD `full_name` since it exists. Fix: swap priority to `body.camelCase ?? body.snake_case`.

## Fixes needed:

- [ ] FIX 1: normalizeWriteBody - fix ALL entity handlers to prefer camelCase (form values) over snake_case (DB values)
- [ ] FIX 2: generated_data_2 - Add missing columns to products.csv (description, reorder_level, reorder_quantity, status, barcode, supplier_lead_time_days, image_url)
- [ ] FIX 3: generated_data_2 - Add missing columns to product_categories.csv (parent_id, image_url)
- [ ] FIX 4: generated_data_2 - Add missing columns to customers.csv (contact_phone, billing_address, payment_terms, status, billing_city, billing_province, billing_postal_code, credit_limit, credit_used, lead_id, created_by_id, shipping_same_as_billing)
- [ ] FIX 5: generated_data_2 - Add missing columns to suppliers.csv (contact_person_name, contact_person_email, contact_person_phone, company_address, payment_terms, average_lead_time_days, status)
- [ ] FIX 6: generated_data_2 - Add supplier_type_id to suppliers.csv
- [ ] FIX 7: Regenerate all generated_data_2 files using generate_data.js
- [ ] FIX 8: Verify product sort by display_order in product_categories (already in GET response)
- [ ] FIX 9: Add UOM field to products form (unit of measure selector)
- [ ] FIX 10: Add warehouse ID display next to warehouse name in bin_locations form