// CRM Types
export interface Lead {
  id: string
  lead_number: string
  company_name: string
  stage: 'new' | 'site_survey' | 'proposition' | 'won' | 'lost'
  estimated_value: number
  probability_percent: number
  owner_id?: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  lead_id: string
  activity_type: 'call' | 'email' | 'meeting' | 'note'
  description: string
  scheduled_date?: string
  completed_date?: string
  created_by: string
  created_at: string
}

// Sales Types
export interface Customer {
  id: string
  customer_number: string
  name: string
  customer_type: 'B2B' | 'B2C'
  email?: string
  credit_limit: number
  credit_used: number
  status: 'active' | 'inactive' | 'blocked'
}

export interface SalesOrder {
  id: string
  sales_order_number: string
  customer_id: string
  order_date: string
  required_delivery_date: string
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered'
  total_amount: number
  total_cost: number
  estimated_profit: number
  profit_margin_percent: number
  lines?: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  sales_order_id: string
  product_id: string
  quantity_ordered: number
  quantity_delivered: number
  unit_price: number
  cost_price: number
  line_profit: number
}

// Purchase Types
export interface Supplier {
  id: string
  supplier_number: string
  name: string
  email?: string
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
}

export interface PurchaseOrder {
  id: string
  purchase_order_number: string
  supplier_id: string
  order_date: string
  status: 'draft' | 'confirmed' | 'received'
  total_amount: number
  lines?: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  purchase_order_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
}

// Inventory Types
export interface Product {
  id: string
  sku: string
  name: string
  category_id: string
  image_url?: string
  list_price: number
  cost_price: number
  profit_margin_percent: number
  reorder_level: number
  status: 'active' | 'discontinued'
}

export interface StockLevel {
  id: string
  product_id: string
  warehouse_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  reorder_status: 'optimal' | 'understocked' | 'overstocked' | 'critical'
}

export interface Warehouse {
  id: string
  warehouse_number: string
  name: string
  location: string
  status: 'active' | 'inactive'
}

// Accounting Types
export interface Invoice {
  id: string
  invoice_number: string
  sales_order_id: string
  amount: number
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  due_date: string
  issued_date: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card'
}

// Metrics Types
export interface DailyMetrics {
  metric_date: string
  total_sales_revenue: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  orders_created: number
  orders_delivered: number
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}
