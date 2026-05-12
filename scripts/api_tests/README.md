# ERP workflow curl tests

This folder contains a tiny local test backend plus curl-style PowerShell runner.
The main app is a Vite frontend, so there is no production backend route to curl.
For business workflow testing, run the local harness and curl it.

## Run everything

```powershell
npm run test:erp-workflows
```

The runner starts `workflow_api_server.mjs` on `http://localhost:8787`, calls:

- `GET /health`
- `POST /workflows/all`

Covered workflows:

- CRM/Sales/AR/Delivery: Lead -> Activity -> Lead Product -> Quotation -> Customer -> Sales Order -> Customer Invoice -> Customer Payment -> Delivery Order delivered
- Purchase/AP/Inbound: RFQ -> Supplier Quotation -> Purchase Order -> Goods Receipt -> Vendor Bill -> Supplier Payment
- Inventory: Inventory Adjustment header -> Stock Transfer header/line

## Environment

The harness reads `.env.local` automatically.

Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `SUPABASE_SERVICE_ROLE_KEY` if write RLS is locked down
- `SUPABASE_ACCESS_TOKEN` if you want to test with an authenticated Supabase JWT
- `WORKFLOW_TEST_PORT` to change the local port

## Direct server usage

```powershell
node scripts/api_tests/workflow_api_server.mjs
```

Then in another terminal:

```powershell
Invoke-RestMethod http://localhost:8787/health
Invoke-RestMethod http://localhost:8787/workflows/all -Method Post -ContentType 'application/json' -Body '{}'
```

## Notes

- These tests create real records in the configured Supabase database.
- The harness intentionally avoids inserting generated totals such as `total_amount` and line totals; it lets the database calculate them.
- Older shell scripts in this folder are retained as low-level Supabase REST examples, but `run_workflow_curl_tests.ps1` is the canonical business workflow test.
