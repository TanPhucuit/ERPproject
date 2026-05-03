# NovaTech ERP

NovaTech ERP is a single-app Vite frontend for the SmartHome and IoT distribution scenario. It runs directly against Supabase and is designed to deploy to Vercel without a separate backend service.

## Structure

```text
novatech-erp/
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- layouts/
|   |-- lib/
|   |-- pages/
|   |-- services/
|   |-- stores/
|   `-- types/
|-- index.html
|-- package.json
|-- vite.config.ts
|-- vercel.json
`-- database_schema.sql
```

## Local Development

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:5173`

## Environment Variables

```bash
VITE_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
NEXT_PUBLIC_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
```

## Deploy to Vercel

This repository now deploys as one Vite application from the repo root.

- Framework preset: `Vite`
- Root directory: `./`
- Build command: `npm run build`
- Output directory: `dist`

## Modules

- CRM
- Sales
- Purchase
- Inventory
- Accounting
- Dashboard

## Notes

- The app now uses Supabase directly from the frontend.
- There is no separate `frontend/`, `backend/`, or `api/` app structure anymore.
- Database write access still depends on your Supabase grants and RLS configuration.
