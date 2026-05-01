export const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || '/api'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',

  // Users
  USERS: '/users',
  USER: (id: string) => `/users/${id}`,

  // Products
  PRODUCTS: '/products',
  PRODUCT: (id: string) => `/products/${id}`,
  PRODUCT_CATEGORIES: '/product-categories',

  // Customers
  CUSTOMERS: '/customers',
  CUSTOMER: (id: string) => `/customers/${id}`,

  // Sales Orders
  SALES_ORDERS: '/sales-orders',
  SALES_ORDER: (id: string) => `/sales-orders/${id}`,
  QUOTATIONS: '/quotations',
  QUOTATION: (id: string) => `/quotations/${id}`,

  // Purchase Orders
  PURCHASE_ORDERS: '/purchase-orders',
  PURCHASE_ORDER: (id: string) => `/purchase-orders/${id}`,
  RFQS: '/rfqs',

  // Inventory
  STOCK_LEVELS: '/stock-levels',
  DELIVERY_ORDERS: '/delivery-orders',
  GOODS_RECEIPTS: '/goods-receipts',

  // Leads
  LEADS: '/leads',
  LEAD: (id: string) => `/leads/${id}`,

  // Suppliers
  SUPPLIERS: '/suppliers',
  SUPPLIER: (id: string) => `/suppliers/${id}`,

  // Metrics
  DAILY_METRICS: '/metrics/daily',
  PRODUCT_METRICS: '/metrics/products',
  CUSTOMER_METRICS: '/metrics/customers',
  SUPPLIER_METRICS: '/metrics/suppliers',

  // Warehouses
  WAREHOUSES: '/warehouses',
  WAREHOUSE: (id: string) => `/warehouses/${id}`,
}
