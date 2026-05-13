// Entity Types
export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'CEO' | 'Sales_Manager' | 'Purchasing_Manager' | 'Warehouse_Manager' | 'Accountant'
  status: 'active' | 'inactive' | 'suspended'
}

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

export interface Customer {
  id: string
  full_name: string
  email?: string
  phone?: string
  address?: string
  company_name?: string
  tax_id?: string
  customer_type: 'individual' | 'company'
  is_active: boolean
  name?: string
  customer_number?: string
  status?: 'active' | 'inactive'
}

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company?: string
  source: 'referral' | 'auto_request' | 'website' | 'phone' | 'email' | 'event' | 'other'
  status: 'new' | 'quoted' | 'won' | 'lost'
  probability: number
  assigned_to_id?: string
  lead_number?: string
  company_name?: string
  contact_person_name?: string
  contact_person_email?: string
  probability_percent?: number
  stage?: 'new' | 'quoted' | 'won' | 'lost'
}

export interface LegacyCustomer {
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
  lines: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_delivered: number
  unit_price: number
  cost_price: number
  line_profit: number
}

export interface PurchaseOrder {
  id: string
  purchase_order_number: string
  supplier_id: string
  order_date: string
  status: 'draft' | 'confirmed' | 'received'
  total_amount: number
  lines: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
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

export interface DailyMetrics {
  metric_date: string
  total_sales_revenue: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  orders_created: number
  orders_delivered: number
}

export interface DeliveryOrder {
  id: string
  delivery_order_number: string
  sales_order_id: string
  status: 'draft' | 'picked' | 'shipped' | 'delivered'
  scheduled_delivery_date: string
  actual_delivery_date?: string
}

export interface GoodsReceipt {
  id: string
  goods_receipt_number: string
  purchase_order_id: string
  status: 'draft' | 'received' | 'verified' | 'completed'
  received_date: string
}
