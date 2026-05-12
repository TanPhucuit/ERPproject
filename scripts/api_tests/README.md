API curl tests

Usage (bash):

```bash
# set base URL and token
export BASE_URL="http://localhost:3000"
export AUTH_TOKEN="your_token_here"

# run an inventory test
bash inventory_curl.sh
```

Usage (PowerShell):

```powershell
$env:BASE_URL = 'http://localhost:3000'
$env:AUTH_TOKEN = 'your_token_here'

# run a test
bash inventory_curl.sh
```

Notes:
- Update `BASE_URL` and `AUTH_TOKEN` to point to your running backend.
- Endpoints used are based on patterns in the frontend services (e.g. `/inventory/delivery-orders`, `/accounting/invoices`, `/warehouse/bin-locations`). Adjust paths if your backend differs.
